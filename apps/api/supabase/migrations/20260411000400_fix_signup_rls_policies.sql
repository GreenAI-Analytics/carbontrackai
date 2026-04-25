-- ============================================================================
-- Fix missing RLS INSERT policies that break onboarding
-- The signup flow was failing because:
--   1. user_roles table had only SELECT policy, no INSERT
--   2. feature_flag_subscriptions table had only SELECT policy, no INSERT
-- ============================================================================

-- Allow authenticated users to insert their own user_roles (for onboarding)
CREATE POLICY "Users can insert their own user roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to insert feature flags for their org (for onboarding)
CREATE POLICY "Users can insert feature flags for their organization"
  ON public.feature_flag_subscriptions
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );
