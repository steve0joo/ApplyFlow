-- ============================================================================
-- APPLYFLOW DATABASE SCHEMA (Supabase PostgreSQL)
-- Phase 3: BYOA Settings
-- ============================================================================

-- Add BYOA configuration columns to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS supabase_url TEXT,
  ADD COLUMN IF NOT EXISTS llm_provider TEXT DEFAULT 'anthropic',
  ADD COLUMN IF NOT EXISTS llm_api_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS byoa_setup_complete BOOLEAN DEFAULT false;

-- Add check constraint for LLM provider (anthropic or openai only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_llm_provider'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT chk_llm_provider
      CHECK (llm_provider IS NULL OR llm_provider IN ('anthropic', 'openai'));
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.users.supabase_url IS 'User''s own Supabase project URL for BYOA mode';
COMMENT ON COLUMN public.users.llm_provider IS 'LLM provider: anthropic or openai';
COMMENT ON COLUMN public.users.llm_api_key_encrypted IS 'AES-256-GCM encrypted LLM API key';
COMMENT ON COLUMN public.users.byoa_setup_complete IS 'Whether user has completed BYOA setup wizard';
