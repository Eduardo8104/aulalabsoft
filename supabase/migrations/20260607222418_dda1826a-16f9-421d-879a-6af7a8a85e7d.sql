
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS loans_requested_by_idx ON public.loans(requested_by);

DROP POLICY IF EXISTS loans_user_read ON public.loans;
CREATE POLICY loans_user_read ON public.loans
  FOR SELECT TO authenticated
  USING (requested_by = auth.uid());

DROP POLICY IF EXISTS loans_user_insert ON public.loans;
CREATE POLICY loans_user_insert ON public.loans
  FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid() AND status = 'pending'::loan_status);

CREATE OR REPLACE FUNCTION public.sync_member_role_to_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user uuid;
BEGIN
  IF NEW.email IS NULL THEN RETURN NEW; END IF;
  SELECT id INTO target_user FROM auth.users WHERE lower(email) = lower(NEW.email) LIMIT 1;
  IF target_user IS NULL THEN RETURN NEW; END IF;
  IF NEW.member_role IS NOT NULL AND NEW.member_role ILIKE '%bibliotec%' THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (target_user, 'librarian'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_member_role_sync ON public.members;
CREATE TRIGGER trg_member_role_sync
  AFTER INSERT OR UPDATE OF email, member_role ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.sync_member_role_to_user();

ALTER TABLE public.books REPLICA IDENTITY FULL;
ALTER TABLE public.loans REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='books') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.books';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='loans') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.loans';
  END IF;
END $$;
