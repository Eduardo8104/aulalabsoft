DROP POLICY IF EXISTS "pub_read" ON public.publishers;
CREATE POLICY "pub_read" ON public.publishers FOR SELECT TO authenticated
  USING (true);
