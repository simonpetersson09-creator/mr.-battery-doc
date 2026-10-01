CREATE TABLE public.google_play_consumed_purchases (
  purchase_token text PRIMARY KEY,
  product_id text NOT NULL,
  order_id text,
  calculation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.google_play_consumed_purchases TO service_role;
ALTER TABLE public.google_play_consumed_purchases ENABLE ROW LEVEL SECURITY;