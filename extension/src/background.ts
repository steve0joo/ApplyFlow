import { handleAuthCallback, getAuthToken, WEB_APP_URL } from '~lib/auth'
import { LLM_EXTRACTION_PROMPT, validateLLMResponse } from '~lib/extractors/llm-fallback'

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

  if (message.type === 'EXTRACT_WITH_LLM') {
    // Handle LLM extraction via web app API
    handleLLMExtraction(message.payload).then(sendResponse)
    return true // Keep channel open for async response
  }
})

/**
 * Handle LLM extraction by calling the web app API
 */
async function handleLLMExtraction(payload: {
  pageText: string
  url: string
  title: string
}): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const token = await getAuthToken()

    if (!token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(`${WEB_APP_URL}/api/extract-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        pageText: payload.pageText,
        url: payload.url,
        title: payload.title,
        prompt: LLM_EXTRACTION_PROMPT
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      return { success: false, error: error.error || 'LLM extraction failed' }
    }

    const result = await response.json()

    // Validate the response
    const validatedData = validateLLMResponse(result.data)
    if (!validatedData) {
      return { success: false, error: 'Invalid LLM response' }
    }

    return { success: true, data: validatedData }
  } catch (error) {
    console.error('LLM extraction error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}

export {}
