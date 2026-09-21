CREATE TABLE public.analytics_events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT NOT NULL,
  event TEXT NOT NULL,
  step TEXT,
  detail TEXT,
  country TEXT,
  language TEXT,
  platform TEXT,
  ms_on_step INTEGER
);

CREATE INDEX analytics_events_created_at_idx ON public.analytics_events (created_at DESC);
CREATE INDEX analytics_events_event_idx ON public.analytics_events (event);
CREATE INDEX analytics_events_session_idx ON public.analytics_events (session_id);

GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.analytics_events_id_seq TO anon, authenticated;
GRANT ALL ON public.analytics_events TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record an anonymous usage event"
  ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(session_id) BETWEEN 8 AND 64
    AND length(event) BETWEEN 1 AND 64
    AND (step IS NULL OR length(step) <= 64)
    AND (detail IS NULL OR length(detail) <= 120)
  );