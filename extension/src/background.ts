import { handleAuthCallback } from '~lib/auth'

// Listen for messages from the web app for auth callback
chrome.runtime.onMessageExternal.addListener(
  async (message, sender, sendResponse) => {
    if (message.type === 'AUTH_CALLBACK' && message.token && message.email) {
      await handleAuthCallback(message.token, message.email)
      sendResponse({ success: true })

      // Close the auth tab if we can
      if (sender.tab?.id) {
        chrome.tabs.remove(sender.tab.id)
      }
    }
  }
)

// Also listen for internal messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_CURRENT_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] })
    })
    return true // Keep channel open for async response
  }

  if (message.type === 'EXTRACT_JOB_DATA') {
    // Forward to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'EXTRACT_JOB_DATA' }, (response) => {
          sendResponse(response)
        })
      } else {
        sendResponse({ error: 'No active tab' })
      }
    })
    return true // Keep channel open for async response
  }
})

export {}
