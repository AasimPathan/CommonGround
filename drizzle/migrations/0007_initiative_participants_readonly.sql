CREATE OR REPLACE FUNCTION public.list_initiative_participants(_initiative_id uuid)
RETURNS TABLE (participation_id uuid, creator_id uuid, display_name text, avatar_url text, instagram_username text, niche text, location text, follower_count int, status public.participation_status, supported_at timestamptz, completed_at timestamptz, content_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'reviewer') OR public.has_role(auth.uid(), 'initiative_manager')) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.initiatives i WHERE i.id = _initiative_id AND i.status IN ('active','closed')) THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.id, p.creator_id, COALESCE(m.display_name, pr.display_name), m.avatar_url, m.instagram_username, m.niche, m.location, m.follower_count, p.status, p.supported_at, p.completed_at, p.content_url
  FROM public.participations p
  LEFT JOIN public.creator_marketplace_profiles m ON m.creator_id = p.creator_id
  LEFT JOIN public.profiles pr ON pr.id = p.creator_id
  WHERE p.initiative_id = _initiative_id
  ORDER BY p.supported_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.list_initiative_participants(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_initiative_participants(uuid) TO authenticated;