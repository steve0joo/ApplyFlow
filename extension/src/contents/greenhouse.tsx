import type { PlasmoCSConfig } from 'plasmo'
import { extractGreenhouseJob } from '~lib/extractors'

export const config: PlasmoCSConfig = {
  matches: [
    'https://boards.greenhouse.io/*/jobs/*',
    'https://jobs.greenhouse.io/*',
  ],
  run_at: 'document_idle',
}

// Listen for extraction requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_JOB_DATA') {
    const jobData = extractGreenhouseJob()
    sendResponse({ jobData, site: 'greenhouse' })
  }
  return true
})

export default function GreenhouseContentScript() {
  // This component is injected but doesn't render anything visible
  return null
}
