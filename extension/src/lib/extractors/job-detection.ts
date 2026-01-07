/**
 * Layer 2: Job Page Detection
 * Uses URL patterns, title keywords, and content signals to detect job pages
 */

import type { JobDetectionResult } from './types'

// URL patterns that indicate job pages
const JOB_URL_PATTERNS = [
  // Direct job patterns
  /\/jobs?\//i,
  /\/careers?\//i,
  /\/positions?\//i,
  /\/vacancies?\//i,
  /\/openings?\//i,
  /\/opportunities?\//i,
  /\/apply\//i,

  // Job board domains
  /linkedin\.com\/jobs/i,
  /indeed\.com\/(viewjob|jobs)/i,
  /glassdoor\.com\/job/i,
  /boards\.greenhouse\.io/i,
  /jobs\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /wellfound\.com\/(jobs|l)/i,
  /angel\.co\/jobs/i,
  /ziprecruiter\.com\/jobs/i,
  /monster\.com\/job/i,
  /workday\.com.*\/job\//i,
  /icims\.com.*\/jobs\//i,
  /smartrecruiters\.com/i,
  /jobvite\.com/i,
  /breezy\.hr/i,
  /ashbyhq\.com/i,
  /myworkdayjobs\.com/i
]

// Title keywords that indicate job pages
const JOB_TITLE_KEYWORDS = [
  // Job titles
  'engineer', 'developer', 'designer', 'manager', 'analyst',
  'scientist', 'architect', 'consultant', 'specialist', 'coordinator',
  'director', 'lead', 'senior', 'junior', 'intern', 'associate',

  // Job-related terms
  'job', 'career', 'position', 'opening', 'opportunity', 'vacancy',
  'hiring', 'apply', 'employment', 'role'
]

// Keywords in page content that indicate job pages
const JOB_CONTENT_KEYWORDS = [
  'apply now', 'apply for this job', 'submit application',
  'job description', 'job requirements', 'qualifications',
  'responsibilities', 'what you\'ll do', 'what we\'re looking for',
  'requirements', 'benefits', 'perks', 'compensation',
  'years of experience', 'required skills', 'preferred skills',
  'about the role', 'about this job', 'about the position',
  'equal opportunity employer', 'eoe', 'we are an equal'
]

/**
 * Score URL patterns for job page indicators
 */
function scoreUrl(url: string): number {
  let score = 0

  for (const pattern of JOB_URL_PATTERNS) {
    if (pattern.test(url)) {
      score += 0.3
    }
  }

  // Additional signals from URL structure
  if (/\/\d{5,}/.test(url)) score += 0.1 // Job ID in URL
  if (/\?(.*)?id=/.test(url)) score += 0.1 // id parameter

  return Math.min(score, 1)
}

/**
 * Score page title for job-related keywords
 */
function scoreTitle(title: string): number {
  const normalizedTitle = title.toLowerCase()
  let matchCount = 0

  for (const keyword of JOB_TITLE_KEYWORDS) {
    if (normalizedTitle.includes(keyword)) {
      matchCount++
    }
  }

  // Also check for common title formats: "Job Title at Company" or "Job Title - Company"
  if (/\s+(at|@|-|–|—|\|)\s+/i.test(title)) {
    matchCount++
  }

  return Math.min(matchCount * 0.2, 1)
}

/**
 * Check if page has apply button/link
 */
function hasApplyButton(): boolean {
  const applySelectors = [
    // Button text content
    'button',
    'a[href*="apply"]',
    '[class*="apply"]',
    '[id*="apply"]',
    '[data-*="apply"]',
    // Common ATS patterns
    '[class*="job-apply"]',
    '[class*="application"]',
    '.apply-button',
    '#apply-button',
    'a[href*="application"]'
  ]

  for (const selector of applySelectors) {
    const elements = document.querySelectorAll(selector)
    for (const el of elements) {
      const text = el.textContent?.toLowerCase() || ''
      if (text.includes('apply') || text.includes('submit application')) {
        return true
      }
    }
  }

  return false
}

/**
 * Check for Schema.org JobPosting structured data
 */
function hasJobPostingSchema(): boolean {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]')

  for (const script of scripts) {
    const content = script.textContent || ''
    if (content.includes('"JobPosting"') || content.includes("'JobPosting'")) {
      return true
    }
  }

  return false
}

/**
 * Check page content for job-related keywords
 */
function hasJobKeywords(): boolean {
  // Get main content area (avoid nav, footer, etc.)
  const mainContent = document.querySelector('main') ||
                      document.querySelector('[role="main"]') ||
                      document.querySelector('article') ||
                      document.body

  const text = mainContent.textContent?.toLowerCase() || ''

  let matchCount = 0
  for (const keyword of JOB_CONTENT_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      matchCount++
    }
  }

  // Need at least 3 keyword matches to be confident
  return matchCount >= 3
}

/**
 * Check if the page has job listing structure
 */
function hasJobStructure(): boolean {
  // Common job page structural elements
  const structuralIndicators = [
    // Job title heading
    'h1',
    // Sections
    '[class*="description"]',
    '[class*="requirements"]',
    '[class*="qualifications"]',
    '[class*="responsibilities"]',
    '[class*="benefits"]',
    // Company info
    '[class*="company"]',
    '[class*="employer"]',
    // Location
    '[class*="location"]',
    // Salary
    '[class*="salary"]',
    '[class*="compensation"]'
  ]

  let matches = 0
  for (const selector of structuralIndicators) {
    if (document.querySelector(selector)) {
      matches++
    }
  }

  return matches >= 3
}

/**
 * Main job detection function
 * Returns confidence score and signals for debugging
 */
export function detectJobPage(): JobDetectionResult {
  const url = window.location.href
  const title = document.title

  const signals = {
    urlScore: scoreUrl(url),
    titleScore: scoreTitle(title),
    hasApplyButton: hasApplyButton(),
    hasStructuredData: hasJobPostingSchema(),
    hasJobKeywords: hasJobKeywords()
  }

  // Calculate overall confidence
  let confidence = 0

  // URL patterns are strong signals
  confidence += signals.urlScore * 0.35

  // Title keywords
  confidence += signals.titleScore * 0.2

  // Apply button is a good signal
  if (signals.hasApplyButton) confidence += 0.15

  // Structured data is definitive
  if (signals.hasStructuredData) confidence += 0.25

  // Content keywords
  if (signals.hasJobKeywords) confidence += 0.15

  // Job structure bonus
  if (hasJobStructure()) confidence += 0.1

  // Cap at 1.0
  confidence = Math.min(confidence, 1)

  return {
    isJobPage: confidence >= 0.5,
    confidence,
    signals
  }
}

/**
 * Quick check for known job board domains
 * Used for early exit optimization
 */
export function isKnownJobBoard(): boolean {
  const hostname = window.location.hostname

  const knownBoards = [
    'linkedin.com',
    'indeed.com',
    'glassdoor.com',
    'greenhouse.io',
    'lever.co',
    'wellfound.com',
    'angel.co',
    'ziprecruiter.com',
    'monster.com',
    'workday.com',
    'icims.com',
    'smartrecruiters.com',
    'jobvite.com',
    'breezy.hr',
    'ashbyhq.com',
    'myworkdayjobs.com',
    'dice.com',
    'careerbuilder.com',
    'simplyhired.com',
    'hired.com',
    'triplebyte.com',
    'ycombinator.com' // HN jobs
  ]

  return knownBoards.some(board => hostname.includes(board))
}
