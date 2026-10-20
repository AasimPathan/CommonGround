CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL UNIQUE REFERENCES public.marketplace_connections(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.business_campaigns(id) ON DELETE CASCADE,
  business_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL CHECK (char_length(trim(message)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX messages_conversation_idx ON public.messages(conversation_id, created_at);
GRANT SELECT ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.conversations TO service_role;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_party(_conversation_id uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversations c JOIN public.marketplace_connections m ON m.id = c.connection_id
    WHERE c.id = _conversation_id AND m.status = 'confirmed' AND _user IN (c.business_id, c.creator_id))
$$;

CREATE POLICY "Parties read conversations" ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conversation_party(id, auth.uid()));
CREATE POLICY "Parties read messages" ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_party(conversation_id, auth.uid()));
CREATE POLICY "Parties send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND read_at IS NULL AND public.is_conversation_party(conversation_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.open_marketplace_conversation(_connection_id uuid)
RETURNS TABLE(conversation_id uuid, business_name text, creator_name text, creator_avatar text, is_business boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.marketplace_connections%ROWTYPE; cid uuid;
BEGIN
  SELECT * INTO m FROM public.marketplace_connections WHERE id = _connection_id;
  IF m.id IS NULL OR auth.uid() NOT IN (m.business_id, m.creator_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF m.status <> 'confirmed' THEN RAISE EXCEPTION 'Chat is available after the business confirms the connection.'; END IF;
  INSERT INTO public.conversations (connection_id, campaign_id, business_id, creator_id)
  VALUES (m.id, m.campaign_id, m.business_id, m.creator_id) ON CONFLICT (connection_id) DO NOTHING;
  SELECT id INTO cid FROM public.conversations WHERE connection_id = m.id;
  RETURN QUERY SELECT cid,
    COALESCE(NULLIF(bc.business_label, ''), NULLIF(bp.display_name, ''), 'Business'),
    COALESCE(NULLIF(cp.display_name, ''), 'Creator'), cp.avatar_url, auth.uid() = m.business_id
  FROM public.business_campaigns bc
  LEFT JOIN public.profiles bp ON bp.id = m.business_id
  LEFT JOIN public.creator_marketplace_profiles cp ON cp.creator_id = m.creator_id
  WHERE bc.id = m.campaign_id;
END $$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_conversation_party(_conversation_id, auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.messages SET read_at = now() WHERE conversation_id = _conversation_id AND sender_id <> auth.uid() AND read_at IS NULL;
END $$;

REVOKE EXECUTE ON FUNCTION public.open_marketplace_conversation(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_conversation_read(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_conversation_party(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_marketplace_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_party(uuid, uuid) TO authenticated;