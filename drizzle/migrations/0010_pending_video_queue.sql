CREATE OR REPLACE FUNCTION public.list_pending_awareness_videos()
RETURNS TABLE (participation_id uuid, initiative_id uuid, initiative_title text, display_name text, avatar_url text, instagram_username text, content_url text, completed_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, i.id, i.title, COALESCE(m.display_name, pr.display_name), m.avatar_url, m.instagram_username, p.content_url, p.completed_at
  FROM public.participations p
  JOIN public.initiatives i ON i.id = p.initiative_id
  LEFT JOIN public.creator_marketplace_profiles m ON m.creator_id = p.creator_id
  LEFT JOIN public.profiles pr ON pr.id = p.creator_id
  WHERE p.content_status = 'pending' AND public.has_role(auth.uid(), 'reviewer')
  ORDER BY p.completed_at ASC;
$$;
REVOKE ALL ON FUNCTION public.list_pending_awareness_videos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_pending_awareness_videos() TO authenticated;