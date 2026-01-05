import type { ExtractedJob } from './api'

// Shared utilities
function getTextContent(selector: string): string | null {
  const element = document.querySelector(selector)
  return element?.textContent?.trim() || null
}

function parseLocationType(location: string | null): 'remote' | 'hybrid' | 'onsite' | undefined {
  if (!location) return undefined
  const lower = location.toLowerCase()
  if (lower.includes('remote')) return 'remote'
  if (lower.includes('hybrid')) return 'hybrid'
  if (lower.includes('on-site') || lower.includes('onsite')) return 'onsite'
  return undefined
}

function parseJobType(title: string, description: string | null): 'internship' | 'full_time' | 'part_time' | 'contract' | undefined {
  const text = `${title} ${description || ''}`.toLowerCase()
  if (text.includes('intern')) return 'internship'
  if (text.includes('contract') || text.includes('contractor')) return 'contract'
  if (text.includes('part-time') || text.includes('part time')) return 'part_time'
  return 'full_time'
}

function parseSalary(text: string | null): { min?: number; max?: number } {
  if (!text) return {}
  const rangeMatch = text.match(/\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/)
  if (rangeMatch) {
    let min = parseInt(rangeMatch[1].replace(/,/g, ''))
    let max = parseInt(rangeMatch[2].replace(/,/g, ''))
    if (text.toLowerCase().includes('/hr') || text.toLowerCase().includes('hour')) {
      min *= 2080
      max *= 2080
    }
    return { min, max }
  }
  const singleMatch = text.match(/\$?([\d,]+)k?/i)
  if (singleMatch) {
    let value = parseInt(singleMatch[1].replace(/,/g, ''))
    if (text.toLowerCase().includes('k')) value *= 1000
    return { min: value, max: value }
  }
  return {}
}

// LinkedIn extractor
const LINKEDIN_SELECTORS = {
  title: '.job-details-jobs-unified-top-card__job-title',
  company: '.job-details-jobs-unified-top-card__company-name',
  location: '.job-details-jobs-unified-top-card__bullet',
  description: '.jobs-description__content',
  salary: '.job-details-jobs-unified-top-card__salary-info',
  titleAlt: '.jobs-unified-top-card__job-title',
  companyAlt: '.jobs-unified-top-card__company-name',
  locationAlt: '.jobs-unified-top-card__bullet',
  descriptionAlt: '.jobs-box__html-content',
}

export function isLinkedInJobPage(): boolean {
  return window.location.href.includes('linkedin.com/jobs/view/')
}

export function extractLinkedInJob(): ExtractedJob | null {
  const title = getTextContent(LINKEDIN_SELECTORS.title) || getTextContent(LINKEDIN_SELECTORS.titleAlt)
  const company = getTextContent(LINKEDIN_SELECTORS.company) || getTextContent(LINKEDIN_SELECTORS.companyAlt)
  if (!title || !company) return null

  const location = getTextContent(LINKEDIN_SELECTORS.location) || getTextContent(LINKEDIN_SELECTORS.locationAlt)
  const description = getTextContent(LINKEDIN_SELECTORS.description) || getTextContent(LINKEDIN_SELECTORS.descriptionAlt)
  const salary = parseSalary(getTextContent(LINKEDIN_SELECTORS.salary))
  const match = window.location.href.match(/linkedin\.com\/jobs\/view\/(\d+)/)
  const jobUrl = match ? `https://www.linkedin.com/jobs/view/${match[1]}` : window.location.href.split('?')[0]

  return {
    jobTitle: title.trim(),
    companyName: company.trim(),
    jobUrl,
    location: location?.trim(),
    locationType: parseLocationType(location),
    salaryMin: salary.min,
    salaryMax: salary.max,
    jobType: parseJobType(title, description),
    description: description?.substring(0, 5000),
  }
}

// Greenhouse extractor
const GREENHOUSE_SELECTORS = {
  title: '.app-title',
  company: '.company-name',
  location: '.location',
  description: '#content',
  titleAlt: 'h1.job-title',
  companyAlt: '.company-header',
  locationAlt: '.job-location',
  descriptionAlt: '.job-description',
}

export function isGreenhouseJobPage(): boolean {
  const url = window.location.href
  return (url.includes('boards.greenhouse.io/') && url.includes('/jobs/')) || url.includes('jobs.greenhouse.io/')
}

export function extractGreenhouseJob(): ExtractedJob | null {
  const title = getTextContent(GREENHOUSE_SELECTORS.title) || getTextContent(GREENHOUSE_SELECTORS.titleAlt)
  let company = getTextContent(GREENHOUSE_SELECTORS.company) || getTextContent(GREENHOUSE_SELECTORS.companyAlt)

  if (!company) {
    const match = window.location.href.match(/boards\.greenhouse\.io\/([^/]+)\/jobs/)
    if (match) {
      company = match[1].split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }
  }

  if (!title || !company) return null

  const location = getTextContent(GREENHOUSE_SELECTORS.location) || getTextContent(GREENHOUSE_SELECTORS.locationAlt)
  const description = getTextContent(GREENHOUSE_SELECTORS.description) || getTextContent(GREENHOUSE_SELECTORS.descriptionAlt)

  return {
    jobTitle: title.trim(),
    companyName: company.trim(),
    jobUrl: window.location.href.split('?')[0].split('#')[0],
    location: location?.trim(),
    locationType: parseLocationType(location),
    jobType: parseJobType(title, description),
    description: description?.substring(0, 5000),
  }
}

// Indeed extractor
const INDEED_SELECTORS = {
  title: '.jobsearch-JobInfoHeader-title',
  company: '[data-testid="inlineHeader-companyName"]',
  location: '[data-testid="inlineHeader-companyLocation"]',
  description: '#jobDescriptionText',
  salary: '[data-testid="jobsearch-JobInfoHeader-compactSalary"]',
  titleAlt: 'h1.jobTitle',
  companyAlt: '.jobsearch-InlineCompanyRating-companyHeader a',
  locationAlt: '.jobsearch-JobInfoHeader-subtitle > div:last-child',
  salaryAlt: '.jobsearch-JobMetadataHeader-item',
}

export function isIndeedJobPage(): boolean {
  const url = window.location.href
  return url.includes('indeed.com') && (url.includes('/viewjob') || url.includes('/jobs'))
}

export function extractIndeedJob(): ExtractedJob | null {
  const title = getTextContent(INDEED_SELECTORS.title) || getTextContent(INDEED_SELECTORS.titleAlt)
  const company = getTextContent(INDEED_SELECTORS.company) || getTextContent(INDEED_SELECTORS.companyAlt)
  if (!title || !company) return null

  const location = getTextContent(INDEED_SELECTORS.location) || getTextContent(INDEED_SELECTORS.locationAlt)
  const description = getTextContent(INDEED_SELECTORS.description)
  const salaryText = getTextContent(INDEED_SELECTORS.salary) || getTextContent(INDEED_SELECTORS.salaryAlt)
  const salary = parseSalary(salaryText)

  // Extract job key from URL
  const jkMatch = window.location.href.match(/jk=([a-f0-9]+)/i)
  const jobUrl = jkMatch
    ? `https://www.indeed.com/viewjob?jk=${jkMatch[1]}`
    : window.location.href.split('&')[0]

  return {
    jobTitle: title.trim(),
    companyName: company.trim(),
    jobUrl,
    location: location?.trim(),
    locationType: parseLocationType(location),
    salaryMin: salary.min,
    salaryMax: salary.max,
    jobType: parseJobType(title, description),
    description: description?.substring(0, 5000),
  }
}

// Lever extractor
const LEVER_SELECTORS = {
  title: '.posting-headline h2',
  company: '.main-header-logo img',
  location: '.posting-categories .location',
  description: '.posting-page .content',
  team: '.posting-categories .team',
  commitment: '.posting-categories .commitment',
}

export function isLeverJobPage(): boolean {
  return window.location.href.includes('jobs.lever.co/')
}

export function extractLeverJob(): ExtractedJob | null {
  const title = getTextContent(LEVER_SELECTORS.title)
  // Extract company name from URL or logo alt text
  let company: string | null = null
  const logoImg = document.querySelector(LEVER_SELECTORS.company) as HTMLImageElement
  if (logoImg?.alt) {
    company = logoImg.alt.replace(/\s*logo\s*/i, '').trim()
  }
  if (!company) {
    const urlMatch = window.location.href.match(/jobs\.lever\.co\/([^/]+)/)
    if (urlMatch) {
      company = urlMatch[1].split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }
  }

  if (!title || !company) return null

  const location = getTextContent(LEVER_SELECTORS.location)
  const description = getTextContent(LEVER_SELECTORS.description)
  const commitment = getTextContent(LEVER_SELECTORS.commitment)

  return {
    jobTitle: title.trim(),
    companyName: company.trim(),
    jobUrl: window.location.href.split('?')[0],
    location: location?.trim(),
    locationType: parseLocationType(location),
    jobType: commitment?.toLowerCase().includes('intern')
      ? 'internship'
      : commitment?.toLowerCase().includes('contract')
      ? 'contract'
      : parseJobType(title, description),
    description: description?.substring(0, 5000),
  }
}

// Wellfound (formerly AngelList) extractor
const WELLFOUND_SELECTORS = {
  title: 'h1[class*="JobListingHeader"]',
  company: 'a[class*="CompanyName"]',
  location: '[class*="LocationLabel"]',
  description: '[class*="JobDescription"]',
  salary: '[class*="SalaryLabel"]',
  titleAlt: '.job-title',
  companyAlt: '.company-link',
  locationAlt: '.location',
}

export function isWellfoundJobPage(): boolean {
  const url = window.location.href
  return url.includes('wellfound.com/') && (url.includes('/jobs/') || url.includes('/l/'))
}

export function extractWellfoundJob(): ExtractedJob | null {
  const title = getTextContent(WELLFOUND_SELECTORS.title) || getTextContent(WELLFOUND_SELECTORS.titleAlt)
  const company = getTextContent(WELLFOUND_SELECTORS.company) || getTextContent(WELLFOUND_SELECTORS.companyAlt)
  if (!title || !company) return null

  const location = getTextContent(WELLFOUND_SELECTORS.location) || getTextContent(WELLFOUND_SELECTORS.locationAlt)
  const description = getTextContent(WELLFOUND_SELECTORS.description)
  const salaryText = getTextContent(WELLFOUND_SELECTORS.salary)
  const salary = parseSalary(salaryText)

  return {
    jobTitle: title.trim(),
    companyName: company.trim(),
    jobUrl: window.location.href.split('?')[0],
    location: location?.trim(),
    locationType: parseLocationType(location),
    salaryMin: salary.min,
    salaryMax: salary.max,
    jobType: parseJobType(title, description),
    description: description?.substring(0, 5000),
  }
}

// Unified extractor
export type JobSite = 'linkedin' | 'greenhouse' | 'indeed' | 'lever' | 'wellfound' | 'unknown'

export function detectJobSite(): JobSite {
  if (isLinkedInJobPage()) return 'linkedin'
  if (isGreenhouseJobPage()) return 'greenhouse'
  if (isIndeedJobPage()) return 'indeed'
  if (isLeverJobPage()) return 'lever'
  if (isWellfoundJobPage()) return 'wellfound'
  return 'unknown'
}

export function extractJobData(): ExtractedJob | null {
  const site = detectJobSite()
  switch (site) {
    case 'linkedin':
      return extractLinkedInJob()
    case 'greenhouse':
      return extractGreenhouseJob()
    case 'indeed':
      return extractIndeedJob()
    case 'lever':
      return extractLeverJob()
    case 'wellfound':
      return extractWellfoundJob()
    default:
      return null
  }
}

export function isJobPage(): boolean {
  return detectJobSite() !== 'unknown'
}
