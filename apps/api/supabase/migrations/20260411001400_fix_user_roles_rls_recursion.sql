-- Fix infinite recursion in user_roles RLS policy
-- ============================================================================
-- The original policy for "Users can view their user roles" used a subquery:
--   organization_id IN (SELECT organization_id FROM public.user_roles WHERE ...)
-- This caused infinite recursion because the policy on user_roles queries
-- user_roles itself.
--
-- Fix: Create a SECURITY DEFINER helper function that bypasses RLS, and
-- update the policy to use it.
-- ============================================================================

-- ============================================================================
-- SECURITY DEFINER HELPER: Check if user is an admin in a given organization
-- ============================================================================
-- This function runs with the privileges of the definer (superuser/owner),
-- bypassing RLS to prevent recursion when called from RLS policies.

CREATE OR REPLACE FUNCTION public.is_admin_for_org(org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND organization_id = org_id AND role = 'admin'
  );
$$;

-- ============================================================================
-- FIX: Replace recursive user_roles SELECT policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their user roles" ON public.user_roles;

CREATE POLICY "Users can view their user roles"
  ON public.user_roles
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    public.is_admin_for_org(organization_id)
  );

-- ============================================================================
-- FIX: Also update the is_org_admin helper to use SECURITY DEFINER
-- so it doesn't cause recursion in other policy contexts
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND organization_id = org_id AND role = 'admin'
  );
$$;

-- ============================================================================
-- FIX: Also update is_system_admin to use SECURITY DEFINER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND is_primary = true
  );
$$;

-- ============================================================================
-- FIX: Update get_user_primary_organization to use SECURITY DEFINER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_primary_organization()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM public.user_roles
  WHERE user_id = auth.uid() AND is_primary = true
  LIMIT 1;
$$;
