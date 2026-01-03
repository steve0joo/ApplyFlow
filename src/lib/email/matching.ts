import type { SupabaseClient } from '@supabase/supabase-js'
import { extractCompanyFromATS, extractDomain, normalizeCompanyName, type ParsedEmail } from './ats-patterns'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>

export interface MatchResult {
  applicationId: string | null
  companyName: string | null
  confidence: number
  matchType: 'ats' | 'domain' | 'fuzzy' | 'none'
}

/**
 * Match an email to an application for a user
 */
export async function matchEmailToApplication(
  supabase: AnySupabaseClient,
  userId: string,
  email: ParsedEmail
): Promise<MatchResult> {
  // 1. Try ATS pattern extraction first
  const atsCompany = extractCompanyFromATS(email)
  if (atsCompany) {
    const match = await findApplicationByCompanyName(supabase, userId, atsCompany)
    if (match) {
      return {
        applicationId: match.id,
        companyName: atsCompany,
        confidence: 0.9,
        matchType: 'ats',
      }
    }
  }

  // 2. Try direct domain match
  const senderDomain = extractDomain(email.from)
  const domainMatch = await findApplicationByDomain(supabase, userId, senderDomain)
  if (domainMatch) {
    return {
      applicationId: domainMatch.id,
      companyName: domainMatch.company_name,
      confidence: 0.95,
      matchType: 'domain',
    }
  }

  // 3. Try extracting company from subject/body and fuzzy match
  const extractedCompany = extractCompanyFromSubject(email.subject)
  if (extractedCompany) {
    const fuzzyMatch = await findApplicationByCompanyName(supabase, userId, extractedCompany)
    if (fuzzyMatch) {
      return {
        applicationId: fuzzyMatch.id,
        companyName: extractedCompany,
        confidence: 0.7,
        matchType: 'fuzzy',
      }
    }
  }

  // 4. No match found
  return {
    applicationId: null,
    companyName: atsCompany || extractedCompany || null,
    confidence: 0,
    matchType: 'none',
  }
}

/**
 * Find application by company name (case-insensitive)
 */
async function findApplicationByCompanyName(
  supabase: AnySupabaseClient,
  userId: string,
  companyName: string
): Promise<{ id: string; company_name: string } | null> {
  const normalized = normalizeCompanyName(companyName)

  // Try exact match first
  const { data: exactMatch } = await supabase
    .from('applications')
    .select('id, company_name')
    .eq('user_id', userId)
    .ilike('company_name', companyName)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (exactMatch) return exactMatch

  // Try partial match
  const { data: partialMatch } = await supabase
    .from('applications')
    .select('id, company_name')
    .eq('user_id', userId)
    .ilike('company_name', `%${normalized}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return partialMatch || null
}

/**
 * Find application by sender domain (e.g., stripe.com -> Stripe)
 */
async function findApplicationByDomain(
  supabase: AnySupabaseClient,
  userId: string,
  domain: string
): Promise<{ id: string; company_name: string } | null> {
  // Skip common ATS domains
  const atsDomains = ['greenhouse.io', 'lever.co', 'ashbyhq.com', 'jobvite.com', 'workday.com', 'icims.com']
  if (atsDomains.some((ats) => domain.includes(ats))) {
    return null
  }

  // Extract company name from domain (e.g., careers.stripe.com -> stripe)
  const parts = domain.split('.')
  let companySlug = parts.length >= 2 ? parts[parts.length - 2] : parts[0]

  // Handle subdomains like careers.stripe.com
  if (['careers', 'jobs', 'recruiting', 'talent', 'hr'].includes(parts[0]) && parts.length >= 3) {
    companySlug = parts[parts.length - 2]
  }

  const { data } = await supabase
    .from('applications')
    .select('id, company_name')
    .eq('user_id', userId)
    .ilike('company_name', `%${companySlug}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data || null
}

/**
 * Try to extract company name from email subject
 */
function extractCompanyFromSubject(subject: string): string | null {
  // Common patterns
  const patterns = [
    /(?:from|at|with)\s+(.+?)(?:\s*[-–:]|$)/i,
    /^(.+?)(?:\s*[-–:])\s*(?:application|interview|offer)/i,
    /(?:application|interview|offer).*(?:at|with|from)\s+(.+?)(?:\s*[-–]|$)/i,
  ]

  for (const pattern of patterns) {
    const match = subject.match(pattern)
    if (match && match[1]) {
      const company = match[1].trim()
      // Filter out common false positives
      if (company.length > 2 && company.length < 50 && !company.match(/^(your|the|a|an)$/i)) {
        return company
      }
    }
  }

  return null
}

/**
 * Get suggested applications for an unmatched email
 */
export async function getSuggestedApplications(
  supabase: AnySupabaseClient,
  userId: string,
  email: ParsedEmail,
  limit: number = 5
): Promise<Array<{ id: string; company_name: string; job_title: string }>> {
  // Get recent applications that might match
  const { data } = await supabase
    .from('applications')
    .select('id, company_name, job_title')
    .eq('user_id', userId)
    .in('status', ['APPLIED', 'SCREENING', 'INTERVIEWING'])
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}
