/**
 * Layer 3: Intelligent DOM Extraction
 * Uses semantic HTML patterns and heuristics to extract job data
 * Confidence: 0.7-0.85 depending on field extraction quality
 */

import type { ExtractedJobData, ExtractionResult } from './types'

/**
 * Extract job title using multiple strategies
 */
function extractTitle(): string | undefined {
  // Strategy 1: Look for specific job title classes/IDs
  const titleSelectors = [
    '[class*="job-title"]',
    '[class*="jobtitle"]',
    '[class*="job_title"]',
    '[class*="position-title"]',
    '[id*="job-title"]',
    '[id*="jobtitle"]',
    '[data-testid*="title"]',
    '.job-title',
    '.position-title',
    '#job-title',
    'h1[class*="title"]',
    'h2[class*="title"]'
  ]

  for (const selector of titleSelectors) {
    const el = document.querySelector(selector)
    if (el?.textContent?.trim()) {
      const text = el.textContent.trim()
      // Validate: job titles are usually < 100 chars
      if (text.length > 5 && text.length < 100) {
        return text
      }
    }
  }

  // Strategy 2: First h1 in main content
  const main = document.querySelector('main') ||
               document.querySelector('[role="main"]') ||
               document.querySelector('article')

  if (main) {
    const h1 = main.querySelector('h1')
    if (h1?.textContent?.trim()) {
      const text = h1.textContent.trim()
      if (text.length > 5 && text.length < 100) {
        return text
      }
    }
  }

  // Strategy 3: First h1 on page
  const h1 = document.querySelector('h1')
  if (h1?.textContent?.trim()) {
    const text = h1.textContent.trim()
    if (text.length > 5 && text.length < 100 && !isNavigationText(text)) {
      return text
    }
  }

  // Strategy 4: Document title before separator
  const title = document.title
  const separators = [' | ', ' - ', ' – ', ' — ', ' at ', ' @ ']
  for (const sep of separators) {
    if (title.includes(sep)) {
      const parts = title.split(sep)
      if (parts[0].length > 5 && parts[0].length < 80) {
        return parts[0].trim()
      }
    }
  }

  return undefined
}

/**
 * Extract company name using multiple strategies
 */
function extractCompany(): string | undefined {
  // Strategy 1: Look for specific company classes/IDs
  const companySelectors = [
    '[class*="company-name"]',
    '[class*="companyname"]',
    '[class*="company_name"]',
    '[class*="employer-name"]',
    '[class*="organization"]',
    '[id*="company"]',
    '[data-testid*="company"]',
    '.company-name',
    '.employer-name',
    '#company-name',
    '[itemprop="hiringOrganization"]',
    '[itemprop="name"][class*="company"]'
  ]

  for (const selector of companySelectors) {
    const el = document.querySelector(selector)
    if (el?.textContent?.trim()) {
      const text = cleanCompanyName(el.textContent.trim())
      if (text && text.length > 1 && text.length < 80) {
        return text
      }
    }
  }

  // Strategy 2: Logo alt text
  const logoSelectors = [
    'img[class*="logo"]',
    'img[class*="company"]',
    'img[alt*="logo"]',
    '[class*="logo"] img',
    'header img'
  ]

  for (const selector of logoSelectors) {
    const img = document.querySelector(selector) as HTMLImageElement
    if (img?.alt) {
      const alt = img.alt.replace(/\s*(logo|icon)\s*/gi, '').trim()
      if (alt.length > 1 && alt.length < 50) {
        return alt
      }
    }
  }

  // Strategy 3: From document title after separator
  const title = document.title
  const separators = [' | ', ' - ', ' – ', ' — ', ' at ', ' @ ']
  for (const sep of separators) {
    if (title.includes(sep)) {
      const parts = title.split(sep)
      // Company is usually last part
      const company = parts[parts.length - 1].trim()
      if (company.length > 1 && company.length < 50) {
        // Clean common suffixes
        return company.replace(/\s*(careers?|jobs?|hiring)\s*$/i, '').trim()
      }
    }
  }

  // Strategy 4: Meta site name
  const siteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')
  if (siteName && siteName.length > 1 && siteName.length < 50) {
    return siteName
  }

  // Strategy 5: Domain name fallback
  const hostname = window.location.hostname
    .replace(/^(www\.|boards\.|jobs\.|careers?\.)/, '')
    .replace(/\.(com|io|co|org|net)$/, '')

  if (hostname.length > 2) {
    // Capitalize first letter
    return hostname.charAt(0).toUpperCase() + hostname.slice(1)
  }

  return undefined
}

/**
 * Extract location using multiple strategies
 */
function extractLocation(): string | undefined {
  // Strategy 1: Location-specific classes
  const locationSelectors = [
    '[class*="job-location"]',
    '[class*="joblocation"]',
    '[class*="job_location"]',
    '[class*="location-text"]',
    '[id*="location"]',
    '[data-testid*="location"]',
    '.job-location',
    '.location',
    '[itemprop="jobLocation"]',
    '[itemprop="addressLocality"]'
  ]

  for (const selector of locationSelectors) {
    const el = document.querySelector(selector)
    if (el?.textContent?.trim()) {
      const text = cleanLocation(el.textContent.trim())
      if (text && text.length > 2 && text.length < 100) {
        return text
      }
    }
  }

  // Strategy 2: Look for location patterns in text near title
  const main = document.querySelector('main') ||
               document.querySelector('[role="main"]') ||
               document.body

  const locationPattern = /(?:(?:Location|Based in|Office):\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}(?:\s+\d{5})?|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g

  const mainText = main.textContent || ''
  const matches = mainText.match(locationPattern)

  if (matches && matches.length > 0) {
    const location = matches[0].replace(/^(Location|Based in|Office):\s*/i, '').trim()
    if (location.length > 3 && location.length < 80) {
      return location
    }
  }

  // Strategy 3: Check for Remote indicator
  const pageText = document.body.textContent?.toLowerCase() || ''
  if (pageText.includes('remote') || pageText.includes('work from home')) {
    // Check if explicitly says "Remote" as location
    const remoteSelectors = [
      '[class*="location"]',
      '[class*="where"]'
    ]

    for (const selector of remoteSelectors) {
      const el = document.querySelector(selector)
      if (el?.textContent?.toLowerCase().includes('remote')) {
        return 'Remote'
      }
    }
  }

  return undefined
}

/**
 * Extract salary information
 */
function extractSalary(): { min?: number; max?: number; currency?: string } | undefined {
  // Strategy 1: Salary-specific elements
  const salarySelectors = [
    '[class*="salary"]',
    '[class*="compensation"]',
    '[class*="pay"]',
    '[id*="salary"]',
    '[data-testid*="salary"]',
    '[itemprop="baseSalary"]'
  ]

  let salaryText = ''

  for (const selector of salarySelectors) {
    const el = document.querySelector(selector)
    if (el?.textContent) {
      salaryText = el.textContent
      break
    }
  }

  // Strategy 2: Search for salary patterns in page text
  if (!salaryText) {
    const pageText = document.body.textContent || ''
    // Pattern: $XXX,XXX - $XXX,XXX or $XXX,XXX/year
    const salaryPattern = /\$[\d,]+(?:\s*[-–—to]\s*\$[\d,]+)?(?:\s*(?:per\s+)?(?:year|yr|annual|month|mo|hour|hr))?/gi
    const matches = pageText.match(salaryPattern)
    if (matches && matches.length > 0) {
      salaryText = matches[0]
    }
  }

  if (!salaryText) return undefined

  // Parse salary text
  const result: { min?: number; max?: number; currency?: string } = {}

  // Extract currency
  if (salaryText.includes('$') || salaryText.toLowerCase().includes('usd')) {
    result.currency = 'USD'
  } else if (salaryText.includes('€') || salaryText.toLowerCase().includes('eur')) {
    result.currency = 'EUR'
  } else if (salaryText.includes('£') || salaryText.toLowerCase().includes('gbp')) {
    result.currency = 'GBP'
  }

  // Extract numbers
  const numbers = salaryText.match(/[\d,]+/g)
  if (numbers && numbers.length > 0) {
    const values = numbers.map(n => parseInt(n.replace(/,/g, ''), 10)).filter(n => n > 1000)

    if (values.length >= 2) {
      result.min = Math.min(...values)
      result.max = Math.max(...values)
    } else if (values.length === 1) {
      result.min = values[0]
      result.max = values[0]
    }

    // Adjust for hourly rates
    if (salaryText.toLowerCase().includes('hour') && result.min && result.min < 1000) {
      result.min *= 2080 // Convert to annual
      if (result.max) result.max *= 2080
    }
  }

  return (result.min || result.max) ? result : undefined
}

/**
 * Extract job type (full-time, part-time, etc.)
 */
function extractJobType(): ExtractedJobData['jobType'] | undefined {
  const pageText = document.body.textContent?.toLowerCase() || ''

  // Look for specific job type elements first
  const typeSelectors = [
    '[class*="job-type"]',
    '[class*="employment-type"]',
    '[class*="worktype"]',
    '[itemprop="employmentType"]'
  ]

  let typeText = ''
  for (const selector of typeSelectors) {
    const el = document.querySelector(selector)
    if (el?.textContent) {
      typeText = el.textContent.toLowerCase()
      break
    }
  }

  // Combine with page text for pattern matching
  const combinedText = typeText + ' ' + pageText.slice(0, 2000)

  // Check patterns (order matters - more specific first)
  if (combinedText.includes('intern')) return 'internship'
  if (combinedText.includes('full-time') || combinedText.includes('full time') || combinedText.includes('fulltime')) return 'full_time'
  if (combinedText.includes('part-time') || combinedText.includes('part time') || combinedText.includes('parttime')) return 'part_time'
  if (combinedText.includes('contract') || combinedText.includes('contractor') || combinedText.includes('freelance')) return 'contract'

  return undefined
}

/**
 * Extract location type (remote, hybrid, onsite)
 */
function extractLocationType(): ExtractedJobData['locationType'] | undefined {
  const pageText = document.body.textContent?.toLowerCase() || ''

  // Look for specific indicators
  if (pageText.includes('fully remote') || pageText.includes('100% remote') || pageText.includes('work from anywhere')) {
    return 'remote'
  }

  if (pageText.includes('hybrid') || pageText.includes('flexible') || pageText.includes('part remote')) {
    return 'hybrid'
  }

  // Check for explicit remote mentions
  const remoteCount = (pageText.match(/\bremote\b/g) || []).length
  const onsiteCount = (pageText.match(/\b(onsite|on-site|in-office|in office)\b/g) || []).length

  if (remoteCount > 3 && remoteCount > onsiteCount) return 'remote'
  if (onsiteCount > 1) return 'onsite'

  return undefined
}

/**
 * Extract job description
 */
function extractDescription(): string | undefined {
  // Strategy 1: Look for description sections
  const descSelectors = [
    '[class*="job-description"]',
    '[class*="jobdescription"]',
    '[class*="job_description"]',
    '[id*="job-description"]',
    '[id*="description"]',
    '[itemprop="description"]',
    '.job-description',
    '.description',
    'article',
    '[class*="content"]'
  ]

  for (const selector of descSelectors) {
    const el = document.querySelector(selector)
    if (el) {
      const text = el.textContent?.trim() || ''
      // Description should be substantial
      if (text.length > 200 && text.length < 20000) {
        return truncateDescription(text)
      }
    }
  }

  // Strategy 2: Main content area
  const main = document.querySelector('main') ||
               document.querySelector('[role="main"]')

  if (main) {
    const text = main.textContent?.trim() || ''
    if (text.length > 200) {
      return truncateDescription(text)
    }
  }

  return undefined
}

/**
 * Helper: Check if text is navigation/boilerplate
 */
function isNavigationText(text: string): boolean {
  const navPatterns = [
    /^(home|careers?|jobs?|about|contact|login|sign ?in|menu)$/i,
    /^(back|next|previous|search)$/i
  ]
  return navPatterns.some(p => p.test(text))
}

/**
 * Helper: Clean company name
 */
function cleanCompanyName(name: string): string {
  return name
    .replace(/\s*[-|·]\s*(careers?|jobs?|hiring|apply).*$/i, '')
    .replace(/\s*(inc\.?|llc|ltd|corp\.?)$/i, '')
    .trim()
}

/**
 * Helper: Clean location text
 */
function cleanLocation(loc: string): string {
  return loc
    .replace(/^(Location|Based in|Office|Work location):\s*/i, '')
    .replace(/\s*\(.*\)$/, '')
    .trim()
}

/**
 * Helper: Truncate description to reasonable length
 */
function truncateDescription(text: string): string {
  const maxLength = 5000
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Calculate confidence based on extracted fields
 */
function calculateConfidence(data: Partial<ExtractedJobData>): number {
  let score = 0.6 // Base confidence for DOM extraction

  // Core fields boost confidence
  if (data.jobTitle) score += 0.1
  if (data.companyName) score += 0.1
  if (data.location) score += 0.05
  if (data.salaryMin || data.salaryMax) score += 0.05
  if (data.jobType) score += 0.05
  if (data.description) score += 0.05

  return Math.min(score, 0.85)
}

/**
 * Main DOM extraction function
 */
export function extractFromDom(): ExtractionResult | null {
  const data: Partial<ExtractedJobData> = {}
  const fieldsExtracted: string[] = []

  // Extract each field
  const title = extractTitle()
  if (title) {
    data.jobTitle = title
    fieldsExtracted.push('jobTitle')
  }

  const company = extractCompany()
  if (company) {
    data.companyName = company
    fieldsExtracted.push('companyName')
  }

  const location = extractLocation()
  if (location) {
    data.location = location
    fieldsExtracted.push('location')
  }

  const salary = extractSalary()
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

  const jobType = extractJobType()
  if (jobType) {
    data.jobType = jobType
    fieldsExtracted.push('jobType')
  }

  const locationType = extractLocationType()
  if (locationType) {
    data.locationType = locationType
    fieldsExtracted.push('locationType')
  }

  const description = extractDescription()
  if (description) {
    data.description = description
    fieldsExtracted.push('description')
  }

  // Always include URL
  data.jobUrl = window.location.href
  fieldsExtracted.push('jobUrl')

  // Only return if we got meaningful data
  if (!data.jobTitle && !data.companyName) {
    return null
  }

  return {
    data,
    confidence: calculateConfidence(data),
    source: 'dom',
    fieldsExtracted
  }
}
