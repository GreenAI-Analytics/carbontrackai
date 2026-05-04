-- Stripe subscription fields — Migration 27

ALTER TABLE public.feature_flag_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30) DEFAULT 'inactive';

COMMENT ON COLUMN public.feature_flag_subscriptions.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN public.feature_flag_subscriptions.stripe_subscription_id IS 'Active Stripe subscription ID';
COMMENT ON COLUMN public.feature_flag_subscriptions.subscription_status IS 'inactive | active | past_due | canceled';
