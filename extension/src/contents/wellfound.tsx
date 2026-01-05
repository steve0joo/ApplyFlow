import type { PlasmoCSConfig } from 'plasmo'
import { extractWellfoundJob } from '~lib/extractors'

export const config: PlasmoCSConfig = {
  matches: [
    'https://wellfound.com/jobs/*',
    'https://wellfound.com/l/*',
    'https://angel.co/jobs/*',
  ],
  run_at: 'document_idle',
}

// Listen for extraction requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_JOB_DATA') {
    const jobData = extractWellfoundJob()
    sendResponse({ jobData, site: 'wellfound' })
  }
  return true
})

export default function WellfoundContentScript() {
  return null
}
