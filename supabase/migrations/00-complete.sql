
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'rep');
CREATE TYPE public.quota_period AS ENUM ('month', 'quarter', 'year');
CREATE TYPE public.deal_status AS ENUM ('closed', 'open');

-- Profiles (auto-created on signup)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles (separate table per security best practices)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Security definer function for role checks (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admins can view all roles
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Reps table
CREATE TABLE public.reps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  team TEXT NOT NULL DEFAULT 'General',
  quota_target NUMERIC NOT NULL DEFAULT 100000,
  quota_period quota_period NOT NULL DEFAULT 'quarter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read reps" ON public.reps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert reps" ON public.reps FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update reps" ON public.reps FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete reps" ON public.reps FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Comp plans
CREATE TABLE public.comp_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  effective_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comp_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read comp_plans" ON public.comp_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert comp_plans" ON public.comp_plans FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update comp_plans" ON public.comp_plans FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Comp tiers
CREATE TABLE public.comp_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comp_plan_id UUID NOT NULL REFERENCES public.comp_plans(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL,
  min_deal_size NUMERIC NOT NULL DEFAULT 0,
  max_deal_size NUMERIC,
  commission_rate NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comp_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read comp_tiers" ON public.comp_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert comp_tiers" ON public.comp_tiers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update comp_tiers" ON public.comp_tiers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete comp_tiers" ON public.comp_tiers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Quota tiers
CREATE TABLE public.quota_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL,
  min_attainment NUMERIC NOT NULL DEFAULT 0,
  max_attainment NUMERIC,
  rate_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  color TEXT NOT NULL DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quota_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read quota_tiers" ON public.quota_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert quota_tiers" ON public.quota_tiers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update quota_tiers" ON public.quota_tiers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Deals
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id UUID NOT NULL REFERENCES public.reps(id) ON DELETE CASCADE,
  deal_size NUMERIC NOT NULL,
  close_date DATE NOT NULL,
  deal_type TEXT NOT NULL,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  tier_applied TEXT,
  status deal_status NOT NULL DEFAULT 'closed',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read active deals" ON public.deals FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Admins can insert deals" ON public.deals FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update deals" ON public.deals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_deals_rep_id ON public.deals(rep_id);
CREATE INDEX idx_deals_close_date ON public.deals(close_date);
CREATE INDEX idx_deals_status ON public.deals(status);

-- Audit log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  changes JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read audit_log" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reps_updated_at BEFORE UPDATE ON public.reps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comp_plans_updated_at BEFORE UPDATE ON public.comp_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', ''), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Audit trigger for deals
CREATE OR REPLACE FUNCTION public.audit_deals_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, changes, user_id)
    VALUES ('deals', NEW.id, 'insert', to_jsonb(NEW), NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, changes, user_id)
    VALUES ('deals', NEW.id, 'update', jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)), NEW.created_by);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, changes, user_id)
    VALUES ('deals', OLD.id, 'delete', to_jsonb(OLD), OLD.created_by);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER audit_deals
  AFTER INSERT OR UPDATE OR DELETE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.audit_deals_changes();

-- Enable realtime for deals
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;



-- Fix audit_log insert policy to require user_id matches
DROP POLICY "Authenticated can insert audit_log" ON public.audit_log;
CREATE POLICY "Authenticated can insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);



-- 1. PROFILES: Restrict SELECT so users only see own profile, admins see all
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- 2. REPS: Replace open SELECT with admin-sees-all, reps-see-non-sensitive
DROP POLICY IF EXISTS "Authenticated can read reps" ON public.reps;

CREATE POLICY "Admins can read all reps" ON public.reps
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Reps can read own record" ON public.reps
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 3. DEALS: Restrict SELECT so reps see own deals, admins see all
DROP POLICY IF EXISTS "Authenticated can read active deals" ON public.deals;

CREATE POLICY "Admins can read all active deals" ON public.deals
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Reps can read own deals" ON public.deals
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.reps r
      WHERE r.id = deals.rep_id AND r.user_id = auth.uid()
    )
  );

-- 4. AUDIT_LOG: Remove direct user insert policy (inserts handled by security definer trigger)
DROP POLICY IF EXISTS "Authenticated can insert audit_log" ON public.audit_log;

-- 5. QUOTA_TIERS: Already has good policies, but verify read is auth-only (already is)

-- 6. COMP_PLANS / COMP_TIERS: Already properly restricted, no changes needed



-- Prevent non-admins from inserting/deleting roles (privilege escalation fix)
CREATE POLICY "Only admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));



-- Fix RLS: This is a template — all authenticated users should see all data

-- REPS: Replace admin-only + own-record SELECT with all-authenticated
DROP POLICY IF EXISTS "Admins can read all reps" ON public.reps;
DROP POLICY IF EXISTS "Reps can read own record" ON public.reps;

CREATE POLICY "Authenticated can read all reps" ON public.reps
  FOR SELECT TO authenticated
  USING (true);

-- DEALS: Replace admin-only + own-deals SELECT with all-authenticated
DROP POLICY IF EXISTS "Admins can read all active deals" ON public.deals;
DROP POLICY IF EXISTS "Reps can read own deals" ON public.deals;

CREATE POLICY "Authenticated can read all active deals" ON public.deals
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- PROFILES: Allow all authenticated users to see profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Authenticated can read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Also assign admin role to existing users so write operations work
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;



-- Drop admin-only policies on deals
DROP POLICY IF EXISTS "Admins can insert deals" ON public.deals;
DROP POLICY IF EXISTS "Admins can update deals" ON public.deals;

-- Create open policies for authenticated users on deals
CREATE POLICY "Authenticated users can insert deals" ON public.deals
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update deals" ON public.deals
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Drop admin-only policies on reps
DROP POLICY IF EXISTS "Admins can insert reps" ON public.reps;
DROP POLICY IF EXISTS "Admins can update reps" ON public.reps;
DROP POLICY IF EXISTS "Admins can delete reps" ON public.reps;

-- Create open policies for authenticated users on reps
CREATE POLICY "Authenticated users can insert reps" ON public.reps
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update reps" ON public.reps
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete reps" ON public.reps
  FOR DELETE TO authenticated USING (true);


DROP TRIGGER IF EXISTS audit_deals_changes ON public.deals;
DROP FUNCTION IF EXISTS public.audit_deals_changes() CASCADE;
DROP TABLE IF EXISTS public.deals CASCADE;
DROP TABLE IF EXISTS public.comp_tiers CASCADE;
DROP TABLE IF EXISTS public.comp_plans CASCADE;
DROP TABLE IF EXISTS public.quota_tiers CASCADE;
DROP TABLE IF EXISTS public.reps CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TYPE IF EXISTS public.deal_status CASCADE;
DROP TYPE IF EXISTS public.quota_period CASCADE;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'librarian';

DO $$ BEGIN
  CREATE TYPE public.loan_status AS ENUM ('active', 'overdue', 'returned', 'pending', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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


DROP POLICY IF EXISTS "pub_read" ON public.publishers;
CREATE POLICY "pub_read" ON public.publishers FOR SELECT TO authenticated
  USING (true);


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


ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';
ALTER TYPE public.loan_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.loan_status ADD VALUE IF NOT EXISTS 'rejected';



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



REVOKE EXECUTE ON FUNCTION public.sync_member_role_to_user() FROM PUBLIC, anon, authenticated;



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


-- Custom: allow students to self-register
DROP POLICY IF EXISTS "mem_ins_self" ON public.members; CREATE POLICY "mem_ins_self" ON public.members FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "mem_read_self" ON public.members; CREATE POLICY "mem_read_self" ON public.members FOR SELECT TO authenticated USING (email = auth.jwt() ->> 'email');
