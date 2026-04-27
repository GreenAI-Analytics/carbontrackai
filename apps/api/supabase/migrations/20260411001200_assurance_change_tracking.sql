-- ============================================================================
-- Assurance & Change Tracking — Migration 12
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('draft', 'reviewed', 'approved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Per-field change tracking
CREATE TABLE IF NOT EXISTS public.change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Evidence file attachments
CREATE TABLE IF NOT EXISTS public.evidence_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_table VARCHAR(100) NOT NULL,
  source_record_id UUID NOT NULL,
  file_name VARCHAR(200) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Simple sign-off review tracking
CREATE TABLE IF NOT EXISTS public.review_approval_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_table VARCHAR(100) NOT NULL,
  source_record_id UUID NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_status review_status DEFAULT 'draft',
  comments TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_approval_log ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    AND table_name IN ('change_history','evidence_attachments','review_approval_log')
  LOOP
    EXECUTE format('
      CREATE POLICY "Users can access their organization''s %s"
        ON public.%I
        FOR SELECT
        USING (
          organization_id IN (
            SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
          )
        );
    ', tbl, tbl);
  END LOOP;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_change_history_org ON public.change_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_change_history_record ON public.change_history(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_evidence_attachments_org ON public.evidence_attachments(organization_id);
CREATE INDEX IF NOT EXISTS idx_evidence_record ON public.evidence_attachments(source_table, source_record_id);
CREATE INDEX IF NOT EXISTS idx_review_approval_org ON public.review_approval_log(organization_id);
