/**
 * ATS (Applicant Tracking System) patterns for extracting company names from emails
 */

export interface ParsedEmail {
  from: string
  fromName?: string
  subject: string
  body: string
  receivedAt: Date
}

type ATSPattern = (email: ParsedEmail) => string | null

// Known ATS provider patterns
const ATS_PATTERNS: Record<string, ATSPattern> = {
  'greenhouse.io': (email) => {
    // Subject: "Your application to Stripe" or "Thank you for applying to Stripe"
    const subjectMatch = email.subject.match(/(?:application to|applying to|applied to)\s+(.+?)(?:\s*[-–]|$)/i)
    if (subjectMatch) return subjectMatch[1].trim()

    // Body: "Thank you for your interest in Stripe"
    const bodyMatch = email.body.match(/interest in\s+(.+?)(?:\.|\s+and)/i)
    if (bodyMatch) return bodyMatch[1].trim()

    return null
  },

  'lever.co': (email) => {
    // From: "Stripe via Lever" or "Stripe Recruiting via Lever"
    const fromMatch = email.fromName?.match(/(.+?)\s+(?:via|through)\s+Lever/i)
    if (fromMatch) return fromMatch[1].trim()

    // Subject: "Stripe - Software Engineer Application"
    const subjectMatch = email.subject.match(/^(.+?)\s*[-–]\s*.+application/i)
    if (subjectMatch) return subjectMatch[1].trim()

    return null
  },

  'ashbyhq.com': (email) => {
    // Subject: "Stripe: Application update" or "Stripe: Your application"
    const subjectMatch = email.subject.match(/^(.+?):\s*.+(?:application|update)/i)
    if (subjectMatch) return subjectMatch[1].trim()

    return null
  },

  'jobvite.com': (email) => {
    // Subject: "Your Application with Stripe"
    const subjectMatch = email.subject.match(/application\s+(?:with|to|at)\s+(.+?)(?:\s*[-–]|$)/i)
    if (subjectMatch) return subjectMatch[1].trim()

    return null
  },

  'workday.com': (email) => {
    // Subject: "Stripe: Your Application Status"
    const subjectMatch = email.subject.match(/^(.+?):\s*your\s+application/i)
    if (subjectMatch) return subjectMatch[1].trim()

    return null
  },

  'myworkdayjobs.com': (email) => {
    // Similar to workday.com
    const subjectMatch = email.subject.match(/^(.+?):\s*your\s+application/i)
    if (subjectMatch) return subjectMatch[1].trim()

    return null
  },

  'icims.com': (email) => {
    // Subject: "Thank you for applying to Stripe"
    const subjectMatch = email.subject.match(/applying\s+to\s+(.+?)(?:\s*[-–]|$)/i)
    if (subjectMatch) return subjectMatch[1].trim()

    return null
  },

  'smartrecruiters.com': (email) => {
    // Subject: "Your application at Stripe"
    const subjectMatch = email.subject.match(/application\s+at\s+(.+?)(?:\s*[-–]|$)/i)
    if (subjectMatch) return subjectMatch[1].trim()

    return null
  },

  'linkedin.com': (email) => {
    // Subject: "Your application was sent to Stripe" or "You applied to Stripe"
    const subjectMatch = email.subject.match(/(?:sent to|applied to|application.*to)\s+(.+?)(?:\s*[-–]|$)/i)
    if (subjectMatch) return subjectMatch[1].trim()

    return null
  },
}

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string {
  const match = email.match(/@([^@]+)$/)
  return match ? match[1].toLowerCase() : ''
}

/**
 * Check if email is from a known ATS provider
 */
export function isATSEmail(email: ParsedEmail): boolean {
  const domain = extractDomain(email.from)
  return Object.keys(ATS_PATTERNS).some((ats) => domain.includes(ats))
}

/**
 * Extract company name from ATS email
 */
export function extractCompanyFromATS(email: ParsedEmail): string | null {
  const domain = extractDomain(email.from)

  for (const [atsDomain, parser] of Object.entries(ATS_PATTERNS)) {
    if (domain.includes(atsDomain)) {
      const company = parser(email)
      if (company) return company
    }
  }

  return null
}

/**
 * Normalize company name for comparison
 */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,.]|inc|llc|corp|corporation|ltd|limited|co\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}
