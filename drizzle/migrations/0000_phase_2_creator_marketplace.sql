CREATE TYPE public.creator_profile_status AS ENUM ('draft', 'submitted');
CREATE TYPE public.connection_status AS ENUM ('pending', 'accepted', 'declined', 'confirmed');

CREATE TABLE public.creator_marketplace_profiles (
  creator_id uuid PRIMARY KEY,
  instagram_username text,
  profile_link text CHECK (profile_link IS NULL OR (char_length(profile_link) <= 500 AND profile_link ~ '^https?://')),
  niche text,
  location text,
  languages text[] NOT NULL DEFAULT '{}',
  content_types text[] NOT NULL DEFAULT '{}',
  follower_range text,
  status public.creator_profile_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.creator_marketplace_profiles TO authenticated;
GRANT ALL ON public.creator_marketplace_profiles TO service_role;
ALTER TABLE public.creator_marketplace_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator_marketplace_profiles_read" ON public.creator_marketplace_profiles FOR SELECT TO authenticated USING (creator_id = auth.uid() OR status = 'submitted');
CREATE POLICY "creator_marketplace_profiles_create_own" ON public.creator_marketplace_profiles FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid() AND public.has_role(auth.uid(), 'creator'));
CREATE POLICY "creator_marketplace_profiles_update_own" ON public.creator_marketplace_profiles FOR UPDATE TO authenticated USING (creator_id = auth.uid() AND public.has_role(auth.uid(), 'creator')) WITH CHECK (creator_id = auth.uid() AND public.has_role(auth.uid(), 'creator'));

CREATE TABLE public.creator_marketplace_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creator_marketplace_profiles(creator_id) ON DELETE CASCADE,
  evidence_text text NOT NULL CHECK (char_length(evidence_text) BETWEEN 1 AND 1000),
  evidence_link text CHECK (evidence_link IS NULL OR (char_length(evidence_link) <= 500 AND evidence_link ~ '^https?://')),
  evidence_date date,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_marketplace_evidence TO authenticated;
GRANT ALL ON public.creator_marketplace_evidence TO service_role;
ALTER TABLE public.creator_marketplace_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator_marketplace_evidence_read" ON public.creator_marketplace_evidence FOR SELECT TO authenticated USING (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.creator_marketplace_profiles p WHERE p.creator_id = creator_marketplace_evidence.creator_id AND p.status = 'submitted'));
CREATE POLICY "creator_marketplace_evidence_manage_own" ON public.creator_marketplace_evidence FOR ALL TO authenticated USING (creator_id = auth.uid() AND public.has_role(auth.uid(), 'creator')) WITH CHECK (creator_id = auth.uid() AND public.has_role(auth.uid(), 'creator'));

CREATE TABLE public.business_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  platform text NOT NULL,
  location text NOT NULL,
  niche text NOT NULL,
  budget text NOT NULL,
  follower_range text NOT NULL,
  language text NOT NULL,
  content_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_campaigns TO authenticated;
GRANT ALL ON public.business_campaigns TO service_role;
ALTER TABLE public.business_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_campaigns_read_own" ON public.business_campaigns FOR SELECT TO authenticated USING (business_id = auth.uid() AND public.has_role(auth.uid(), 'business'));
CREATE POLICY "business_campaigns_create_own" ON public.business_campaigns FOR INSERT TO authenticated WITH CHECK (business_id = auth.uid() AND public.has_role(auth.uid(), 'business'));
CREATE POLICY "business_campaigns_update_own" ON public.business_campaigns FOR UPDATE TO authenticated USING (business_id = auth.uid() AND public.has_role(auth.uid(), 'business')) WITH CHECK (business_id = auth.uid() AND public.has_role(auth.uid(), 'business'));
CREATE POLICY "business_campaigns_delete_own" ON public.business_campaigns FOR DELETE TO authenticated USING (business_id = auth.uid() AND public.has_role(auth.uid(), 'business'));

CREATE TABLE public.business_shortlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  creator_id uuid NOT NULL REFERENCES public.creator_marketplace_profiles(creator_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, creator_id)
);
GRANT SELECT, INSERT, DELETE ON public.business_shortlists TO authenticated;
GRANT ALL ON public.business_shortlists TO service_role;
ALTER TABLE public.business_shortlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_shortlists_read_own" ON public.business_shortlists FOR SELECT TO authenticated USING (business_id = auth.uid() AND public.has_role(auth.uid(), 'business'));
CREATE POLICY "business_shortlists_create_own" ON public.business_shortlists FOR INSERT TO authenticated WITH CHECK (business_id = auth.uid() AND public.has_role(auth.uid(), 'business'));
CREATE POLICY "business_shortlists_delete_own" ON public.business_shortlists FOR DELETE TO authenticated USING (business_id = auth.uid() AND public.has_role(auth.uid(), 'business'));

CREATE TABLE public.marketplace_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.business_campaigns(id) ON DELETE CASCADE,
  business_id uuid NOT NULL,
  creator_id uuid NOT NULL REFERENCES public.creator_marketplace_profiles(creator_id) ON DELETE CASCADE,
  status public.connection_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  confirmed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, creator_id)
);
GRANT SELECT, INSERT ON public.marketplace_connections TO authenticated;
GRANT ALL ON public.marketplace_connections TO service_role;
ALTER TABLE public.marketplace_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketplace_connections_read_parties" ON public.marketplace_connections FOR SELECT TO authenticated USING (business_id = auth.uid() OR creator_id = auth.uid());
CREATE POLICY "marketplace_connections_create_business" ON public.marketplace_connections FOR INSERT TO authenticated WITH CHECK (business_id = auth.uid() AND status = 'pending' AND public.has_role(auth.uid(), 'business') AND EXISTS (SELECT 1 FROM public.business_campaigns c WHERE c.id = campaign_id AND c.business_id = auth.uid()) AND EXISTS (SELECT 1 FROM public.business_shortlists s WHERE s.business_id = auth.uid() AND s.creator_id = marketplace_connections.creator_id));
CREATE POLICY "business_campaigns_read_connected_creator" ON public.business_campaigns FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.marketplace_connections c WHERE c.campaign_id = business_campaigns.id AND c.creator_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_business_shortlist_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.business_shortlists WHERE business_id = NEW.business_id) >= 3 THEN
    RAISE EXCEPTION 'You can shortlist a maximum of 3 creators.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER business_shortlist_limit BEFORE INSERT ON public.business_shortlists FOR EACH ROW EXECUTE FUNCTION public.enforce_business_shortlist_limit();

CREATE OR REPLACE FUNCTION public.respond_to_marketplace_connection(_connection_id uuid, _decision public.connection_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target public.marketplace_connections%ROWTYPE;
BEGIN
  IF _decision NOT IN ('accepted', 'declined') THEN RAISE EXCEPTION 'Decision must be accepted or declined'; END IF;
  SELECT * INTO target FROM public.marketplace_connections WHERE id = _connection_id FOR UPDATE;
  IF target.id IS NULL OR target.status <> 'pending' THEN RAISE EXCEPTION 'Connection is not pending'; END IF;
  IF target.creator_id <> auth.uid() OR NOT public.has_role(auth.uid(), 'creator') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.marketplace_connections SET status = _decision, responded_at = now(), updated_at = now() WHERE id = _connection_id;
  INSERT INTO public.notifications (user_id, title, message) VALUES (target.business_id, 'Connection request updated', CASE WHEN _decision = 'accepted' THEN 'A creator accepted your connection request.' ELSE 'A creator declined your connection request.' END);
END;
$$;
REVOKE ALL ON FUNCTION public.respond_to_marketplace_connection(uuid, public.connection_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_marketplace_connection(uuid, public.connection_status) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_marketplace_connection(_connection_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target public.marketplace_connections%ROWTYPE;
BEGIN
  SELECT * INTO target FROM public.marketplace_connections WHERE id = _connection_id FOR UPDATE;
  IF target.id IS NULL OR target.status <> 'accepted' THEN RAISE EXCEPTION 'Connection must be accepted first'; END IF;
  IF target.business_id <> auth.uid() OR NOT public.has_role(auth.uid(), 'business') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.marketplace_connections SET status = 'confirmed', confirmed_at = now(), updated_at = now() WHERE id = _connection_id;
  INSERT INTO public.notifications (user_id, title, message) VALUES (target.creator_id, 'Connection confirmed', 'A business confirmed your connection.');
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_marketplace_connection(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_marketplace_connection(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_marketplace_connection()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message) VALUES (NEW.creator_id, 'New connection request', 'A business sent you a connection request.');
  RETURN NEW;
END;
$$;
CREATE TRIGGER marketplace_connection_notification AFTER INSERT ON public.marketplace_connections FOR EACH ROW EXECUTE FUNCTION public.notify_marketplace_connection();

CREATE TRIGGER creator_marketplace_profiles_updated_at BEFORE UPDATE ON public.creator_marketplace_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER business_campaigns_updated_at BEFORE UPDATE ON public.business_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX creator_marketplace_profiles_discovery_idx ON public.creator_marketplace_profiles(status, location, niche, follower_range);
CREATE INDEX creator_marketplace_profiles_languages_idx ON public.creator_marketplace_profiles USING gin(languages);
CREATE INDEX creator_marketplace_profiles_content_types_idx ON public.creator_marketplace_profiles USING gin(content_types);
CREATE INDEX creator_marketplace_evidence_creator_idx ON public.creator_marketplace_evidence(creator_id, position);
CREATE INDEX business_campaigns_owner_idx ON public.business_campaigns(business_id, created_at DESC);
CREATE INDEX business_shortlists_owner_idx ON public.business_shortlists(business_id, created_at DESC);
CREATE INDEX marketplace_connections_business_idx ON public.marketplace_connections(business_id, created_at DESC);
CREATE INDEX marketplace_connections_creator_idx ON public.marketplace_connections(creator_id, created_at DESC);