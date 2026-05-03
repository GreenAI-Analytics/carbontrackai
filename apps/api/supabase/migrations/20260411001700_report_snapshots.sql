-- ============================================================================
-- Report Snapshots — Migration 17
-- Immutable snapshots of ESG reports for audit trail and CSRD compliance.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  report_data JSONB NOT NULL,
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.report_snapshots IS 'Immutable ESG report snapshots. Once created, report_data is append-only for audit trail.';

ALTER TABLE public.report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their organization's report_snapshots"
  ON public.report_snapshots
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_report_snapshots_org ON public.report_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_period ON public.report_snapshots(reporting_period_id);
