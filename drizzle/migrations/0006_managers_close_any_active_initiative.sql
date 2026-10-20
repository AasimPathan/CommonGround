CREATE OR REPLACE FUNCTION public.close_initiative(_initiative_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_status public.initiative_status;
BEGIN
  SELECT status INTO current_status FROM public.initiatives WHERE id = _initiative_id FOR UPDATE;
  IF current_status IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'Only active initiatives can be closed'; END IF;
  IF NOT (public.has_role(auth.uid(), 'reviewer') OR public.has_role(auth.uid(), 'initiative_manager')) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.initiatives SET status = 'closed', closed_at = now() WHERE id = _initiative_id;
END;
$$;
REVOKE ALL ON FUNCTION public.close_initiative(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_initiative(uuid) TO authenticated;