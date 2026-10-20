CREATE TYPE public.app_role AS ENUM ('creator', 'business', 'initiative_manager', 'reviewer');
CREATE TYPE public.initiative_status AS ENUM ('draft', 'under_review', 'changes_required', 'active', 'closed');
CREATE TYPE public.participation_status AS ENUM ('supported', 'completed');
CREATE TYPE public.review_decision AS ENUM ('changes_required', 'approved');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE requested_role text;
BEGIN
  requested_role := COALESCE(new.raw_user_meta_data->>'role', 'creator');
  IF requested_role NOT IN ('creator', 'business') THEN requested_role := 'creator'; END IF;
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, COALESCE(new.email, ''), COALESCE(new.raw_user_meta_data->>'display_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, requested_role::public.app_role);
  RETURN new;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 160),
  category text NOT NULL CHECK (category IN ('Local Community','Environmental','Humanitarian','Public Awareness','Civic / Social Issue','Other Reviewed Community Initiative')),
  location text NOT NULL,
  description text NOT NULL,
  why_it_matters text,
  suggested_action text,
  status public.initiative_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL,
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.initiatives TO authenticated;
GRANT ALL ON public.initiatives TO service_role;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "initiatives_read_active" ON public.initiatives FOR SELECT TO authenticated USING (status = 'active');
CREATE POLICY "initiatives_read_manager_own" ON public.initiatives FOR SELECT TO authenticated USING (created_by = auth.uid() AND public.has_role(auth.uid(), 'initiative_manager'));
CREATE POLICY "initiatives_read_reviewer" ON public.initiatives FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'reviewer'));
CREATE POLICY "initiatives_create_manager" ON public.initiatives FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.has_role(auth.uid(), 'initiative_manager') AND status = 'draft');
CREATE POLICY "initiatives_edit_manager" ON public.initiatives FOR UPDATE TO authenticated USING (created_by = auth.uid() AND public.has_role(auth.uid(), 'initiative_manager') AND status IN ('draft','changes_required')) WITH CHECK (created_by = auth.uid() AND status IN ('draft','under_review'));

CREATE TABLE public.evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  description text NOT NULL,
  source_name text NOT NULL,
  link text,
  reference text,
  source_date date,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (link IS NOT NULL OR reference IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence TO authenticated;
GRANT ALL ON public.evidence TO service_role;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evidence_read_visible" ON public.evidence FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.initiatives i WHERE i.id = initiative_id));
CREATE POLICY "evidence_manage_owner" ON public.evidence FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.initiatives i WHERE i.id = initiative_id AND i.created_by = auth.uid() AND i.status IN ('draft','changes_required') AND public.has_role(auth.uid(), 'initiative_manager'))) WITH CHECK (EXISTS (SELECT 1 FROM public.initiatives i WHERE i.id = initiative_id AND i.created_by = auth.uid() AND i.status IN ('draft','changes_required') AND public.has_role(auth.uid(), 'initiative_manager')));

CREATE TABLE public.claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  statement text NOT NULL,
  attributed_to text NOT NULL,
  source_name text NOT NULL,
  link_reference text,
  source_date date,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT ALL ON public.claims TO service_role;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claims_read_visible" ON public.claims FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.initiatives i WHERE i.id = initiative_id));
CREATE POLICY "claims_manage_owner" ON public.claims FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.initiatives i WHERE i.id = initiative_id AND i.created_by = auth.uid() AND i.status IN ('draft','changes_required') AND public.has_role(auth.uid(), 'initiative_manager'))) WITH CHECK (EXISTS (SELECT 1 FROM public.initiatives i WHERE i.id = initiative_id AND i.created_by = auth.uid() AND i.status IN ('draft','changes_required') AND public.has_role(auth.uid(), 'initiative_manager')));

CREATE TABLE public.participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id),
  creator_id uuid NOT NULL,
  status public.participation_status NOT NULL DEFAULT 'supported',
  content_url text CHECK (content_url IS NULL OR (char_length(content_url) <= 500 AND content_url ~ '^https?://')),
  supported_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (initiative_id, creator_id)
);
GRANT SELECT, INSERT, UPDATE ON public.participations TO authenticated;
GRANT ALL ON public.participations TO service_role;
ALTER TABLE public.participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participations_read_own" ON public.participations FOR SELECT TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "participations_create_own" ON public.participations FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid() AND public.has_role(auth.uid(), 'creator') AND status = 'supported' AND EXISTS (SELECT 1 FROM public.initiatives i WHERE i.id = initiative_id AND i.status = 'active'));
CREATE POLICY "participations_complete_own" ON public.participations FOR UPDATE TO authenticated USING (creator_id = auth.uid() AND status = 'supported' AND EXISTS (SELECT 1 FROM public.initiatives i WHERE i.id = initiative_id AND i.status = 'active')) WITH CHECK (creator_id = auth.uid() AND status = 'completed' AND content_url IS NOT NULL);
CREATE POLICY "initiatives_read_creator_history" ON public.initiatives FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.participations p WHERE p.initiative_id = id AND p.creator_id = auth.uid()));

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id),
  reviewer_id uuid NOT NULL,
  decision public.review_decision NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (decision <> 'changes_required' OR NULLIF(trim(comment), '') IS NOT NULL)
);
GRANT SELECT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_read_relevant" ON public.reviews FOR SELECT TO authenticated USING (reviewer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.initiatives i WHERE i.id = initiative_id AND i.created_by = auth.uid()));

CREATE TABLE public.review_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  item_number integer NOT NULL CHECK (item_number BETWEEN 1 AND 10),
  label text NOT NULL,
  passed boolean NOT NULL,
  UNIQUE (review_id, item_number)
);
GRANT SELECT ON public.review_checklist_items TO authenticated;
GRANT ALL ON public.review_checklist_items TO service_role;
ALTER TABLE public.review_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist_read_relevant" ON public.review_checklist_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id));

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_read_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER initiatives_updated_at BEFORE UPDATE ON public.initiatives FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX initiatives_status_published_idx ON public.initiatives(status, published_at DESC);
CREATE INDEX initiatives_created_by_idx ON public.initiatives(created_by);
CREATE INDEX participations_creator_idx ON public.participations(creator_id, supported_at DESC);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.review_initiative(_initiative_id uuid, _decision public.review_decision, _comment text, _checklist jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; current_status public.initiative_status; review_id uuid; passed_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'reviewer') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT created_by, status INTO owner_id, current_status FROM public.initiatives WHERE id = _initiative_id FOR UPDATE;
  IF owner_id IS NULL OR current_status <> 'under_review' THEN RAISE EXCEPTION 'Initiative is not reviewable'; END IF;
  IF owner_id = auth.uid() THEN RAISE EXCEPTION 'Self-review is not allowed'; END IF;
  IF _decision = 'changes_required' AND NULLIF(trim(_comment), '') IS NULL THEN RAISE EXCEPTION 'A comment is required'; END IF;
  SELECT count(*) INTO passed_count FROM jsonb_array_elements(_checklist) item WHERE (item->>'passed')::boolean = true;
  IF jsonb_array_length(_checklist) <> 10 THEN RAISE EXCEPTION 'All checklist items are required'; END IF;
  IF _decision = 'approved' AND passed_count <> 10 THEN RAISE EXCEPTION 'All checklist items must pass'; END IF;
  INSERT INTO public.reviews (initiative_id, reviewer_id, decision, comment) VALUES (_initiative_id, auth.uid(), _decision, _comment) RETURNING id INTO review_id;
  INSERT INTO public.review_checklist_items (review_id, item_number, label, passed)
  SELECT review_id, (item->>'item_number')::integer, item->>'label', (item->>'passed')::boolean FROM jsonb_array_elements(_checklist) item;
  UPDATE public.initiatives SET status = CASE WHEN _decision = 'approved' THEN 'active'::public.initiative_status ELSE 'changes_required'::public.initiative_status END, published_at = CASE WHEN _decision = 'approved' THEN now() ELSE published_at END WHERE id = _initiative_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.review_initiative(uuid, public.review_decision, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.close_initiative(_initiative_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; current_status public.initiative_status;
BEGIN
  SELECT created_by, status INTO owner_id, current_status FROM public.initiatives WHERE id = _initiative_id FOR UPDATE;
  IF current_status <> 'active' THEN RAISE EXCEPTION 'Only active initiatives can be closed'; END IF;
  IF NOT (public.has_role(auth.uid(), 'reviewer') OR (public.has_role(auth.uid(), 'initiative_manager') AND owner_id = auth.uid())) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.initiatives SET status = 'closed', closed_at = now() WHERE id = _initiative_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.close_initiative(uuid) TO authenticated;

INSERT INTO public.initiatives (id, title, category, location, description, why_it_matters, suggested_action, status, created_by, published_at, created_at)
VALUES
('10000000-0000-4000-8000-000000000001','Demo: Neighbourhood Food Pantry Drive','Local Community','Riverside District','This is clearly marked demonstration content for a community food pantry collection.','Demonstration initiative showing how local creators can share reviewed community information.','If you choose, share the collection details with your local audience.','active','00000000-0000-0000-0000-000000000000',now() - interval '1 day',now() - interval '2 days'),
('10000000-0000-4000-8000-000000000002','Demo: Community Park Clean-up','Environmental','Northside Park','This is clearly marked demonstration content for a volunteer park clean-up.','Demonstration initiative showing a local environmental activity.','If you choose, let your audience know about the clean-up date.','active','00000000-0000-0000-0000-000000000000',now() - interval '3 days',now() - interval '4 days'),
('10000000-0000-4000-8000-000000000003','Demo: Library Digital Skills Week','Public Awareness','Central Library','This is clearly marked demonstration content for free digital skills sessions.','Demonstration initiative showing a community education program.','If you choose, share the program with people who may benefit.','active','00000000-0000-0000-0000-000000000000',now() - interval '5 days',now() - interval '6 days');

INSERT INTO public.evidence (initiative_id, description, source_name, reference, position) VALUES
('10000000-0000-4000-8000-000000000001','Demonstration source entry only; no real-world evidence is asserted.','Demo source','DEMO-REF-001',0),
('10000000-0000-4000-8000-000000000002','Demonstration source entry only; no real-world evidence is asserted.','Demo source','DEMO-REF-002',0);

INSERT INTO public.claims (initiative_id, statement, attributed_to, source_name, link_reference, position) VALUES
('10000000-0000-4000-8000-000000000001','This is a demonstration claim and is not an established fact.','Demo organizer','Demo source','DEMO-REF-001',0);