-- ============================================================================
-- Whistleblower Reporting Channel — Migration 23
-- Per Directive 2019/1937: anonymous reporting, 7-day ack, 3-month feedback.
-- ============================================================================

-- Step 1: Add individual case fields to whistleblower_cases
ALTER TABLE public.whistleblower_cases
  ADD COLUMN IF NOT EXISTS case_reference VARCHAR(20),
  ADD COLUMN IF NOT EXISTS report_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS feedback_deadline TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS case_status VARCHAR(30) DEFAULT 'pending' CHECK (case_status IN ('pending', 'acknowledged', 'investigating', 'substantiated', 'dismissed', 'resolved')),
  ADD COLUMN IF NOT EXISTS submission_channel VARCHAR(30) DEFAULT 'web_form' CHECK (submission_channel IN ('web_form', 'email', 'phone', 'in_person', 'other')),
  ADD COLUMN IF NOT EXISTS reporter_contact VARCHAR(200),
  ADD COLUMN IF NOT EXISTS evidence_url TEXT,
  ADD COLUMN IF NOT EXISTS assigned_officer_id UUID REFERENCES auth.users(id);

COMMENT ON COLUMN public.whistleblower_cases.case_reference IS 'Anonymous reference code for the reporter (e.g. WB-2025-001)';
COMMENT ON COLUMN public.whistleblower_cases.acknowledged_at IS 'Art. 9(1): must be within 7 days of submission';
COMMENT ON COLUMN public.whistleblower_cases.feedback_deadline IS 'Art. 9(1): feedback must be provided within 3 months';
COMMENT ON COLUMN public.whistleblower_cases.case_status IS 'pending → acknowledged (7d) → investigating → substantiated/dismissed → resolved (3mo)';
COMMENT ON COLUMN public.whistleblower_cases.reporter_contact IS 'Optional email/phone for follow-up — encrypted at rest';
COMMENT ON COLUMN public.whistleblower_cases.assigned_officer_id IS 'Whistleblower officer assigned to investigate';

-- Step 2: Add anti-retaliation policy flag to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS anti_retaliation_policy_url TEXT;

COMMENT ON COLUMN public.organizations.anti_retaliation_policy_url IS 'Directive 2019/1937 Art. 19: link to published anti-retaliation policy';

-- Step 3: Index for case status queries
CREATE INDEX IF NOT EXISTS idx_whistleblower_status ON public.whistleblower_cases(case_status);
CREATE INDEX IF NOT EXISTS idx_whistleblower_deadline ON public.whistleblower_cases(feedback_deadline);
