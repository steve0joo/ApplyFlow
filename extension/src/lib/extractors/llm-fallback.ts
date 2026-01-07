/**
 * Layer 4: LLM Fallback Extraction
 * Uses Claude Haiku to extract job data when other layers fail
 * Called via background script to avoid CORS issues
 */

import type { ExtractedJobData, ExtractionResult } from './types'

/**
 * Get clean page text for LLM processing
 * Removes navigation, scripts, styles, and other noise
 */
export function getCleanPageText(): string {
  // Clone body to avoid modifying the page
  const clone = document.body.cloneNode(true) as HTMLElement

  // Remove unwanted elements
  const removeSelectors = [
    'script', 'style', 'nav', 'header', 'footer',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    '.nav', '.navigation', '.header', '.footer',
    '.sidebar', '.menu', '.cookie', '.modal',
    'iframe', 'noscript', 'svg', 'img'
  ]

  removeSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove())
  })

  // Get text content
  let text = clone.textContent || ''

  // Clean up whitespace
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()

  return text
}

/**
 * Truncate text intelligently for LLM context window
 * Keeps beginning (title, company) and middle (job details)
 */
export function truncateForLLM(text: string, maxLength: number = 4000): string {
  if (text.length <= maxLength) return text

  // Take first 70% and last 20%
  const firstPart = Math.floor(maxLength * 0.7)
  const lastPart = Math.floor(maxLength * 0.2)

  return text.slice(0, firstPart) + '\n...[content truncated]...\n' + text.slice(-lastPart)
}

/**
 * Request LLM extraction via background script
 * Background script handles API communication to avoid CORS
 */
export async function extractWithLLM(): Promise<ExtractionResult | null> {
  try {
    const pageText = getCleanPageText()
    const truncatedText = truncateForLLM(pageText)

    // Send to background script for API call
    const response = await chrome.runtime.sendMessage({
      type: 'EXTRACT_WITH_LLM',
      payload: {
        pageText: truncatedText,
        url: window.location.href,
        title: document.title
      }
    })

    if (!response?.success || !response?.data) {
      console.warn('LLM extraction failed:', response?.error)
      return null
    }

    const data = response.data as Partial<ExtractedJobData>
    const fieldsExtracted = Object.keys(data).filter(k => data[k as keyof ExtractedJobData] !== undefined)

    // Always include URL
    data.jobUrl = window.location.href
    if (!fieldsExtracted.includes('jobUrl')) {
      fieldsExtracted.push('jobUrl')
    }

    return {
      data,
      confidence: 0.85, // LLM confidence
      source: 'llm',
      fieldsExtracted
    }
  } catch (error) {
    console.error('LLM extraction error:', error)
    return null
  }
}

/**
 * LLM extraction prompt
 * Used by background script when calling the API
 */
export const LLM_EXTRACTION_PROMPT = `You are a job posting extraction system. Extract job details from the following webpage text.

IMPORTANT: Return ONLY a JSON object with the following fields. Use null for any field you cannot determine with confidence.

{
  "jobTitle": "The job title/position name",
  "companyName": "The hiring company name",
  "location": "Job location (city, state/country)",
  "salaryMin": number or null,
  "salaryMax": number or null,
  "salaryCurrency": "USD/EUR/GBP/etc or null",
  "jobType": "internship" | "full_time" | "part_time" | "contract" | null,
  "locationType": "remote" | "hybrid" | "onsite" | null,
  "description": "Brief 2-3 sentence summary of the role"
}

Rules:
- For salary, extract annual amounts. Convert hourly rates to annual (multiply by 2080).
- For jobType, use exact values: "internship", "full_time", "part_time", "contract"
- For locationType, use exact values: "remote", "hybrid", "onsite"
- Return ONLY the JSON object, no explanations or markdown.

Webpage text:
`

/**
 * Schema for LLM response validation
 */
export const LLM_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    jobTitle: { type: ['string', 'null'] },
    companyName: { type: ['string', 'null'] },
    location: { type: ['string', 'null'] },
    salaryMin: { type: ['number', 'null'] },
    salaryMax: { type: ['number', 'null'] },
    salaryCurrency: { type: ['string', 'null'] },
    jobType: {
      type: ['string', 'null'],
      enum: ['internship', 'full_time', 'part_time', 'contract', null]
    },
    locationType: {
      type: ['string', 'null'],
      enum: ['remote', 'hybrid', 'onsite', null]
    },
    description: { type: ['string', 'null'] }
  },
  required: ['jobTitle', 'companyName']
}

/**
 * Validate and clean LLM response
 */
export function validateLLMResponse(response: unknown): Partial<ExtractedJobData> | null {
  if (!response || typeof response !== 'object') return null

  const data = response as Record<string, unknown>
  const cleaned: Partial<ExtractedJobData> = {}

  // String fields
  if (typeof data.jobTitle === 'string' && data.jobTitle.trim()) {
    cleaned.jobTitle = data.jobTitle.trim()
  }
  if (typeof data.companyName === 'string' && data.companyName.trim()) {
    cleaned.companyName = data.companyName.trim()
  }
  if (typeof data.location === 'string' && data.location.trim()) {
    cleaned.location = data.location.trim()
  }
  if (typeof data.description === 'string' && data.description.trim()) {
    cleaned.description = data.description.trim()
  }
  if (typeof data.salaryCurrency === 'string' && data.salaryCurrency.trim()) {
    cleaned.salaryCurrency = data.salaryCurrency.trim().toUpperCase()
  }

  // Number fields
  if (typeof data.salaryMin === 'number' && data.salaryMin > 0) {
    cleaned.salaryMin = data.salaryMin
  }
  if (typeof data.salaryMax === 'number' && data.salaryMax > 0) {
    cleaned.salaryMax = data.salaryMax
  }

  // Enum fields
  const validJobTypes = ['internship', 'full_time', 'part_time', 'contract']
  if (typeof data.jobType === 'string' && validJobTypes.includes(data.jobType)) {
    cleaned.jobType = data.jobType as ExtractedJobData['jobType']
  }

  const validLocationTypes = ['remote', 'hybrid', 'onsite']
  if (typeof data.locationType === 'string' && validLocationTypes.includes(data.locationType)) {
    cleaned.locationType = data.locationType as ExtractedJobData['locationType']
  }

  // Must have at least title or company
  if (!cleaned.jobTitle && !cleaned.companyName) {
    return null
  }

  return cleaned
}
