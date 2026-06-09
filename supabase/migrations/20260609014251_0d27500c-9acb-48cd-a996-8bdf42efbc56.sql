
-- 1) Fix storage policies to use private.has_role consistently
DROP POLICY IF EXISTS "book-covers insert for staff" ON storage.objects;
DROP POLICY IF EXISTS "book-covers update for staff" ON storage.objects;
DROP POLICY IF EXISTS "book-covers delete for staff" ON storage.objects;

CREATE POLICY "book-covers insert for staff" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'book-covers' AND (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'librarian'::app_role)));

CREATE POLICY "book-covers update for staff" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'book-covers' AND (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'librarian'::app_role)));

CREATE POLICY "book-covers delete for staff" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'book-covers' AND (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'librarian'::app_role)));

-- 2) Restrict Realtime channel subscriptions to staff only
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff can subscribe to realtime" ON realtime.messages;
CREATE POLICY "staff can subscribe to realtime" ON realtime.messages
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'librarian'::app_role));

DROP POLICY IF EXISTS "staff can publish to realtime" ON realtime.messages;
CREATE POLICY "staff can publish to realtime" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'librarian'::app_role));
