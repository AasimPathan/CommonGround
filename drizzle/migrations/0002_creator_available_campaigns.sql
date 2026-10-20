CREATE OR REPLACE FUNCTION public.list_available_campaigns()
RETURNS TABLE (id uuid, business_name text, platform text, location text, niche text, budget text, follower_range text, language text, content_type text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, COALESCE(NULLIF(p.display_name, ''), 'Business'), c.platform, c.location, c.niche, c.budget, c.follower_range, c.language, c.content_type, c.created_at
  FROM public.business_campaigns c LEFT JOIN public.profiles p ON p.id = c.business_id
  WHERE public.has_role(auth.uid(), 'creator')
  ORDER BY c.created_at DESC
$$;
REVOKE EXECUTE ON FUNCTION public.list_available_campaigns() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_available_campaigns() TO authenticated;