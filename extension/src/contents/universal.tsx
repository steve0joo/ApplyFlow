/**
 * Universal Content Script
 * Works on any webpage to detect and extract job data
 */

import type { PlasmoCSConfig } from 'plasmo'
import { extractJobData, extractJobDataQuick, isJobPage } from '~lib/extractors/index'
import type { ExtractedJobData } from '~lib/extractors/index'

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  run_at: 'document_idle'
}

// Convert ExtractedJobData to the format expected by popup
interface LegacyExtractedJob {
  jobTitle: string
  companyName: string
  location?: string
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  jobType?: 'internship' | 'full_time' | 'part_time' | 'contract'
  locationType?: 'remote' | 'hybrid' | 'onsite'
  description?: string
  jobUrl: string
}

function toLegacyFormat(data: ExtractedJobData): LegacyExtractedJob {
  return {
    jobTitle: data.jobTitle || 'Unknown Position',
    companyName: data.companyName || 'Unknown Company',
    location: data.location,
    salaryMin: data.salaryMin,
    salaryMax: data.salaryMax,
    salaryCurrency: data.salaryCurrency,
    jobType: data.jobType,
    locationType: data.locationType,
    description: data.description,
    jobUrl: data.jobUrl || window.location.href
  }
}

// Listen for extraction requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_JOB_DATA') {
    handleExtraction(message.options || {}).then(sendResponse)
    return true // Keep channel open for async response
  }

  if (message.type === 'IS_JOB_PAGE') {
    sendResponse({ isJobPage: isJobPage() })
    return false
  }

  if (message.type === 'QUICK_EXTRACT') {
    const result = extractJobDataQuick()
    if (result.success && result.data) {
      sendResponse({
        jobData: toLegacyFormat(result.data as ExtractedJobData),
        confidence: result.confidence
      })
    } else {
      sendResponse({ error: 'Quick extraction failed' })
    }
    return false
  }
})

async function handleExtraction(options: {
  skipLLM?: boolean
  debug?: boolean
}): Promise<{ jobData?: LegacyExtractedJob; error?: string; debug?: unknown }> {
  try {
    const result = await extractJobData({
      skipDetection: true, // Popup already does URL check
      skipLLM: options.skipLLM,
      debug: options.debug
    })

    if (result.success && result.data) {
      return {
        jobData: toLegacyFormat(result.data),
        debug: options.debug ? result : undefined
      }
    }

    return {
      error: result.error || 'Extraction failed',
      debug: options.debug ? result : undefined
    }
  } catch (error) {
    console.error('Extraction error:', error)
    return {
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Log when content script loads (helpful for debugging)
console.log('[ApplyFlow] Universal content script loaded on', window.location.hostname)
