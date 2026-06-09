
-- Storage RLS policies for the book-covers bucket
-- Allow any authenticated user to read covers; only staff (admin/librarian) can write.

CREATE POLICY "book-covers read for authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'book-covers');

CREATE POLICY "book-covers insert for staff"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'book-covers'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role)
       OR public.has_role(auth.uid(), 'librarian'::public.app_role))
);

CREATE POLICY "book-covers update for staff"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'book-covers'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role)
       OR public.has_role(auth.uid(), 'librarian'::public.app_role))
);

CREATE POLICY "book-covers delete for staff"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'book-covers'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role)
       OR public.has_role(auth.uid(), 'librarian'::public.app_role))
);
