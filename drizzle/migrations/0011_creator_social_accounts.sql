CREATE TABLE public.creator_social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('Instagram','TikTok','YouTube','Facebook')),
  username text NOT NULL,
  profile_url text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_type text NOT NULL CHECK (source_type IN ('profile_check','uploaded_evidence')),
  check_status text NOT NULL CHECK (check_status IN ('Profile Checked','Evidence Provided')),
  evidence_path text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, platform)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_social_accounts TO authenticated;
GRANT ALL ON public.creator_social_accounts TO service_role;
ALTER TABLE public.creator_social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators read own social accounts" ON public.creator_social_accounts FOR SELECT TO authenticated USING (creator_id = auth.uid() OR public.has_role(auth.uid(),'business'));
CREATE POLICY "Creators insert own social accounts" ON public.creator_social_accounts FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid() AND public.has_role(auth.uid(),'creator'));
CREATE POLICY "Creators update own social accounts" ON public.creator_social_accounts FOR UPDATE TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators delete own social accounts" ON public.creator_social_accounts FOR DELETE TO authenticated USING (creator_id = auth.uid());