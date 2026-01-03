'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ExtensionAuthPage() {
  const searchParams = useSearchParams()
  const extensionId = searchParams.get('extensionId')
  const [status, setStatus] = useState<'loading' | 'authenticating' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    handleAuth()
  }, [])

  async function handleAuth() {
    const supabase = createClient()

    // Check if already authenticated
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // User is authenticated, send token to extension
      await sendTokenToExtension(user.email!)
      return
    }

    // Not authenticated, start OAuth flow
    setStatus('authenticating')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/extension?extensionId=${extensionId}`,
      },
    })

    if (error) {
      setStatus('error')
      setError(error.message)
    }
  }

  async function sendTokenToExtension(email: string) {
    const supabase = createClient()

    // Get session
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      setStatus('error')
      setError('No session found')
      return
    }

    // Send token to extension
    if (extensionId && typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        chrome.runtime.sendMessage(
          extensionId,
          {
            type: 'AUTH_CALLBACK',
            token: session.access_token,
            email: email,
          },
          (response) => {
            if (response?.success) {
              setStatus('success')
              // Close this tab after a short delay
              setTimeout(() => {
                window.close()
              }, 2000)
            } else {
              setStatus('error')
              setError('Failed to send token to extension')
            }
          }
        )
      } catch {
        // Fallback: show token to copy
        setStatus('success')
      }
    } else {
      setStatus('success')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking authentication...</p>
          </>
        )}

        {status === 'authenticating' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Redirecting to Google...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <svg
              className="w-16 h-16 mx-auto text-green-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-semibold mb-2">Connected!</h2>
            <p className="text-gray-600 mb-4">
              Your ApplyFlow extension is now connected.
            </p>
            <p className="text-sm text-gray-500">
              You can close this tab and return to the extension.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <svg
              className="w-16 h-16 mx-auto text-red-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-semibold mb-2">Connection Failed</h2>
            <p className="text-gray-600 mb-4">{error || 'Something went wrong'}</p>
            <button
              onClick={() => handleAuth()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
