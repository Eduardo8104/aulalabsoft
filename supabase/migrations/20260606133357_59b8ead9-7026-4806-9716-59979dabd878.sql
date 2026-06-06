-- Restrict members SELECT to admins/librarians
DROP POLICY IF EXISTS "mem_read" ON public.members;
CREATE POLICY "mem_read" ON public.members FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'librarian'::app_role));

-- Restrict loans SELECT to admins/librarians
DROP POLICY IF EXISTS "loans_read" ON public.loans;
CREATE POLICY "loans_read" ON public.loans FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'librarian'::app_role));

-- Restrict profiles SELECT to own profile or admin/librarian
DROP POLICY IF EXISTS "Authenticated can read all profiles" ON public.profiles;
CREATE POLICY "Profiles read own or staff" ON public.profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'librarian'::app_role)
  );

-- Restrict publishers SELECT to admins/librarians (contact details are internal)
DROP POLICY IF EXISTS "pub_read" ON public.publishers;
CREATE POLICY "pub_read" ON public.publishers FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'librarian'::app_role));

-- Revoke EXECUTE on SECURITY DEFINER functions from anon/authenticated.
-- has_role is used by RLS policies (runs as definer regardless of grants) and
-- handle_new_user is a trigger. Neither needs to be callable via the API.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
