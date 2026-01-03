import type { PlasmoCSConfig } from 'plasmo'
import { extractLinkedInJob } from '~lib/extractors'

export const config: PlasmoCSConfig = {
  matches: ['https://www.linkedin.com/jobs/view/*', 'https://www.linkedin.com/jobs/search/*'],
  run_at: 'document_idle',
}

// Listen for extraction requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_JOB_DATA') {
    const jobData = extractLinkedInJob()
    sendResponse({ jobData, site: 'linkedin' })
  }
  return true
})

export default function LinkedInContentScript() {
  // This component is injected but doesn't render anything visible
  // We could add a floating button here in the future
  return null
}
