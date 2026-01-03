-- ============================================================================
-- APPLYFLOW EMAIL TRACKING SCHEMA
-- Phase 2: Email Auto-Tracking
-- ============================================================================

-- Email classification enum
CREATE TYPE email_classification AS ENUM (
  'REJECTION', 'INTERVIEW_REQUEST', 'OFFER', 'SCREENING_INVITE',
  'ASSESSMENT_REQUEST', 'GENERIC_UPDATE', 'UNRELATED'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Application emails table
CREATE TABLE public.application_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  from_address TEXT NOT NULL,
  from_name TEXT,
  subject TEXT NOT NULL,
  body_preview TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  classification email_classification,
  classification_confidence DECIMAL(3,2),
  is_manually_classified BOOLEAN DEFAULT false,
  extracted_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unmatched emails queue (for user review)
CREATE TABLE public.unmatched_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email_id UUID NOT NULL REFERENCES public.application_emails(id) ON DELETE CASCADE,
  suggested_application_ids UUID[],
  linked_application_id UUID REFERENCES public.applications(id),
  status TEXT DEFAULT 'pending', -- 'pending' | 'linked' | 'dismissed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ALTER USERS TABLE
-- ============================================================================

-- Add inbound email address to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS inbound_email_address TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_sync_enabled BOOLEAN DEFAULT false;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Generate inbound email address for new users
CREATE OR REPLACE FUNCTION generate_inbound_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.inbound_email_address IS NULL THEN
    NEW.inbound_email_address =
      SUBSTRING(NEW.id::TEXT, 1, 8) || '-' ||
      SUBSTRING(MD5(NEW.id::TEXT || 'applyflow'), 1, 6) ||
      '@inbound.applyflow.com';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new users (drop if exists first)
DROP TRIGGER IF EXISTS users_inbound_address ON users;
CREATE TRIGGER users_inbound_address BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION generate_inbound_address();

-- Update existing users with inbound addresses
UPDATE public.users SET inbound_email_address =
  SUBSTRING(id::TEXT, 1, 8) || '-' ||
  SUBSTRING(MD5(id::TEXT || 'applyflow'), 1, 6) ||
  '@inbound.applyflow.com'
WHERE inbound_email_address IS NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_emails_user ON application_emails(user_id, received_at DESC);
CREATE INDEX idx_emails_application ON application_emails(application_id);
CREATE INDEX idx_users_inbound ON users(inbound_email_address);
CREATE INDEX idx_unmatched_user ON unmatched_emails(user_id, status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE application_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE unmatched_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own emails" ON application_emails
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own unmatched" ON unmatched_emails
  FOR ALL USING (auth.uid() = user_id);
