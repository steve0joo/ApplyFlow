import { useEffect, useState } from 'react'
import { isAuthenticated } from '~lib/auth'
import { checkDuplicate, createApplication, hashJobUrl, type ExtractedJob, type Application } from '~lib/api'
import { LoginPrompt } from '~components/LoginPrompt'
import { JobPreview } from '~components/JobPreview'
import { SaveForm } from '~components/SaveForm'
import { DuplicateAlert } from '~components/DuplicateAlert'

import './style.css'

type PopupState =
  | { type: 'loading' }
  | { type: 'not_authenticated' }
  | { type: 'not_job_page' }
  | { type: 'extracting' }
  | { type: 'job_found'; job: ExtractedJob }
  | { type: 'duplicate'; application: Application; job: ExtractedJob }
  | { type: 'saving' }
  | { type: 'saved'; job: ExtractedJob }
  | { type: 'error'; message: string }

export default function Popup() {
  const [state, setState] = useState<PopupState>({ type: 'loading' })

  async function initialize() {
    // Check authentication
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      setState({ type: 'not_authenticated' })
      return
    }

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.url) {
      setState({ type: 'not_job_page' })
      return
    }

    // Check if on a supported job page
    const isJobPage =
      tab.url.includes('linkedin.com/jobs/view/') ||
      tab.url.includes('boards.greenhouse.io/') && tab.url.includes('/jobs/') ||
      tab.url.includes('jobs.greenhouse.io/')

    if (!isJobPage) {
      setState({ type: 'not_job_page' })
      return
    }

    setState({ type: 'extracting' })

    // Request job data from content script
    try {
      const response = await chrome.tabs.sendMessage(tab.id!, { type: 'EXTRACT_JOB_DATA' })

      if (!response?.jobData) {
        setState({ type: 'error', message: 'Could not extract job data from this page' })
        return
      }

      const job = response.jobData as ExtractedJob

      // Check for duplicates
      const urlHash = await hashJobUrl(job.jobUrl)
      const duplicateCheck = await checkDuplicate(urlHash)

      if (duplicateCheck.exists && duplicateCheck.application) {
        setState({ type: 'duplicate', application: duplicateCheck.application, job })
      } else {
        setState({ type: 'job_found', job })
      }
    } catch (error) {
      setState({ type: 'error', message: 'Failed to extract job data. Try refreshing the page.' })
    }
  }

  async function handleSave(status: string, notes: string, dateApplied: string | null) {
    if (state.type !== 'job_found') return

    setState({ type: 'saving' })

    const result = await createApplication(state.job, status, notes, dateApplied || undefined)

    if (result.error) {
      setState({ type: 'error', message: result.error })
      return
    }

    setState({ type: 'saved', job: state.job })
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialization on mount
    initialize()
  }, [])

  return (
    <div className="w-80 bg-white">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-3">
        <h1 className="font-semibold text-lg">ApplyFlow</h1>
      </div>

      {/* Content */}
      <div className="p-4">
        {state.type === 'loading' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}

        {state.type === 'not_authenticated' && <LoginPrompt />}

        {state.type === 'not_job_page' && (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-600">Visit a job page on LinkedIn or Greenhouse to track it.</p>
          </div>
        )}

        {state.type === 'extracting' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-sm text-gray-600">Extracting job details...</p>
          </div>
        )}

        {state.type === 'job_found' && (
          <>
            <JobPreview job={state.job} />
            <SaveForm onSave={handleSave} loading={false} />
          </>
        )}

        {state.type === 'duplicate' && (
          <DuplicateAlert application={state.application} />
        )}

        {state.type === 'saving' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-sm text-gray-600">Saving application...</p>
          </div>
        )}

        {state.type === 'saved' && (
          <div className="text-center py-6">
            <svg
              className="w-12 h-12 mx-auto text-green-500 mb-3"
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
            <h3 className="font-semibold text-base mb-1">Application Saved!</h3>
            <p className="text-sm text-gray-600">
              {state.job.jobTitle} at {state.job.companyName}
            </p>
          </div>
        )}

        {state.type === 'error' && (
          <div className="text-center py-6">
            <svg
              className="w-12 h-12 mx-auto text-red-500 mb-3"
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
            <h3 className="font-semibold text-base mb-1">Error</h3>
            <p className="text-sm text-gray-600">{state.message}</p>
            <button
              onClick={() => initialize()}
              className="mt-3 text-blue-600 text-sm hover:underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
