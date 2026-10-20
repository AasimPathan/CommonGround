ALTER TABLE public.marketplace_connections ADD COLUMN IF NOT EXISTS selected_bid_id uuid REFERENCES public.campaign_bids(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES public.marketplace_connections(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.notify_marketplace_connection()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link, connection_id)
  VALUES (NEW.creator_id, 'New campaign connection request', 'A business selected you for a campaign. Review and accept or decline.', 'connection_request', '/marketplace/' || NEW.id, NEW.id);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.select_campaign_bid(_bid_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _campaign uuid; _business uuid; _creator uuid;
BEGIN
  SELECT b.campaign_id, c.business_id, b.creator_id INTO _campaign, _business, _creator
  FROM public.campaign_bids b JOIN public.business_campaigns c ON c.id = b.campaign_id
  WHERE b.id = _bid_id AND c.business_id = auth.uid() AND public.has_role(auth.uid(), 'business');
  IF _campaign IS NULL THEN RAISE EXCEPTION 'Bid not found.'; END IF;
  IF EXISTS (SELECT 1 FROM public.campaign_bids WHERE campaign_id = _campaign AND status = 'selected') THEN RAISE EXCEPTION 'A creator has already been selected for this campaign.'; END IF;
  UPDATE public.campaign_bids SET status = CASE WHEN id = _bid_id THEN 'selected'::public.bid_status ELSE 'not_selected'::public.bid_status END, updated_at = now() WHERE campaign_id = _campaign;
  INSERT INTO public.marketplace_connections (campaign_id, business_id, creator_id, status, selected_bid_id)
  VALUES (_campaign, _business, _creator, 'pending', _bid_id)
  ON CONFLICT (campaign_id, creator_id) DO UPDATE SET selected_bid_id = EXCLUDED.selected_bid_id, updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.respond_to_marketplace_connection(_connection_id uuid, _decision connection_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target public.marketplace_connections%ROWTYPE;
BEGIN
  IF _decision NOT IN ('accepted', 'declined') THEN RAISE EXCEPTION 'Decision must be accepted or declined'; END IF;
  SELECT * INTO target FROM public.marketplace_connections WHERE id = _connection_id FOR UPDATE;
  IF target.id IS NULL OR target.status <> 'pending' THEN RAISE EXCEPTION 'Connection is not pending'; END IF;
  IF target.creator_id <> auth.uid() OR NOT public.has_role(auth.uid(), 'creator') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.marketplace_connections SET status = _decision, responded_at = now(), updated_at = now() WHERE id = _connection_id;
  INSERT INTO public.notifications (user_id, title, message, type, link, connection_id) VALUES (target.business_id,
    CASE WHEN _decision = 'accepted' THEN 'Creator accepted your connection request' ELSE 'Creator declined your connection request' END,
    CASE WHEN _decision = 'accepted' THEN 'Open Connections to confirm the deal.' ELSE 'This connection was declined.' END,
    'connection_' || _decision::text, '/business/connections', target.id);
END $$;

CREATE OR REPLACE FUNCTION public.confirm_marketplace_connection(_connection_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target public.marketplace_connections%ROWTYPE;
BEGIN
  SELECT * INTO target FROM public.marketplace_connections WHERE id = _connection_id FOR UPDATE;
  IF target.id IS NULL OR target.status <> 'accepted' THEN RAISE EXCEPTION 'Connection must be accepted first'; END IF;
  IF target.business_id <> auth.uid() OR NOT public.has_role(auth.uid(), 'business') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.marketplace_connections SET status = 'confirmed', confirmed_at = now(), updated_at = now() WHERE id = _connection_id;
  INSERT INTO public.notifications (user_id, title, message, type, link, connection_id)
  VALUES (target.creator_id, 'Your campaign connection is confirmed', 'Chat is now open with the business.', 'connection_confirmed', '/marketplace/' || target.id, target.id);
END $$;

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.conversations%ROWTYPE; recipient uuid; sender_name text;
BEGIN
  SELECT * INTO c FROM public.conversations WHERE id = NEW.conversation_id;
  recipient := CASE WHEN NEW.sender_id = c.business_id THEN c.creator_id ELSE c.business_id END;
  IF NEW.sender_id = c.business_id THEN
    SELECT COALESCE(NULLIF(bc.business_label, ''), NULLIF(p.display_name, ''), 'Business') INTO sender_name
    FROM public.business_campaigns bc LEFT JOIN public.profiles p ON p.id = c.business_id WHERE bc.id = c.campaign_id;
  ELSE
    SELECT COALESCE(NULLIF(cp.display_name, ''), 'Creator') INTO sender_name FROM public.creator_marketplace_profiles cp WHERE cp.creator_id = c.creator_id;
  END IF;
  INSERT INTO public.notifications (user_id, title, message, type, link, connection_id)
  VALUES (recipient, 'New message from ' || COALESCE(sender_name, 'your connection'), left(NEW.message, 140), 'message', '/chat/' || c.connection_id, c.connection_id);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER messages_notify AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();