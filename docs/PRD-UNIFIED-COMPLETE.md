# ApplyFlow: Unified Product Requirements Document

**Version:** 2.5
**Last Updated:** January 5, 2026
**Status:** All Phases Complete - MVP Ready

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [User Stories](#15-user-stories)
3. [Technical Architecture](#2-technical-architecture)
4. [Implementation Phases](#3-implementation-phases)
5. [Database Schema](#4-database-schema)
6. [Feature Specifications](#5-feature-specifications)
7. [API Specifications](#6-api-specifications)
8. [Dashboard & Notifications](#66-dashboard--notifications)
9. [Project Structure](#7-project-structure)
10. [Non-Functional Requirements](#8-non-functional-requirements)

---

## 1. Executive Summary

### 1.1 Problem

Job seekers apply to 50-200+ positions but face:
- Manual tracking overhead (5-10 min per application)
- Status tracking burden (daily email checking)
- No actionable insights (why am I getting rejected?)

### 1.2 Solution

**"Track once, update never. Get insights always."**

1. **Auto-capture** - Chrome extension saves jobs with one click
2. **Auto-tracking** - Email forwarding + LLM updates status automatically
3. **AI analysis** - Identifies rejection patterns, provides recommendations

### 1.3 Deployment Strategy

**BYOA-First (Bring Your Own API):**
- Users provide: Supabase + LLM API key (2 configs only)
- We manage: Email inbound, cache, hosting, background jobs

**Future Quick Start:** Add managed tier after 500+ users

---

## 1.5 User Stories

### Epic 1: Application Capture
- **US-1.1:** As a user, I want to save a job posting with one click so I don't waste time copying details
- **US-1.2:** As a user, I want the extension to auto-extract job title, company, location, salary, and description
- **US-1.3:** As a user, I want to review extracted data before saving to catch errors
- **US-1.4:** As a user, I want to manually add applications when extension doesn't work

### Epic 2: Automatic Status Tracking
- **US-2.1:** As a user, I want to set up email forwarding so status updates happen automatically
- **US-2.2:** As a user, I want rejections detected from emails without manual marking
- **US-2.3:** As a user, I want interview invites to update status to "Interviewing"
- **US-2.4:** As a user, I want to see which email triggered each status change
- **US-2.5:** As a user, I want to override auto-classifications if they're wrong

### Epic 3: Tracking & Organization
- **US-3.1:** As a user, I want to see all applications in a list with filters (status, job type, date)
- **US-3.2:** As a user, I want a Kanban board to visualize my pipeline
- **US-3.3:** As a user, I want to see a timeline of status changes per application
- **US-3.4:** As a user, I want to search applications by company or role

### Epic 4: AI Insights
- **US-4.1:** As a user, I want to analyze my applications by time period (e.g., Summer 2025)
- **US-4.2:** As a user, I want to see why I'm getting rejected (patterns, skill gaps)
- **US-4.3:** As a user, I want personalized recommendations to improve outcomes
- **US-4.4:** As a user, I want to compare successful vs rejected applications

### Epic 5: API Configuration (BYOA Model)
- **US-5.1:** As a user, I want a setup wizard to configure my own APIs during onboarding
- **US-5.2:** As a user, I want to test API connections before saving credentials
- **US-5.3:** As a user, I want to update or rotate API keys from settings
- **US-5.4:** As a user, I want clear error messages if my APIs fail

---

## 2. Technical Architecture

### 2.1 Tech Stack (Optimized)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19 | Server components, full-stack, Vercel native |
| **UI** | Tailwind 4 + shadcn/ui + Sonner | Fast development, consistent design, toast notifications |
| **Database** | Supabase | Auth + PostgreSQL + RLS + Realtime in one |
| **ORM** | None (Supabase client) | Direct access, type generation, less complexity |
| **Background Jobs** | Inngest | Serverless, zero infra, built-in Vercel integration |
| **Cache** | Vercel KV | Managed Redis, no user config needed |
| **Extension** | Plasmo | React-based, TypeScript, hot reload |
| **Email Inbound** | SendGrid Inbound Parse | Reliable, ~$0.001/email |
| **LLM** | Vercel AI SDK + Anthropic Claude | Unified API for Anthropic/OpenAI |
| **Hosting** | Vercel | Zero-config deployment |
| **Monitoring** | Sentry + Vercel Analytics | Error tracking + performance |

### 2.2 Why This Stack?

**No Prisma:**
```
❌ Before: Next.js → Prisma → Supabase PostgreSQL
✅ After:  Next.js → Supabase Client → PostgreSQL

- One less abstraction
- Supabase has type generation: npx supabase gen types
- RLS policies work directly
- Real-time subscriptions built-in
```

**Inngest over BullMQ:**
```
❌ Before: Webhook → BullMQ (Redis) → Self-hosted Worker
✅ After:  Webhook → Inngest (serverless)

- Zero infrastructure to manage
- No Redis required
- Built-in retries, logging, replay
- Native Vercel integration
- Free tier: 50K events/month
```

**Vercel AI SDK:**
```typescript
// Unified API - users can switch LLM providers easily
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

const model = userPreference === 'anthropic'
  ? anthropic('claude-3-haiku-20240307')
  : openai('gpt-4o-mini');

const { text } = await generateText({ model, prompt });
```

### 2.3 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                   USER                                       │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           │                          │                          │
           ▼                          ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  Chrome Extension   │    │     Web App         │    │   Gmail Filter      │
│     (Plasmo)        │    │    (Next.js 16)     │    │  (Auto-forward)     │
└──────────┬──────────┘    └──────────┬──────────┘    └──────────┬──────────┘
           │                          │                          │
           │                          │                          │
           └────────────┬─────────────┘                          │
                        │                                        │
                        ▼                                        ▼
              ┌─────────────────────┐              ┌─────────────────────┐
              │    Vercel Edge      │              │  SendGrid Inbound   │
              │    (API Routes)     │              │  Parse Webhook      │
              └──────────┬──────────┘              └──────────┬──────────┘
                         │                                    │
                         │                                    │
                         ▼                                    ▼
              ┌─────────────────────────────────────────────────────────────┐
              │                        INNGEST                               │
              │              (Serverless Background Jobs)                   │
              │                                                              │
              │  ┌─────────────────┐        ┌─────────────────┐            │
              │  │ process-email   │        │ run-analysis    │            │
              │  │                 │        │                 │            │
              │  │ 1. Match app    │        │ 1. Aggregate    │            │
              │  │ 2. Classify LLM │        │ 2. Call LLM     │            │
              │  │ 3. Update DB    │        │ 3. Save report  │            │
              │  └─────────────────┘        └─────────────────┘            │
              └────────────────────────────────┬──────────────────────────┘
                                               │
                         ┌─────────────────────┴─────────────────────┐
                         │                                           │
                         ▼                                           ▼
              ┌─────────────────────┐                    ┌─────────────────────┐
              │   User's Supabase   │                    │   Vercel AI SDK     │
              │    (BYOA)           │                    │  (User's LLM key)   │
              │                     │                    │                     │
              │  • PostgreSQL       │                    │  • Claude Haiku     │
              │  • Auth             │                    │  • GPT-4o-mini      │
              │  • RLS              │                    │                     │
              └─────────────────────┘                    └─────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │    Vercel KV        │
              │  (Managed Cache)    │
              │                     │
              │  • Classification   │
              │    results cache    │
              │  • Rate limiting    │
              └─────────────────────┘
```

### 2.4 Email Auto-Tracking Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ EMAIL AUTO-TRACKING FLOW                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. USER SETUP (one-time, ~5 min)                                           │
│     Gmail → Settings → Filters → Create filter:                             │
│     From: *@greenhouse.io OR *@lever.co OR ...                              │
│     Forward to: user-abc123@inbound.applyflow.com                           │
│                                                                              │
│  2. EMAIL ARRIVES                                                           │
│     Gmail → Auto-forward → SendGrid → POST /api/webhooks/inbound-email     │
│                                                                              │
│  3. INNGEST PROCESSES (serverless)                                          │
│     ┌───────────────────────────────────────────────────────┐              │
│     │  inngest.send('email/received', { email, userId })    │              │
│     │                                                        │              │
│     │  Step 1: Match to application (ATS-aware)             │              │
│     │  Step 2: Classify with LLM (Claude Haiku)             │              │
│     │  Step 3: Update application status                    │              │
│     │  Step 4: Create email record                          │              │
│     └───────────────────────────────────────────────────────┘              │
│                                                                              │
│  4. USER SEES UPDATE (real-time via Supabase)                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.5 BYOA Configuration (Simplified)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  WHAT USERS CONFIGURE (2 items)                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. SUPABASE (Required)                                                     │
│     • Project URL: https://xxx.supabase.co                                  │
│     • Anon Key: eyJhbGc...                                                  │
│     • Service Role Key: eyJhbGc...                                          │
│                                                                              │
│  2. LLM API KEY (Required)                                                  │
│     • Provider: Anthropic or OpenAI                                         │
│     • API Key: sk-ant-... or sk-...                                         │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  WHAT WE MANAGE (users don't configure)                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  • Email Inbound: SendGrid (shared domain inbound.applyflow.com)            │
│  • Cache: Vercel KV (managed Redis)                                         │
│  • Background Jobs: Inngest (serverless)                                    │
│  • Hosting: Vercel                                                          │
│  • Monitoring: Sentry + Vercel Analytics                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.6 LLM Strategy

| Task | Model | Cost/1M tokens | Why |
|------|-------|----------------|-----|
| Email Classification | Claude 3 Haiku | $0.25 input | Fast, cheap, good enough |
| Data Extraction | Claude 3 Haiku | $0.25 input | Structured JSON output |
| Analysis Reports | Claude 3.5 Sonnet | $3.00 input | Higher reasoning needed |

**Cost per user/month:**
```
Classification: 100 apps × 3 emails × 600 tokens = 180K tokens
Haiku cost: 180K × $0.00025 = $0.045

Analysis: 3 reports × 4K tokens = 12K tokens
Sonnet cost: 12K × $0.003 = $0.036

Total: ~$0.08/user/month
```

---

## 3. Implementation Phases

### 3.1 Overview: 10 Weeks

```
Week 1-2   │ Phase 0: Foundation      │ Manual tracking works
Week 3-4   │ Phase 1: Extension       │ One-click save from LinkedIn/Greenhouse
Week 5-7   │ Phase 2: Email Tracking  │ Auto-status updates working
Week 8-9   │ Phase 3: BYOA & Polish   │ Public beta ready
Week 10    │ Phase 4: AI Analysis     │ MVP complete
```

### 3.2 Phase 0: Foundation (Week 1-2) ✅ COMPLETE

**Goal:** Working web app with manual job tracking

**Deliverables:**
- [x] Next.js 16 project with App Router (upgraded from 14)
- [x] Supabase project + SQL schema
- [x] Supabase Auth (Google OAuth)
- [x] Type generation (`npx supabase gen types`)
- [x] Basic CRUD API for applications
- [x] List view with status filters
- [x] Manual add/edit forms
- [ ] Deploy to Vercel

**Tech Setup:**
```bash
# Create project
npx create-next-app@latest applyflow --typescript --tailwind --app --src-dir

# Install dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install -D supabase

# UI components
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input select badge

# Supabase setup
npx supabase init
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase gen types typescript --local > src/types/database.ts
```

### 3.3 Phase 1: Extension (Week 3-4) ✅ COMPLETE

**Goal:** One-click job saving from LinkedIn and Greenhouse

**Deliverables:**
- [x] Plasmo scaffold (17 files total)
- [x] LinkedIn job page detector + extractor
- [x] Greenhouse job page detector + extractor
- [x] Extension popup UI (states: loading, not_authenticated, not_job_page, extracting, job_found, duplicate, saving, saved, error)
- [x] Auth token sync with web app (via `/auth/extension` callback)
- [x] Duplicate URL detection (SHA-256 hash)
- [ ] Submit to Chrome Web Store (unlisted) - deferred

**Tech Setup:**
```bash
# Create extension
npm create plasmo@latest extension -- --with-tailwindcss

# Install dependencies
cd extension
npm install @supabase/supabase-js
```

### 3.4 Phase 2: Email Tracking (Week 5-7) ✅ COMPLETE

**Goal:** Automatic status updates from forwarded emails

**Deliverables:**
- [x] SendGrid Inbound Parse webhook (`/api/webhooks/inbound-email`)
- [x] Unique inbound address generation per user (auto-generated on user creation)
- [x] Inngest setup + email processing function (`src/inngest/functions/process-email.ts`)
- [x] ATS-aware company matching (Greenhouse, Lever, Ashby, Jobvite, Workday, iCIMS)
- [x] LLM classification with Claude Haiku (`src/lib/llm/classify.ts`)
- [x] Confidence threshold handling (>0.9 auto-update, 0.7-0.9 flag, <0.7 manual)
- [x] Email history per application (`application_emails` table)
- [x] Unmatched email queue (`unmatched_emails` table)
- [x] Email setup UI page (`/settings/email`)

**Email Setup Onboarding Flow UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  Step 3 of 4: Connect Your Email                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📧 Your unique forwarding address:                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │  steve-x7k2m9@inbound.applyflow.com        [Copy]  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Set up Gmail forwarding in 3 steps:                        │
│                                                              │
│  1️⃣  Open Gmail Settings → Filters and Blocked Addresses   │
│                                                              │
│  2️⃣  Create a new filter with this "From" criteria:        │
│  ┌────────────────────────────────────────────────────┐    │
│  │  *@greenhouse.io OR *@lever.co OR *@ashbyhq.com    │    │
│  │  OR *@jobvite.com OR *@workday.com OR *@icims.com  │    │
│  │                                            [Copy]  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  3️⃣  Check "Forward it to" and paste your address above    │
│                                                              │
│  [📺 Watch 2-min Tutorial]                                  │
│                                                              │
│  ──────────────────────────────────────────────────────────│
│                                                              │
│  ✅ Test your setup:                                        │
│  We'll send a test email to verify forwarding works.        │
│                                                              │
│  [Send Test Email]                [Skip for Now]  [Next →] │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Dashboard: Update Filter Prompt**

When user adds applications to new companies, prompt to update filter:
```
┌─────────────────────────────────────────────────────────────┐
│  📧 Update your email filter                                 │
│                                                              │
│  You've added 3 new companies since setting up forwarding:  │
│  • Stripe                                                    │
│  • Airbnb                                                    │
│  • Coinbase                                                  │
│                                                              │
│  Add these to your Gmail filter to catch their emails:      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  *@stripe.com OR *@airbnb.com OR *@coinbase.com    │    │
│  │                                            [Copy]  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [Update Filter in Gmail →]    [Remind Me Later]  [Dismiss] │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Filter Auto-Generation:**
```typescript
// Generate Gmail filter string for user's tracked companies
function generateFilterString(
  trackedCompanies: string[],
  includeATS: boolean = true
): string {
  const filters: string[] = [];

  // Add ATS providers (always catch job emails)
  if (includeATS) {
    filters.push(
      '*@greenhouse.io',
      '*@lever.co',
      '*@ashbyhq.com',
      '*@jobvite.com',
      '*@workday.com',
      '*@icims.com',
      '*@smartrecruiters.com',
      '*@myworkdayjobs.com',
      '*@jobs.lever.co'
    );
  }

  // Add user's tracked company domains
  for (const company of trackedCompanies) {
    const domain = inferCompanyDomain(company);
    if (domain) {
      filters.push(`*@${domain}`);
      filters.push(`*@*.${domain}`); // subdomains
    }
  }

  return filters.join(' OR ');
}
```

**Tech Setup:**
```bash
# Install Inngest
npm install inngest

# Install Vercel AI SDK
npm install ai @ai-sdk/anthropic @ai-sdk/openai

# Install Vercel KV
npm install @vercel/kv
```

**Inngest Function:**
```typescript
// src/inngest/functions/process-email.ts
import { inngest } from '../client';
import { classifyEmail } from '@/lib/llm/classify';
import { matchEmailToApplication } from '@/lib/email/matching';

export const processEmail = inngest.createFunction(
  { id: 'process-email', retries: 3 },
  { event: 'email/received' },
  async ({ event, step }) => {
    const { email, userId } = event.data;

    // Step 1: Match to application
    const match = await step.run('match-application', async () => {
      return matchEmailToApplication(userId, email);
    });

    if (!match.application) {
      await step.run('create-unmatched', async () => {
        // Queue for user review
      });
      return { status: 'unmatched' };
    }

    // Step 2: Classify with LLM
    const classification = await step.run('classify-email', async () => {
      return classifyEmail(email, userId);
    });

    // Step 3: Update application status
    if (classification.confidence > 0.7) {
      await step.run('update-status', async () => {
        // Update application in user's Supabase
      });
    }

    // Step 4: Save email record
    await step.run('save-email', async () => {
      // Save to application_emails table
    });

    return { status: 'processed', classification };
  }
);
```

### 3.5 Phase 3: BYOA & Polish (Week 8-9) ✅ COMPLETE

**Goal:** Self-serve API configuration, polished UX

**Deliverables:**
- [x] 2-step setup wizard (Supabase → LLM)
- [x] API connection validators
- [x] Credential encryption (AES-256-GCM)
- [x] Kanban board with drag-drop (@dnd-kit)
- [x] List/Kanban view toggle
- [x] Status timeline view
- [x] Additional job boards (Indeed, Lever, Wellfound)
- [x] Skeleton loading states
- [x] Navigation with Settings dropdown
- [ ] Help documentation (deferred to post-MVP)

### 3.6 Phase 4: AI Analysis (Week 10) ✅ COMPLETE

**Goal:** Basic AI-powered insights (MVP version)

**Deliverables:**
- [x] Analysis filters (time period, job type)
- [x] Inngest analysis job (`run-analysis.ts`)
- [x] Pattern detection with Claude Sonnet
- [x] Statistics calculation (response rate, interview rate, etc.)
- [x] Recommendations generation
- [x] Analysis report UI (`/analytics` page)
- [x] Report history with delete

---

## 4. Database Schema

```sql
-- ============================================================================
-- APPLYFLOW DATABASE SCHEMA (Supabase PostgreSQL)
-- ============================================================================
-- Run this in Supabase SQL Editor or via migrations

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TYPES
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

CREATE TYPE email_classification AS ENUM (
  'REJECTION', 'INTERVIEW_REQUEST', 'OFFER', 'SCREENING_INVITE',
  'ASSESSMENT_REQUEST', 'GENERIC_UPDATE', 'UNRELATED'
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

  -- BYOA Configuration
  supabase_url TEXT,
  llm_provider TEXT, -- 'anthropic' | 'openai'
  llm_api_key_encrypted TEXT,

  -- Email sync
  inbound_email_address TEXT UNIQUE,
  email_sync_enabled BOOLEAN DEFAULT false,

  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies (shared reference data)
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  domain TEXT,
  domain_aliases TEXT[],
  logo_url TEXT,
  size_bucket TEXT, -- 'startup', 'mid', 'large', 'enterprise'
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id), -- optional link to shared company

  -- Job details
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL, -- denormalized for display
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
  source TEXT DEFAULT 'manual', -- 'extension' | 'manual' | 'import'
  notes TEXT,

  -- Dates
  date_saved TIMESTAMPTZ DEFAULT NOW(),
  date_applied TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate URLs per user
  UNIQUE(user_id, job_url_hash)
);

-- Application Emails
CREATE TABLE public.application_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,

  -- Email content
  from_address TEXT NOT NULL,
  from_name TEXT,
  subject TEXT NOT NULL,
  body_preview TEXT,
  received_at TIMESTAMPTZ NOT NULL,

  -- Classification
  classification email_classification,
  classification_confidence DECIMAL(3,2),
  is_manually_classified BOOLEAN DEFAULT false,

  -- Extracted data (interview dates, deadlines, etc.)
  extracted_data JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unmatched Emails (for user review)
CREATE TABLE public.unmatched_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email_id UUID NOT NULL REFERENCES public.application_emails(id) ON DELETE CASCADE,

  suggested_application_ids UUID[],
  linked_application_id UUID REFERENCES public.applications(id),
  status TEXT DEFAULT 'pending', -- 'pending' | 'linked' | 'dismissed'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status History
CREATE TABLE public.status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,

  from_status application_status,
  to_status application_status NOT NULL,
  trigger_type TEXT NOT NULL, -- 'manual' | 'email_auto' | 'extension'
  trigger_email_id UUID REFERENCES public.application_emails(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analysis Reports
CREATE TABLE public.analysis_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  filters JSONB NOT NULL,
  results JSONB,

  application_count INTEGER,
  status TEXT DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_applications_user_status ON applications(user_id, status);
CREATE INDEX idx_applications_user_company ON applications(user_id, company_name);
CREATE INDEX idx_applications_job_url_hash ON applications(job_url_hash);
CREATE INDEX idx_emails_user ON application_emails(user_id, received_at DESC);
CREATE INDEX idx_emails_application ON application_emails(application_id);
CREATE INDEX idx_users_inbound ON users(inbound_email_address);
CREATE INDEX idx_companies_domain ON companies(domain);
CREATE INDEX idx_companies_aliases ON companies USING GIN(domain_aliases);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE unmatched_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users own data" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own applications" ON applications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own emails" ON application_emails FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own unmatched" ON unmatched_emails FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own history" ON status_history FOR ALL
  USING (auth.uid() = (SELECT user_id FROM applications WHERE id = application_id));
CREATE POLICY "Users own analysis" ON analysis_reports FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate inbound email address on user creation
CREATE OR REPLACE FUNCTION generate_inbound_address()
RETURNS TRIGGER AS $$
BEGIN
  NEW.inbound_email_address =
    SUBSTRING(NEW.id::TEXT, 1, 8) || '-' ||
    SUBSTRING(MD5(NEW.id::TEXT || 'applyflow'), 1, 6) ||
    '@inbound.applyflow.com';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_inbound_address BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION generate_inbound_address();

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

CREATE TRIGGER applications_status_history AFTER UPDATE ON applications
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

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 5. Feature Specifications

### 5.1 Chrome Extension

**Supported Sites (Phase 1):**
- LinkedIn Jobs (`linkedin.com/jobs/*`)
- Greenhouse (`boards.greenhouse.io/*`)

**Future Phases:**
- Indeed (`indeed.com/jobs/*`)
- Lever (`jobs.lever.co/*`)
- Wellfound (`wellfound.com/jobs/*`)
- Workday (`*.myworkdayjobs.com/*`)
- Company career pages (generic detector)

**Extraction Fields:**
```typescript
interface ExtractedJob {
  jobTitle: string;        // Required
  companyName: string;     // Required
  jobUrl: string;          // Required
  location?: string;
  locationType?: 'remote' | 'hybrid' | 'onsite';
  salaryMin?: number;
  salaryMax?: number;
  jobType?: 'internship' | 'full_time' | 'part_time' | 'contract';
  description?: string;
}
```

**LinkedIn Selectors:**
```typescript
const LINKEDIN_SELECTORS = {
  title: '.job-details-jobs-unified-top-card__job-title',
  company: '.job-details-jobs-unified-top-card__company-name',
  location: '.job-details-jobs-unified-top-card__bullet',
  description: '.jobs-description__content',
};
```

**Greenhouse Selectors:**
```typescript
const GREENHOUSE_SELECTORS = {
  title: '.app-title',
  company: '.company-name',
  location: '.location',
  description: '#content',
};
```

### 5.1.2 Confirmation Popup

**Popup UI:**
```
┌─────────────────────────────────────────┐
│  📋 Track this application?             │
├─────────────────────────────────────────┤
│                                          │
│  Software Engineer Intern               │
│  Ripple • San Francisco, CA             │
│  💰 $40-50/hr                           │
│                                          │
│  Status: [Saved ▼]                      │
│         (Saved, Applied)                │
│                                          │
│  Date Applied: [01/02/2026]  (optional) │
│                                          │
│  Notes: [___________________]  (optional)│
│                                          │
│  [✓ Track Application]  [✗ Cancel]     │
└─────────────────────────────────────────┘
```

**Quick Actions:**
- Default status: "Saved" (user hasn't applied yet)
- Option to change to "Applied" if already submitted
- Optional date picker if already applied
- Optional notes field
- Keyboard shortcuts: Enter to save, Esc to cancel

### 5.1.3 Duplicate Detection

- Check if job URL already tracked
- If duplicate: "You already tracked this job on 12/20/25. [View] [Update]"
- Allow re-tracking if user wants to update data

### 5.1.4 Background Sync

**API Communication:**
```typescript
POST /api/applications
Authorization: Bearer {user_token}
Content-Type: application/json

{
  "jobTitle": "Software Engineer Intern",
  "companyName": "Ripple",
  "location": "San Francisco, CA",
  "jobUrl": "https://linkedin.com/jobs/...",
  "salary": "40-50/hr",
  "jobType": "internship",
  "description": "...",
  "requirements": "...",
  "status": "SAVED",
  "dateApplied": null,
  "source": "extension"
}
```

**Offline Support:**
- If offline, queue in Chrome storage
- Sync when connection restored
- Show "Pending sync (3)" badge

**Auth Flow:**
- User logs in to web app
- Extension detects login, stores auth token
- Token refreshes automatically
- If token expires, show "Login required" in popup

### 5.2 Email Classification

**Categories:**
| Type | Signals | New Status |
|------|---------|------------|
| REJECTION | "not moving forward", "other candidates" | REJECTED |
| INTERVIEW_REQUEST | "interview", "schedule", "speak with you" | INTERVIEWING |
| OFFER | "offer", "congratulations", "pleased to extend" | OFFER |
| SCREENING_INVITE | "phone screen", "recruiter call" | SCREENING |
| ASSESSMENT_REQUEST | "coding challenge", "take-home" | SCREENING |
| GENERIC_UPDATE | "received", "reviewing" | No change |
| UNRELATED | N/A | No change |

**Classification Prompt:**
```typescript
const CLASSIFICATION_PROMPT = `Classify this job application email.

Categories:
- REJECTION: Company decided not to move forward
- INTERVIEW_REQUEST: Interview invitation (any round)
- OFFER: Job offer extended
- SCREENING_INVITE: Phone screen or recruiter call
- ASSESSMENT_REQUEST: Coding challenge or take-home
- GENERIC_UPDATE: Application received, under review
- UNRELATED: Not job-related

Respond as JSON:
{
  "type": "REJECTION",
  "confidence": 0.95,
  "reasoning": "Contains 'decided to move forward with other candidates'",
  "extractedData": {
    "interviewDate": null,
    "deadline": null
  }
}`;
```

**Confidence Thresholds:**
- `>0.9`: Auto-update status
- `0.7-0.9`: Auto-update + flag for review
- `<0.7`: Don't auto-update, notify user

### 5.2.2 Caching Strategy

```typescript
// Cache classification results by email content hash
async function classifyEmailWithCache(email: ParsedEmail): Promise<Classification> {
  const contentHash = createHash('sha256')
    .update(email.subject + email.body.slice(0, 1000))
    .digest('hex');

  // Check Vercel KV cache first
  const cached = await kv.get(`classification:${contentHash}`);
  if (cached) {
    return JSON.parse(cached as string);
  }

  // Call LLM via Vercel AI SDK
  const { text } = await generateText({
    model: anthropic('claude-3-haiku-20240307'),
    system: CLASSIFICATION_PROMPT,
    prompt: formatEmailForClassification(email),
  });

  const classification = JSON.parse(text);

  // Cache for 30 days
  await kv.set(`classification:${contentHash}`, JSON.stringify(classification), {
    ex: 60 * 60 * 24 * 30
  });

  return classification;
}
```

### 5.2.3 Status Transition Rules

**Valid Transitions:**
```
SAVED → APPLIED → SCREENING → INTERVIEWING → OFFER → ACCEPTED
        ↓         ↓            ↓              ↓
     REJECTED  REJECTED     REJECTED      REJECTED
        ↓         ↓            ↓              ↓
     GHOSTED   GHOSTED      GHOSTED       (none)
```

**Invalid Transitions (require manual override):**
- REJECTED → INTERVIEWING (typo/error likely)
- OFFER → SCREENING (backwards)

### 5.2.4 Ghosting Detection

Auto-mark as GHOSTED if:
- Status is APPLIED or SCREENING
- No email response in 30 days
- User hasn't manually updated

```typescript
// Inngest scheduled function - runs daily
export const detectGhosting = inngest.createFunction(
  { id: 'detect-ghosting' },
  { cron: '0 9 * * *' }, // 9 AM daily
  async ({ step }) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ghostedApps = await step.run('find-ghosted', async () => {
      return supabase
        .from('applications')
        .select('id, user_id')
        .in('status', ['APPLIED', 'SCREENING'])
        .lt('updated_at', thirtyDaysAgo.toISOString());
    });

    for (const app of ghostedApps.data || []) {
      await step.run(`update-${app.id}`, async () => {
        await supabase
          .from('applications')
          .update({ status: 'GHOSTED' })
          .eq('id', app.id);
      });
    }

    return { updated: ghostedApps.data?.length || 0 };
  }
);
```

### 5.2.5 User Override

Users can always override auto-classification:
- Email detail view shows: "Classified as REJECTION by AI (95% confident)"
- User can click "Change to..." → Manual override
- Override saves feedback for future improvement

### 5.3 ATS Company Matching

```typescript
const ATS_PATTERNS: Record<string, (email: Email) => string | null> = {
  'greenhouse.io': (email) => {
    // Subject: "Your application to Stripe"
    const match = email.subject.match(/application to ([\w\s]+)/i);
    return match?.[1]?.trim() || null;
  },

  'lever.co': (email) => {
    // From: "Stripe via Lever"
    const match = email.fromName?.match(/(.+)\s+via\s+Lever/i);
    return match?.[1]?.trim() || null;
  },

  'ashbyhq.com': (email) => {
    // Subject: "Stripe: Application update"
    const match = email.subject.match(/^([\w\s]+):/);
    return match?.[1]?.trim() || null;
  },

  'linkedin.com': (email) => {
    // Subject: "Your application was sent to Stripe"
    const match = email.subject.match(/sent to ([\w\s]+)/i);
    return match?.[1]?.trim() || null;
  },
};

// Main matching function
async function matchEmailToApplication(
  userId: string,
  email: ParsedEmail
): Promise<{ application: Application | null; confidence: number }> {
  const senderDomain = extractDomain(email.from);

  // 1. Check if from ATS provider
  const atsParser = ATS_PATTERNS[senderDomain];
  if (atsParser) {
    const companyName = atsParser(email);
    if (companyName) {
      const app = await findApplicationByCompanyName(userId, companyName);
      if (app) return { application: app, confidence: 0.9 };
    }
  }

  // 2. Direct company domain match
  const directMatch = await findApplicationByEmailDomain(userId, senderDomain);
  if (directMatch) {
    return { application: directMatch, confidence: 0.95 };
  }

  // 3. Company alias lookup (meta.com, facebook.com, fb.com → Meta)
  const aliasMatch = await findApplicationByDomainAlias(userId, senderDomain);
  if (aliasMatch) {
    return { application: aliasMatch, confidence: 0.85 };
  }

  // 4. Fuzzy match on job title in subject
  const titleMatch = await fuzzyMatchBySubject(userId, email.subject);
  if (titleMatch) {
    return { application: titleMatch.application, confidence: titleMatch.score };
  }

  // 5. No match - queue for user review
  await createUnmatchedEmail(userId, email);
  return { application: null, confidence: 0 };
}
```

**Company Aliases (Seed Data):**
```sql
-- Seed data for company domain aliases
INSERT INTO companies (name, domain, domain_aliases) VALUES
  ('Meta', 'meta.com', ARRAY['facebook.com', 'fb.com', 'instagram.com', 'whatsapp.com', 'oculus.com']),
  ('Google', 'google.com', ARRAY['alphabet.com', 'youtube.com', 'waymo.com', 'deepmind.com']),
  ('Amazon', 'amazon.com', ARRAY['aws.amazon.com', 'aboutamazon.com', 'amazonstudios.com']),
  ('Microsoft', 'microsoft.com', ARRAY['linkedin.com', 'github.com', 'azure.com']),
  ('Apple', 'apple.com', ARRAY['icloud.com']),
  ('Netflix', 'netflix.com', ARRAY[]),
  ('Stripe', 'stripe.com', ARRAY[]),
  ('Airbnb', 'airbnb.com', ARRAY[]),
  ('Coinbase', 'coinbase.com', ARRAY[]),
  ('Uber', 'uber.com', ARRAY['ubereats.com']),
  ('Lyft', 'lyft.com', ARRAY[]),
  ('Salesforce', 'salesforce.com', ARRAY['slack.com', 'heroku.com', 'tableau.com']),
  ('Oracle', 'oracle.com', ARRAY[]),
  ('Adobe', 'adobe.com', ARRAY['figma.com']),
  ('Nvidia', 'nvidia.com', ARRAY[]),
  ('Tesla', 'tesla.com', ARRAY['spacex.com'])
;
```

---

## 6. API Specifications

### 6.1 Applications

```typescript
// GET /api/applications
// Query: status[], jobType[], search, page, limit
// Response: { data: Application[], pagination: {...} }

// POST /api/applications
// Body: { jobTitle, companyName, jobUrl?, status?, ... }
// Response: { data: Application }

// GET /api/applications/[id]
// Response: { data: Application & { emails, statusHistory } }

// PUT /api/applications/[id]
// Body: Partial<Application>
// Response: { data: Application }

// DELETE /api/applications/[id]
// Response: { success: true }
```

### 6.2 Email Webhook

```typescript
// POST /api/webhooks/inbound-email
// Content-Type: multipart/form-data (SendGrid format)
// Body: { to, from, subject, text, html }
// Response: { success: true }
```

### 6.3 Email Filter

```typescript
// GET /api/email/filter-string
// Response: { filterString: "*@greenhouse.io OR ...", companyCount: 5 }
```

### 6.4 BYOA Config

```typescript
// POST /api/config/test
// Body: { provider: 'supabase' | 'anthropic', config: {...} }
// Response: { status: 'success' | 'error', message: string }

// POST /api/config/save
// Body: { provider, config }
// Response: { success: true }
```

### 6.4.1 API Settings Page

```
┌─────────────────────────────────────────────────────────┐
│  Settings → API Configuration                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Connected APIs                                         │
│                                                          │
│  ✅ Supabase                                            │
│     xxxxx.supabase.co • Last tested: 2 hours ago        │
│     [Test] [Edit] [Disconnect]                          │
│                                                          │
│  ✅ Anthropic Claude                                    │
│     API Key: sk-ant-***abc • Model: Haiku              │
│     [Test] [Edit] [Disconnect]                          │
│                                                          │
│  📧 Email Forwarding                                    │
│     steve-x7k2m9@inbound.applyflow.com                  │
│     Last email: 3 hours ago                             │
│     [Update Filter] [View Setup Guide]                  │
│                                                          │
│  💰 This Month's Estimated Usage                        │
│     Estimated: $0.08                                    │
│     • Anthropic: $0.05 (87 email classifications)      │
│     • Supabase: $0.00 (Free tier)                      │
│                                                          │
│     [View detailed usage]                               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 6.4.2 API Validation Functions

```typescript
// Supabase validation
async function validateSupabase(url: string, anonKey: string, serviceKey: string) {
  const client = createClient(url, serviceKey);
  
  // 1. Test connection
  const { data, error } = await client.from('applications').select('count').limit(1);
  if (error && error.code !== 'PGRST116') { // Table doesn't exist is OK
    return { status: 'error', message: `Connection failed: ${error.message}` };
  }
  
  // 2. Check if schema exists
  const hasSchema = await checkSchemaExists(client);
  if (!hasSchema) {
    return {
      status: 'warning',
      message: 'Schema not found. Run migrations to create tables.',
      action: 'run_migrations'
    };
  }
  
  return { status: 'success', message: 'Connected to Supabase!' };
}

// Anthropic validation
async function validateAnthropic(apiKey: string) {
  try {
    const anthropic = createAnthropic({ apiKey });
    const { text } = await generateText({
      model: anthropic('claude-3-haiku-20240307'),
      prompt: 'Reply with "ok"',
      maxTokens: 10,
    });
    
    return { status: 'success', message: 'Connected to Anthropic!' };
  } catch (error: any) {
    if (error.status === 401) {
      return { status: 'error', message: 'Invalid API key' };
    }
    if (error.status === 429) {
      return { status: 'error', message: 'Rate limit exceeded. Try again later.' };
    }
    return { status: 'error', message: error.message };
  }
}
```

### 6.4.3 Fallback Behavior

If APIs are unavailable:

| Feature | API Required | Fallback Behavior |
|---------|--------------|-------------------|
| Save application | Supabase | Error: Cannot proceed |
| Email sync | SendGrid | Manual status updates only |
| Email classification | Anthropic/OpenAI | Show unclassified emails, user manually updates |
| Insights/Analysis | Anthropic/OpenAI | Show basic stats only (no LLM patterns) |
| Caching | Vercel KV | Skip cache, slightly slower |

**User Communication (Degraded Mode):**
```
⚠️ Email auto-tracking is currently unavailable
Your LLM API connection failed. Emails will not be auto-classified.

[Reconnect API] [Dismiss]
```

### 6.5 Analysis

```typescript
// POST /api/analysis
// Body: { filters: { timePeriod?, jobType?, status? } }
// Response: { jobId: string, status: 'queued' }

// GET /api/analysis/[id]
// Response: { data: { status, results?, ... } }
```

---

## 6.6 Dashboard & Notifications

### 6.6.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  🏠 Dashboard                             [+ Add Job]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Quick Stats                                            │
│  ┌───────────┬───────────┬───────────┬───────────┐    │
│  │ 157 Total │ 12 Active │ 3 Offers  │ 142 Ghosted│    │
│  └───────────┴───────────┴───────────┴───────────┘    │
│                                                          │
│  📊 [List View] [Kanban View] [Timeline]               │
│                                                          │
│  Filters:                                               │
│  Status: [All ▼] Job Type: [All ▼] Applied: [Last 30d ▼]│
│  Search: [Search companies or roles...           ]     │
│                                                          │
│  Applications (157)                                     │
│  ┌────────────────────────────────────────────────┐   │
│  │ Software Engineer Intern                        │   │
│  │ Ripple • San Francisco, CA                     │   │
│  │ 📅 Applied 1/1/26  •  Status: REJECTED         │   │
│  │ 📧 Last update: 12 hours ago (auto)            │   │
│  └────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────┐   │
│  │ Software Engineer Intern (Summer 2026)         │   │
│  │ Dropbox • Remote in USA                        │   │
│  │ 📅 Applied 12/31/25  •  Status: INTERVIEWING   │   │
│  │ 📧 Last update: 2 days ago (auto)              │   │
│  │ 🗓️ Interview: Jan 5, 2pm                        │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**List View Features:**

Each application card shows:
- Job title, company, location
- Status badge (color-coded)
- Dates (saved, applied, last updated)
- Source indicator (extension, manual)
- Quick actions: View details, Edit, Archive

Sorting options:
- Date applied (newest/oldest)
- Date updated (recently active)
- Company (A-Z)
- Status

### 6.6.2 Notifications

**Real-Time Notifications:**

When status changes:
- In-app notification: "Ripple SWE Intern → REJECTED (email from today)"
- Browser push notification (if enabled)

**Unmatched Email Notification:**
```
┌─────────────────────────────────────────────────────────┐
│  📧 New email couldn't be matched                        │
│                                                          │
│  From: noreply@greenhouse.io                            │
│  Subject: "Your application to Acme Corp"               │
│                                                          │
│  We couldn't find a matching application.               │
│  [Link to Application ▼]  [Create New]  [Dismiss]       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Project Structure

```
applyflow/
├── extension/                    # Chrome Extension (Plasmo) - 17 files
│   ├── src/
│   │   ├── popup.tsx             # Main popup UI with state machine
│   │   ├── background.ts         # Service worker for auth
│   │   ├── style.css             # Tailwind entry
│   │   ├── contents/
│   │   │   ├── linkedin.tsx      # LinkedIn content script
│   │   │   └── greenhouse.tsx    # Greenhouse content script
│   │   ├── components/
│   │   │   ├── LoginPrompt.tsx
│   │   │   ├── JobPreview.tsx
│   │   │   ├── SaveForm.tsx
│   │   │   └── DuplicateAlert.tsx
│   │   └── lib/
│   │       ├── api.ts            # API client with Bearer auth
│   │       ├── auth.ts           # Auth + storage helpers
│   │       └── extractors.ts     # LinkedIn & Greenhouse extraction
│   └── package.json
│
├── src/                          # Next.js App
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── callback/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx          # Applications list
│   │   │   ├── board/
│   │   │   ├── applications/
│   │   │   ├── analysis/
│   │   │   └── settings/
│   │   ├── (onboarding)/
│   │   │   └── setup/
│   │   └── api/
│   │       ├── applications/
│   │       ├── webhooks/
│   │       ├── email/
│   │       ├── config/
│   │       └── analysis/
│   │
│   ├── components/
│   │   ├── ui/                   # shadcn/ui
│   │   ├── applications/
│   │   ├── board/
│   │   └── analysis/
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser client
│   │   │   └── server.ts         # Server client
│   │   ├── email/
│   │   │   ├── matching.ts
│   │   │   └── ats-patterns.ts
│   │   └── llm/
│   │       ├── classify.ts
│   │       └── analyze.ts
│   │
│   ├── inngest/
│   │   ├── client.ts
│   │   └── functions/
│   │       ├── process-email.ts
│   │       └── run-analysis.ts
│   │
│   └── types/
│       └── database.ts           # Generated from Supabase
│
├── supabase/
│   └── migrations/
│
├── .env.local
├── next.config.js
├── package.json
└── README.md
```

---

## 8. Non-Functional Requirements

### 8.1 Performance

| Metric | Target |
|--------|--------|
| Dashboard load | <2s (P95) |
| Extension popup | <500ms |
| Email processing | <5s |
| Analysis generation | <30s |

### 8.2 Security

| Requirement | Implementation |
|-------------|----------------|
| API credentials | AES-256 encryption |
| Auth | Supabase Auth (JWT) |
| Data isolation | Row Level Security |
| Rate limiting | Vercel Edge middleware |

### 8.3 Success Metrics & KPIs

**Acquisition Metrics:**
| Metric | Target |
|--------|--------|
| Signups (6 months) | 10,000 |
| Extension installs | 50% of signups |
| Activation rate | 70% track 10+ apps in 14 days |

**Engagement Metrics:**
| Metric | Target |
|--------|--------|
| DAU/MAU | 30% |
| Avg applications tracked | 50 per user |
| Email sync adoption | 80% of active users |

**Quality Metrics:**
| Metric | Target |
|--------|--------|
| Email classification accuracy | 95%+ |
| False positive rate | <2% |
| User correction rate | <5% |

**Technical Metrics:**
| Metric | Target |
|--------|--------|
| P95 latency | <2s |
| Error rate | <1% |
| Uptime | 99.5% |
| Avg API cost per user | <$0.10/mo |

### 8.4 Costs

| Service | Monthly Cost |
|---------|--------------|
| Vercel Pro | $20 |
| Supabase Free | $0 |
| Vercel KV | $0 (free tier) |
| Inngest | $0 (free tier) |
| SendGrid | ~$15 |
| Sentry | $0 (free tier) |
| **Total** | **~$35/month** |

### 8.5 Environment Variables

```bash
# .env.local

# Supabase (for auth + core app)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Vercel KV (cache)
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# SendGrid
SENDGRID_WEBHOOK_SECRET=

# Encryption
ENCRYPTION_KEY=

# Sentry
SENTRY_DSN=
```

---

## Summary: Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | Supabase only (no Prisma) | Less complexity, built-in types |
| Background Jobs | Inngest | Serverless, zero infrastructure |
| LLM | Vercel AI SDK | Unified API, multi-provider |
| BYOA Config | 2 items only | Minimal user friction |
| Timeline | 10 weeks | Focused MVP scope |
| Email | Forwarding + SendGrid | No Gmail OAuth verification |

---

**End of Unified PRD**