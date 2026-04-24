-- Authentication and Admin Setup for CarbonTrackAI
-- Supabase Auth customization and admin utilities

-- ============================================================================
-- EMAIL TEMPLATES (configured in Supabase Auth)
-- ============================================================================

-- Note: These templates must be set in Supabase Console > Authentication > Email Templates
-- 1. Confirm signup email
-- 2. Magic link email (for passwordless login)
-- 3. Change email confirmation
-- 4. Reset password email

-- Email template variables available:
-- {{ .ConfirmationURL }} - Link to confirm signup
-- {{ .SiteURL }} - Your app domain
-- {{ .Email }} - User's email address

-- ============================================================================
-- ADMIN ACCESS AUDIT TABLE
-- ============================================================================

CREATE TABLE public.admin_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- HELPER FUNCTION: Request admin access
-- ============================================================================

-- System admins are users with 'admin' role in their primary organization
-- and have is_primary = true in user_roles table.

CREATE OR REPLACE FUNCTION public.request_admin_access(
  requesting_user_id UUID,
  access_reason TEXT
)
RETURNS TABLE(
  request_id UUID,
  user_id UUID,
  access_reason TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
  INSERT INTO public.admin_access_requests (user_id, access_reason)
  VALUES (requesting_user_id, access_reason)
  RETURNING 
    id,
    user_id,
    access_reason,
    status,
    created_at;
$$ LANGUAGE SQL;

-- Audit log for admin actions
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  affected_resource_id UUID,
  affected_resource_type VARCHAR(50),
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- LOGIN AUDIT (for security monitoring)
-- ============================================================================

CREATE TABLE public.login_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_method VARCHAR(50) NOT NULL, -- 'email_password', 'magic_link', 'oauth'
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_audit_user_id ON public.login_audit(user_id);
CREATE INDEX idx_login_audit_created_at ON public.login_audit(created_at);

-- ============================================================================
-- USER PROFILE EXTENSION
-- ============================================================================

CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for user profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles
  FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (id = auth.uid());

-- ============================================================================
-- AUTHENTICATION TRIGGERS
-- ============================================================================

-- Trigger to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- INVITATION SYSTEM FOR ADDING USERS TO ORGANIZATIONS
-- ============================================================================

CREATE TABLE public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_email VARCHAR(255) NOT NULL,
  invited_role user_role DEFAULT 'user',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  token VARCHAR(255) UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, invited_email)
);

CREATE INDEX idx_invitations_organization_id ON public.organization_invitations(organization_id);
CREATE INDEX idx_invitations_token ON public.organization_invitations(token);
CREATE INDEX idx_invitations_accepted_at ON public.organization_invitations(accepted_at);

-- Enable RLS
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Organization admins can create invitations
CREATE POLICY "Org admins can create invitations"
  ON public.organization_invitations
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Anyone can view invitations sent to their email
CREATE POLICY "Users can view their invitations"
  ON public.organization_invitations
  FOR SELECT
  USING (invited_email = auth.jwt()->>'email');

-- ============================================================================
-- ADMIN SET-UP: Create first admin user after database migration
-- ============================================================================

-- Run this SQL manually after deploying production:
-- 
-- SELECT auth.uid() as user_id; -- Get your user ID from Supabase Console
-- 
-- INSERT INTO public.organizations (name, country_code)
-- VALUES ('CarbonTrackAI Admin', 'EU');
-- 
-- INSERT INTO public.user_roles (user_id, organization_id, role, is_primary)
-- VALUES ('{YOUR_USER_ID}', '{ADMIN_ORG_ID}', 'admin', true);

-- ============================================================================
-- PRE-CONFIGURED FACTOR SOURCES
-- ============================================================================

INSERT INTO public.factor_sources (name, provider, url, is_active)
VALUES
  ('ADEME Base Carbone', 'ademe_api', 'https://data.ademe.fr/api-base-carbone', true),
  ('Spain MITECO', 'miteco_api', 'https://datosabiertos.miteco.gob.es', true),
  ('Climatiq', 'climatiq_api', 'https://api.climatiq.io', true),
  ('EEA (via Climatiq)', 'eea_climatiq', 'https://www.climatiq.io/data/source/eea', true),
  ('Local Cache Fallback', 'local_cache', 'internal', true)
ON CONFLICT (name, provider) DO NOTHING;
