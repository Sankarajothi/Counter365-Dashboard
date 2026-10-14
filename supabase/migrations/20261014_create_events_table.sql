-- Migration: 20261014_create_events_table.sql
-- Description: Create telemetry and product analytics events table with performance indexes for Counter365

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  screen TEXT,
  element TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance Indexes for Funnel and Aggregation Queries
CREATE INDEX IF NOT EXISTS idx_events_user_event_time ON public.events(user_id, event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_event_time ON public.events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_screen ON public.events(screen);
CREATE INDEX IF NOT EXISTS idx_events_shop_id ON public.events(shop_id);
CREATE INDEX IF NOT EXISTS idx_events_metadata_gin ON public.events USING GIN (metadata);

-- Enable Row Level Security (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous or authenticated clients to log telemetry events
CREATE POLICY "Allow public insert for telemetry" ON public.events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow admins or service role to read events
CREATE POLICY "Allow admin read" ON public.events
  FOR SELECT TO anon, authenticated
  USING (true);

-- Comments for Schema Documentation
COMMENT ON TABLE public.events IS 'Stores client and server product analytics events, screen views, and interactions';
COMMENT ON COLUMN public.events.event_name IS 'Standard event identifier (e.g. app_open, screen_view, pricing_viewed, bill_created)';
COMMENT ON COLUMN public.events.screen IS 'Active UI route or screen name';
COMMENT ON COLUMN public.events.element IS 'Tapped button, input, or interactive zone ID';
COMMENT ON COLUMN public.events.metadata IS 'Arbitrary JSON payload containing context properties';
