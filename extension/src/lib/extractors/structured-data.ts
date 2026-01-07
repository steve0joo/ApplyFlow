/**
 * Layer 1: Structured Data Extraction
 * Extracts job data from JSON-LD Schema.org and OpenGraph meta tags
 * Highest confidence (0.95) when successful
 */

import type { ExtractedJobData, ExtractionResult } from './types'

/**
 * Extract job data from JSON-LD Schema.org markup
 * Most job boards embed JobPosting schema for SEO
 */
export function extractJsonLd(): ExtractionResult | null {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]')

  for (const script of scripts) {
    try {
      const content = script.textContent
      if (!content) continue

      const parsed = JSON.parse(content)
      const jobPosting = findJobPosting(parsed)

      if (jobPosting) {
        return parseJobPosting(jobPosting)
      }
    } catch {
      // Invalid JSON, continue to next script
      continue
    }
  }

  return null
}

/**
 * Recursively find JobPosting in JSON-LD (could be nested in @graph)
 */
function findJobPosting(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null

  const obj = data as Record<string, unknown>

  // Direct JobPosting
  if (obj['@type'] === 'JobPosting') {
    return obj
  }

  // Check @graph array
  if (Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph']) {
      const found = findJobPosting(item)
      if (found) return found
    }
  }

  // Check arrays (some sites use array at root)
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findJobPosting(item)
      if (found) return found
    }
  }

  return null
}

/**
 * Parse Schema.org JobPosting into our format
 */
function parseJobPosting(job: Record<string, unknown>): ExtractionResult {
  const data: Partial<ExtractedJobData> = {}
  const fieldsExtracted: string[] = []

  // Job Title
  if (job.title && typeof job.title === 'string') {
    data.jobTitle = job.title.trim()
    fieldsExtracted.push('jobTitle')
  }

  // Company Name
  const hiringOrg = job.hiringOrganization as Record<string, unknown> | undefined
  if (hiringOrg?.name && typeof hiringOrg.name === 'string') {
    data.companyName = hiringOrg.name.trim()
    fieldsExtracted.push('companyName')
  }

  // Location
  const location = extractLocation(job.jobLocation)
  if (location) {
    data.location = location
    fieldsExtracted.push('location')
  }

  // Salary
  const salary = extractSalary(job.baseSalary)
  if (salary) {
    if (salary.min !== undefined) {
      data.salaryMin = salary.min
      fieldsExtracted.push('salaryMin')
    }
    if (salary.max !== undefined) {
      data.salaryMax = salary.max
      fieldsExtracted.push('salaryMax')
    }
    if (salary.currency) {
      data.salaryCurrency = salary.currency
      fieldsExtracted.push('salaryCurrency')
    }
  }

  // Employment Type
  const employmentType = extractEmploymentType(job.employmentType)
  if (employmentType) {
    data.jobType = employmentType
    fieldsExtracted.push('jobType')
  }

  // Job Location Type (remote/hybrid/onsite)
  const locationType = extractLocationType(job)
  if (locationType) {
    data.locationType = locationType
    fieldsExtracted.push('locationType')
  }

  // Description
  if (job.description && typeof job.description === 'string') {
    data.description = cleanHtml(job.description)
    fieldsExtracted.push('description')
  }

  // Posted Date
  if (job.datePosted && typeof job.datePosted === 'string') {
    data.postedDate = job.datePosted
    fieldsExtracted.push('postedDate')
  }

  // Application Deadline
  if (job.validThrough && typeof job.validThrough === 'string') {
    data.applicationDeadline = job.validThrough
    fieldsExtracted.push('applicationDeadline')
  }

  // URL
  data.jobUrl = window.location.href
  fieldsExtracted.push('jobUrl')

  return {
    data,
    confidence: 0.95,
    source: 'json-ld',
    fieldsExtracted
  }
}

/**
 * Extract location from Schema.org jobLocation
 */
function extractLocation(jobLocation: unknown): string | undefined {
  if (!jobLocation) return undefined

  // Single location object
  if (typeof jobLocation === 'object' && !Array.isArray(jobLocation)) {
    return parseLocationObject(jobLocation as Record<string, unknown>)
  }

  // Array of locations
  if (Array.isArray(jobLocation) && jobLocation.length > 0) {
    const locations = jobLocation
      .map(loc => parseLocationObject(loc as Record<string, unknown>))
      .filter(Boolean)
    return locations.join('; ') || undefined
  }

  return undefined
}

function parseLocationObject(loc: Record<string, unknown>): string | undefined {
  // Place type with address
  if (loc.address) {
    const addr = loc.address as Record<string, unknown>
    const parts: string[] = []

    if (addr.addressLocality) parts.push(String(addr.addressLocality))
    if (addr.addressRegion) parts.push(String(addr.addressRegion))
    if (addr.addressCountry) {
      const country = typeof addr.addressCountry === 'object'
        ? (addr.addressCountry as Record<string, unknown>).name
        : addr.addressCountry
      if (country) parts.push(String(country))
    }

    return parts.join(', ') || undefined
  }

  // Direct name
  if (loc.name && typeof loc.name === 'string') {
    return loc.name
  }

  return undefined
}

/**
 * Extract salary from Schema.org baseSalary
 */
function extractSalary(baseSalary: unknown): { min?: number; max?: number; currency?: string } | undefined {
  if (!baseSalary || typeof baseSalary !== 'object') return undefined

  const salary = baseSalary as Record<string, unknown>
  const result: { min?: number; max?: number; currency?: string } = {}

  // MonetaryAmount type
  if (salary.value) {
    const value = salary.value as Record<string, unknown>

    if (typeof value === 'number') {
      result.min = value
      result.max = value
    } else if (typeof value === 'object') {
      if (value.minValue !== undefined) result.min = Number(value.minValue)
      if (value.maxValue !== undefined) result.max = Number(value.maxValue)
      if (value.value !== undefined) {
        result.min = Number(value.value)
        result.max = Number(value.value)
      }
    }
  }

  // Direct min/max values
  if (salary.minValue !== undefined) result.min = Number(salary.minValue)
  if (salary.maxValue !== undefined) result.max = Number(salary.maxValue)

  // Currency
  if (salary.currency && typeof salary.currency === 'string') {
    result.currency = salary.currency
  }

  return (result.min !== undefined || result.max !== undefined) ? result : undefined
}

/**
 * Map Schema.org employmentType to our job types
 */
function extractEmploymentType(employmentType: unknown): ExtractedJobData['jobType'] | undefined {
  if (!employmentType) return undefined

  const type = Array.isArray(employmentType)
    ? employmentType[0]
    : employmentType

  if (typeof type !== 'string') return undefined

  const normalized = type.toUpperCase().replace(/[_-]/g, '')

  if (normalized.includes('INTERN')) return 'internship'
  if (normalized.includes('FULLTIME') || normalized === 'FULL TIME') return 'full_time'
  if (normalized.includes('PARTTIME') || normalized === 'PART TIME') return 'part_time'
  if (normalized.includes('CONTRACT') || normalized.includes('TEMPORARY')) return 'contract'

  return undefined
}

/**
 * Determine if job is remote/hybrid/onsite
 */
function extractLocationType(job: Record<string, unknown>): ExtractedJobData['locationType'] | undefined {
  // Check jobLocationType (Schema.org 2020+)
  const locationType = job.jobLocationType as string | undefined
  if (locationType) {
    const normalized = locationType.toUpperCase()
    if (normalized.includes('REMOTE') || normalized === 'TELECOMMUTE') return 'remote'
  }

  // Check applicantLocationRequirements for remote jobs
  if (job.applicantLocationRequirements) return 'remote'

  // Check title/description hints
  const title = (job.title as string) || ''
  const desc = (job.description as string) || ''
  const combined = `${title} ${desc}`.toLowerCase()

  if (combined.includes('fully remote') || combined.includes('100% remote')) return 'remote'
  if (combined.includes('hybrid')) return 'hybrid'

  // If has physical location, assume onsite
  if (job.jobLocation) return 'onsite'

  return undefined
}

/**
 * Extract job data from OpenGraph meta tags
 * Lower confidence (0.7) as OG tags are less structured
 */
export function extractOpenGraph(): ExtractionResult | null {
  const data: Partial<ExtractedJobData> = {}
  const fieldsExtracted: string[] = []

  // Get all meta tags
  const getMeta = (property: string): string | null => {
    const tag = document.querySelector(`meta[property="${property}"]`) ||
                document.querySelector(`meta[name="${property}"]`)
    return tag?.getAttribute('content') || null
  }

  // Title
  const ogTitle = getMeta('og:title')
  if (ogTitle) {
    // Often format: "Job Title at Company Name"
    const titleMatch = ogTitle.match(/^(.+?)\s+(?:at|@|-|–|—|\|)\s+(.+)$/i)
    if (titleMatch) {
      data.jobTitle = titleMatch[1].trim()
      data.companyName = titleMatch[2].trim()
      fieldsExtracted.push('jobTitle', 'companyName')
    } else {
      data.jobTitle = ogTitle.trim()
      fieldsExtracted.push('jobTitle')
    }
  }

  // Site name as fallback company
  if (!data.companyName) {
    const siteName = getMeta('og:site_name')
    if (siteName) {
      data.companyName = siteName.trim()
      fieldsExtracted.push('companyName')
    }
  }

  // Description
  const ogDesc = getMeta('og:description')
  if (ogDesc) {
    data.description = ogDesc.trim()
    fieldsExtracted.push('description')
  }

  // URL
  data.jobUrl = getMeta('og:url') || window.location.href
  fieldsExtracted.push('jobUrl')

  // Only return if we got meaningful data
  if (fieldsExtracted.length <= 1) {
    return null
  }

  return {
    data,
    confidence: 0.7,
    source: 'opengraph',
    fieldsExtracted
  }
}

/**
 * Clean HTML from description strings
 */
function cleanHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent?.trim() || html
}

/**
 * Main structured data extraction function
 * Tries JSON-LD first (higher confidence), then OpenGraph
 */
export function extractStructuredData(): ExtractionResult | null {
  // Try JSON-LD first (highest quality)
  const jsonLdResult = extractJsonLd()
  if (jsonLdResult && jsonLdResult.fieldsExtracted.length >= 2) {
    return jsonLdResult
  }

  // Fall back to OpenGraph
  const ogResult = extractOpenGraph()
  if (ogResult) {
    return ogResult
  }

  // Return partial JSON-LD if we got anything
  return jsonLdResult
}
