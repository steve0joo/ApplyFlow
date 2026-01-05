import type { PlasmoCSConfig } from 'plasmo'
import { extractIndeedJob } from '~lib/extractors'

export const config: PlasmoCSConfig = {
  matches: [
    'https://www.indeed.com/viewjob*',
    'https://www.indeed.com/jobs*',
    'https://indeed.com/viewjob*',
    'https://indeed.com/jobs*',
  ],
  run_at: 'document_idle',
}

// Listen for extraction requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_JOB_DATA') {
    const jobData = extractIndeedJob()
    sendResponse({ jobData, site: 'indeed' })
  }
  return true
})

export default function IndeedContentScript() {
  return null
}
