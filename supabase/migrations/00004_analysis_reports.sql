-- ============================================================================
-- APPLYFLOW DATABASE SCHEMA (Supabase PostgreSQL)
-- Phase 4: Analysis Reports
-- ============================================================================

-- Create analysis_reports table
CREATE TABLE public.analysis_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Filter parameters
  date_from TIMESTAMPTZ,
  date_to TIMESTAMPTZ,
  job_types job_type[],

  -- Analysis results (JSONB for flexibility)
  statistics JSONB NOT NULL DEFAULT '{}',
  patterns JSONB NOT NULL DEFAULT '{}',
  recommendations JSONB NOT NULL DEFAULT '[]',

  -- Metadata
  application_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_analysis_reports_user ON analysis_reports(user_id, created_at DESC);
CREATE INDEX idx_analysis_reports_status ON analysis_reports(status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analysis reports" ON analysis_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis reports" ON analysis_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis reports" ON analysis_reports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analysis reports" ON analysis_reports
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.analysis_reports IS 'AI-powered analysis reports for job application insights';
COMMENT ON COLUMN public.analysis_reports.statistics IS 'Calculated stats: response_rate, avg_time_to_response, etc.';
COMMENT ON COLUMN public.analysis_reports.patterns IS 'LLM-identified patterns from application data';
COMMENT ON COLUMN public.analysis_reports.recommendations IS 'LLM-generated recommendations for improvement';
