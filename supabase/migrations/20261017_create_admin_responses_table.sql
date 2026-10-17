-- Migration: 20261017_create_admin_responses_table.sql
-- Description: Create dedicated admin_responses table for customer call notes, feedback, and employee tracking

CREATE TABLE IF NOT EXISTS public.admin_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  shop_name TEXT,
  employee_name TEXT NOT NULL DEFAULT 'Admin',
  employee_email TEXT,
  response_type TEXT NOT NULL DEFAULT 'Answered',
  outcome TEXT NOT NULL DEFAULT 'Positive',
  sentiment TEXT DEFAULT 'Positive',
  notes TEXT,
  customer_feedback TEXT,
  service_type TEXT,
  lead_source TEXT,
  demo_status TEXT,
  timer_duration TEXT,
  follow_up_date DATE,
  follow_up_priority TEXT DEFAULT 'Medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_responses_shop_id ON public.admin_responses(shop_id);
CREATE INDEX IF NOT EXISTS idx_admin_responses_employee_name ON public.admin_responses(employee_name);
CREATE INDEX IF NOT EXISTS idx_admin_responses_outcome ON public.admin_responses(outcome);
CREATE INDEX IF NOT EXISTS idx_admin_responses_created_at ON public.admin_responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_responses_follow_up_date ON public.admin_responses(follow_up_date);

-- Enable Row Level Security (RLS)
ALTER TABLE public.admin_responses ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated clients to insert responses
CREATE POLICY "Allow insert admin_responses" ON public.admin_responses
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow reading all responses
CREATE POLICY "Allow select admin_responses" ON public.admin_responses
  FOR SELECT TO anon, authenticated
  USING (true);

-- Allow updating responses
CREATE POLICY "Allow update admin_responses" ON public.admin_responses
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Allow deleting responses
CREATE POLICY "Allow delete admin_responses" ON public.admin_responses
  FOR DELETE TO anon, authenticated
  USING (true);

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_admin_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_admin_responses_updated_at ON public.admin_responses;

CREATE TRIGGER trigger_update_admin_responses_updated_at
  BEFORE UPDATE ON public.admin_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_responses_updated_at();

-- Schema Comments
COMMENT ON TABLE public.admin_responses IS 'Stores customer call logs, outcome sentiment, employee tracking, and follow-up schedules';
COMMENT ON COLUMN public.admin_responses.shop_id IS 'Target shop or salon ID';
COMMENT ON COLUMN public.admin_responses.employee_name IS 'Name of the logged-in admin or staff member who recorded the response';
COMMENT ON COLUMN public.admin_responses.response_type IS 'Call type (Answered, Busy, Not Reachable, Wrong Number)';
COMMENT ON COLUMN public.admin_responses.outcome IS 'Outcome categorization (Positive, Negative, Neutral, Follow-up Required)';
COMMENT ON COLUMN public.admin_responses.follow_up_date IS 'Scheduled follow-up date for sales or support';
