REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_initiative(uuid, public.review_decision, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.close_initiative(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_initiative(uuid, public.review_decision, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_initiative(uuid) TO authenticated;