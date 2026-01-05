import type { PlasmoCSConfig } from 'plasmo'
import { extractLeverJob } from '~lib/extractors'

export const config: PlasmoCSConfig = {
  matches: ['https://jobs.lever.co/*'],
  run_at: 'document_idle',
}

// Listen for extraction requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_JOB_DATA') {
    const jobData = extractLeverJob()
    sendResponse({ jobData, site: 'lever' })
  }
  return true
})

export default function LeverContentScript() {
  return null
}
