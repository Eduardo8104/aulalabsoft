CREATE TABLE public.publishers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publishers TO authenticated;
GRANT ALL ON public.publishers TO service_role;
ALTER TABLE public.publishers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_read" ON public.publishers FOR SELECT TO authenticated USING (true);
CREATE POLICY "pub_ins" ON public.publishers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'librarian'));
CREATE POLICY "pub_upd" ON public.publishers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'librarian'));
CREATE POLICY "pub_del" ON public.publishers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_publishers_updated BEFORE UPDATE ON public.publishers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_read" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "cat_all" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'librarian')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'librarian'));

CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  author text NOT NULL,
  publisher_id uuid REFERENCES public.publishers(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  publication_year integer,
  isbn text,
  total_quantity integer NOT NULL DEFAULT 1 CHECK (total_quantity >= 0),
  borrowed_quantity integer NOT NULL DEFAULT 0 CHECK (borrowed_quantity >= 0),
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT books_borrowed_le_total CHECK (borrowed_quantity <= total_quantity)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books_read" ON public.books FOR SELECT TO authenticated USING (true);
CREATE POLICY "books_ins" ON public.books FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'librarian'));
CREATE POLICY "books_upd" ON public.books FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'librarian'));
CREATE POLICY "books_del" ON public.books FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_books_updated BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_books_category ON public.books(category_id);
CREATE INDEX idx_books_publisher ON public.books(publisher_id);

CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  registration text,
  full_name text NOT NULL,
  email text,
  phone text,
  member_role text,
  course text,
  grade text,
  cpf text,
  street text,
  number text,
  district text,
  city text,
  state text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mem_read" ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "mem_ins" ON public.members FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'librarian'));
CREATE POLICY "mem_upd" ON public.members FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'librarian'));
CREATE POLICY "mem_del" ON public.members FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_members_updated BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT ('L-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  loan_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL,
  return_date date,
  status public.loan_status NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated;
GRANT ALL ON public.loans TO service_role;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loans_read" ON public.loans FOR SELECT TO authenticated USING (true);
CREATE POLICY "loans_all" ON public.loans FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'librarian')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'librarian'));
CREATE TRIGGER trg_loans_updated BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_loans_member ON public.loans(member_id);
CREATE INDEX idx_loans_book ON public.loans(book_id);
CREATE INDEX idx_loans_status ON public.loans(status);