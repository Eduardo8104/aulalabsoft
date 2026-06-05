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
  CREATE TYPE public.loan_status AS ENUM ('active', 'overdue', 'returned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;