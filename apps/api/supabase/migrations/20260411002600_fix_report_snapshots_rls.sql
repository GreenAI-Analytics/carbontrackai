-- Add INSERT policy for report_snapshots (was missing — only SELECT existed)
CREATE POLICY "Users can insert report_snapshots for their org"
  ON public.report_snapshots
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );
