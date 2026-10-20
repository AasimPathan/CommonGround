ALTER TABLE public.participations ADD COLUMN content_status text CHECK (content_status IN ('pending','approved','changes_required'));
ALTER TABLE public.participations ADD COLUMN content_reviewed_at timestamptz;
UPDATE public.participations SET content_status = 'pending' WHERE content_url IS NOT NULL AND content_status IS NULL;

CREATE OR REPLACE FUNCTION public.guard_participation_content()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.content_url IS DISTINCT FROM OLD.content_url THEN
    NEW.content_status := CASE WHEN NEW.content_url IS NULL THEN NULL ELSE 'pending' END;
    NEW.content_reviewed_at := NULL;
  ELSIF NEW.content_status IS DISTINCT FROM OLD.content_status AND NOT public.has_role(auth.uid(), 'reviewer') THEN
    RAISE EXCEPTION 'Only reviewers can change content review status';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER participations_guard_content BEFORE UPDATE ON public.participations FOR EACH ROW EXECUTE FUNCTION public.guard_participation_content();

CREATE POLICY "participations_resubmit_own" ON public.participations FOR UPDATE TO authenticated
USING (creator_id = auth.uid() AND status = 'completed' AND content_status = 'changes_required' AND EXISTS (SELECT 1 FROM public.initiatives i WHERE i.id = initiative_id AND i.status = 'active'))
WITH CHECK (creator_id = auth.uid() AND status = 'completed' AND content_url IS NOT NULL);

CREATE OR REPLACE FUNCTION public.review_participation_content(_participation_id uuid, _decision text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'reviewer') THEN RAISE EXCEPTION 'Only reviewers can review content'; END IF;
  IF _decision NOT IN ('approved','changes_required') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  SELECT pa.*, i.title INTO p FROM public.participations pa JOIN public.initiatives i ON i.id = pa.initiative_id WHERE pa.id = _participation_id;
  IF NOT FOUND OR p.content_status IS DISTINCT FROM 'pending' THEN RAISE EXCEPTION 'Only pending content can be reviewed'; END IF;
  UPDATE public.participations SET content_status = _decision, content_reviewed_at = now() WHERE id = _participation_id;
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (p.creator_id,
    CASE WHEN _decision = 'approved' THEN 'Awareness video approved' ELSE 'Changes required on your video' END,
    CASE WHEN _decision = 'approved' THEN 'Your video for "' || p.title || '" is now visible on the initiative.' ELSE 'Please update the content URL for "' || p.title || '".' END,
    'content_review', '/community/' || p.initiative_id);
END $$;
REVOKE ALL ON FUNCTION public.review_participation_content(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_participation_content(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_awareness_videos(_initiative_id uuid)
RETURNS TABLE (participation_id uuid, display_name text, avatar_url text, instagram_username text, content_url text, completed_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, COALESCE(m.display_name, pr.display_name), m.avatar_url, m.instagram_username, p.content_url, p.completed_at
  FROM public.participations p
  JOIN public.initiatives i ON i.id = p.initiative_id AND i.status IN ('active','closed')
  LEFT JOIN public.creator_marketplace_profiles m ON m.creator_id = p.creator_id
  LEFT JOIN public.profiles pr ON pr.id = p.creator_id
  WHERE p.initiative_id = _initiative_id AND p.content_status = 'approved' AND auth.uid() IS NOT NULL
  ORDER BY p.content_reviewed_at DESC;
$$;
REVOKE ALL ON FUNCTION public.list_awareness_videos(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_awareness_videos(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_participation_content_status(_initiative_id uuid)
RETURNS TABLE (participation_id uuid, content_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.content_status FROM public.participations p
  WHERE p.initiative_id = _initiative_id AND (public.has_role(auth.uid(),'reviewer') OR public.has_role(auth.uid(),'initiative_manager'));
$$;
REVOKE ALL ON FUNCTION public.list_participation_content_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_participation_content_status(uuid) TO authenticated;