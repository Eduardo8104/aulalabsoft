CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "books_ins" ON public.books;
DROP POLICY IF EXISTS "books_upd" ON public.books;
DROP POLICY IF EXISTS "books_del" ON public.books;
CREATE POLICY "books_ins" ON public.books FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'librarian'::public.app_role));
CREATE POLICY "books_upd" ON public.books FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'librarian'::public.app_role));
CREATE POLICY "books_del" ON public.books FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "cat_all" ON public.categories;
CREATE POLICY "cat_all" ON public.categories FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'librarian'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'librarian'::public.app_role));

DROP POLICY IF EXISTS "pub_ins" ON public.publishers;
DROP POLICY IF EXISTS "pub_upd" ON public.publishers;
DROP POLICY IF EXISTS "pub_del" ON public.publishers;
CREATE POLICY "pub_ins" ON public.publishers FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'librarian'::public.app_role));
CREATE POLICY "pub_upd" ON public.publishers FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'librarian'::public.app_role));
CREATE POLICY "pub_del" ON public.publishers FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "mem_read" ON public.members;
DROP POLICY IF EXISTS "mem_ins" ON public.members;
DROP POLICY IF EXISTS "mem_upd" ON public.members;
DROP POLICY IF EXISTS "mem_del" ON public.members;
CREATE POLICY "mem_read" ON public.members FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'librarian'::public.app_role));
CREATE POLICY "mem_ins" ON public.members FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'librarian'::public.app_role));
CREATE POLICY "mem_upd" ON public.members FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'librarian'::public.app_role));
CREATE POLICY "mem_del" ON public.members FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "loans_read" ON public.loans;
DROP POLICY IF EXISTS "loans_all" ON public.loans;
CREATE POLICY "loans_read" ON public.loans FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'librarian'::public.app_role));
CREATE POLICY "loans_all" ON public.loans FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'librarian'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'librarian'::public.app_role));

DROP POLICY IF EXISTS "Profiles read own or staff" ON public.profiles;
CREATE POLICY "Profiles read own or staff" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'librarian'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Only admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));