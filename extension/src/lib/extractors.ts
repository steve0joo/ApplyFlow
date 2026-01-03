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

// Unified extractor
export type JobSite = 'linkedin' | 'greenhouse' | 'unknown'

export function detectJobSite(): JobSite {
  if (isLinkedInJobPage()) return 'linkedin'
  if (isGreenhouseJobPage()) return 'greenhouse'
  return 'unknown'
}

export function extractJobData(): ExtractedJob | null {
  const site = detectJobSite()
  if (site === 'linkedin') return extractLinkedInJob()
  if (site === 'greenhouse') return extractGreenhouseJob()
  return null
}

export function isJobPage(): boolean {
  return detectJobSite() !== 'unknown'
}
