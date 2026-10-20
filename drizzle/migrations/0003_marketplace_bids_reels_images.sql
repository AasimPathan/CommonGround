ALTER TABLE public.creator_marketplace_profiles ADD COLUMN avatar_url text, ADD COLUMN follower_count integer CHECK (follower_count IS NULL OR follower_count >= 0);
ALTER TABLE public.business_campaigns ADD COLUMN maximum_budget numeric(12,2) CHECK (maximum_budget IS NULL OR maximum_budget > 0), ADD COLUMN title text, ADD COLUMN business_label text;

CREATE TABLE public.creator_reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creator_marketplace_profiles(creator_id) ON DELETE CASCADE,
  url text NOT NULL,
  views integer NOT NULL CHECK (views >= 0),
  likes integer NOT NULL DEFAULT 0 CHECK (likes >= 0),
  comments integer NOT NULL DEFAULT 0 CHECK (comments >= 0),
  posted_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX creator_reels_creator_idx ON public.creator_reels(creator_id, posted_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_reels TO authenticated;
GRANT ALL ON public.creator_reels TO service_role;
ALTER TABLE public.creator_reels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator_reels_read" ON public.creator_reels FOR SELECT TO authenticated USING (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.creator_marketplace_profiles p WHERE p.creator_id = creator_reels.creator_id AND p.status = 'submitted'));
CREATE POLICY "creator_reels_manage_own" ON public.creator_reels FOR ALL TO authenticated USING (creator_id = auth.uid() AND public.has_role(auth.uid(), 'creator')) WITH CHECK (creator_id = auth.uid() AND public.has_role(auth.uid(), 'creator'));

CREATE TYPE public.bid_status AS ENUM ('submitted', 'selected', 'not_selected');
CREATE TABLE public.campaign_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.business_campaigns(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.creator_marketplace_profiles(creator_id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  status public.bid_status NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, creator_id)
);
GRANT SELECT, INSERT ON public.campaign_bids TO authenticated;
GRANT ALL ON public.campaign_bids TO service_role;
ALTER TABLE public.campaign_bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_bids_read" ON public.campaign_bids FOR SELECT TO authenticated USING (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.business_campaigns c WHERE c.id = campaign_id AND c.business_id = auth.uid()));
CREATE POLICY "campaign_bids_create_own" ON public.campaign_bids FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid() AND status = 'submitted' AND public.has_role(auth.uid(), 'creator'));

CREATE OR REPLACE FUNCTION public.enforce_bid_budget() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _max numeric; _selected boolean;
BEGIN
  SELECT maximum_budget INTO _max FROM public.business_campaigns WHERE id = NEW.campaign_id;
  IF _max IS NULL THEN RAISE EXCEPTION 'This campaign has no maximum budget, so bids are not open.'; END IF;
  IF NEW.amount > _max THEN RAISE EXCEPTION 'Bid amount cannot be more than the maximum campaign budget (%).', _max; END IF;
  SELECT EXISTS (SELECT 1 FROM public.campaign_bids WHERE campaign_id = NEW.campaign_id AND status = 'selected') INTO _selected;
  IF _selected THEN RAISE EXCEPTION 'A creator has already been selected for this campaign.'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER campaign_bids_budget BEFORE INSERT ON public.campaign_bids FOR EACH ROW EXECUTE FUNCTION public.enforce_bid_budget();
REVOKE EXECUTE ON FUNCTION public.enforce_bid_budget() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.select_campaign_bid(_bid_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _campaign uuid;
BEGIN
  SELECT b.campaign_id INTO _campaign FROM public.campaign_bids b JOIN public.business_campaigns c ON c.id = b.campaign_id
  WHERE b.id = _bid_id AND c.business_id = auth.uid() AND public.has_role(auth.uid(), 'business');
  IF _campaign IS NULL THEN RAISE EXCEPTION 'Bid not found.'; END IF;
  IF EXISTS (SELECT 1 FROM public.campaign_bids WHERE campaign_id = _campaign AND status = 'selected') THEN RAISE EXCEPTION 'A creator has already been selected for this campaign.'; END IF;
  UPDATE public.campaign_bids SET status = CASE WHEN id = _bid_id THEN 'selected'::public.bid_status ELSE 'not_selected'::public.bid_status END, updated_at = now() WHERE campaign_id = _campaign;
END $$;
REVOKE EXECUTE ON FUNCTION public.select_campaign_bid(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.select_campaign_bid(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_open_campaigns()
RETURNS TABLE (id uuid, title text, business_name text, platform text, location text, niche text, budget text, maximum_budget numeric, follower_range text, language text, content_type text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.title, COALESCE(NULLIF(c.business_label, ''), NULLIF(p.display_name, ''), 'Business'), c.platform, c.location, c.niche, c.budget, c.maximum_budget, c.follower_range, c.language, c.content_type, c.created_at
  FROM public.business_campaigns c LEFT JOIN public.profiles p ON p.id = c.business_id
  WHERE public.has_role(auth.uid(), 'creator')
  ORDER BY c.created_at DESC
$$;
REVOKE EXECUTE ON FUNCTION public.list_open_campaigns() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_open_campaigns() TO authenticated;

CREATE POLICY "creator_avatars_auth_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'creator-avatars');
CREATE POLICY "creator_avatars_own_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'creator-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "creator_avatars_own_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'creator-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "creator_avatars_own_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'creator-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);