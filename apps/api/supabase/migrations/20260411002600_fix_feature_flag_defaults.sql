-- Fix feature flag defaults for VSME Basic and VSME Comprehensive — Migration 26
-- workforce_enabled + business_conduct_enabled should be true for all tiers
-- taxonomy_enabled should be true for vsme_comprehensive (simplified, not just csrd)

UPDATE public.feature_flag_subscriptions
SET
  workforce_enabled = true,
  business_conduct_enabled = true
WHERE workforce_enabled = false OR business_conduct_enabled = false;

UPDATE public.feature_flag_subscriptions
SET taxonomy_enabled = true
WHERE plan_type = 'vsme_comprehensive' AND taxonomy_enabled = false;
