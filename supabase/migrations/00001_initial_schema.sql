-- ============================================================================
-- APPLYFLOW DATABASE SCHEMA (Supabase PostgreSQL)
-- Phase 0: Foundation
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TYPES (Enums)
-- ============================================================================

CREATE TYPE application_status AS ENUM (
  'SAVED', 'APPLIED', 'SCREENING', 'INTERVIEWING',
  'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'GHOSTED'
);

CREATE TYPE job_type AS ENUM (
  'internship', 'full_time', 'part_time', 'contract'
);

CREATE TYPE location_type AS ENUM (
  'remote', 'hybrid', 'onsite'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Job details
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  job_url TEXT,
  job_url_hash TEXT,

  -- Location
  location TEXT,
  location_type location_type,

  -- Compensation
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',

  -- Metadata
  job_type job_type DEFAULT 'full_time',
  job_description TEXT,
  requirements TEXT[],

  -- Tracking
  status application_status DEFAULT 'SAVED',
  source TEXT DEFAULT 'manual',
  notes TEXT,

  -- Dates
  date_saved TIMESTAMPTZ DEFAULT NOW(),
  date_applied TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate URLs per user
  UNIQUE(user_id, job_url_hash)
);

-- Status History
CREATE TABLE public.status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,

  from_status application_status,
  to_status application_status NOT NULL,
  trigger_type TEXT NOT NULL, -- 'manual' | 'email_auto' | 'extension'
  trigger_email_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_applications_user_status ON applications(user_id, status);
CREATE INDEX idx_applications_user_company ON applications(user_id, company_name);
CREATE INDEX idx_applications_job_url_hash ON applications(job_url_hash);
CREATE INDEX idx_status_history_application ON status_history(application_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Applications policies
CREATE POLICY "Users can view own applications" ON applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications" ON applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications" ON applications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own applications" ON applications
  FOR DELETE USING (auth.uid() = user_id);

-- Status history policies
CREATE POLICY "Users can view own status history" ON status_history
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM applications WHERE id = application_id)
  );

CREATE POLICY "Users can insert own status history" ON status_history
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM applications WHERE id = application_id)
  );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create status history on status change
CREATE OR REPLACE FUNCTION create_status_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO status_history (application_id, from_status, to_status, trigger_type)
    VALUES (NEW.id, OLD.status, NEW.status, 'manual');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_status_history
  AFTER UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION create_status_history();

-- Create user profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();