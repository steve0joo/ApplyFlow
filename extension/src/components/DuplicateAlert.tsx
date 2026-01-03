import type { Application } from '~lib/api'
import { WEB_APP_URL } from '~lib/auth'

interface DuplicateAlertProps {
  application: Application
}

export function DuplicateAlert({ application }: DuplicateAlertProps) {
  const formattedDate = new Date(application.date_saved).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const openInApp = () => {
    chrome.tabs.create({ url: `${WEB_APP_URL}/?highlight=${application.id}` })
  }

  return (
    <div className="p-4 text-center">
      <div className="mb-3">
        <svg
          className="w-10 h-10 mx-auto text-yellow-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="font-semibold text-base mb-1">Already Tracked</h3>
      <p className="text-sm text-gray-600 mb-1">
        {application.job_title} at {application.company_name}
      </p>
      <p className="text-xs text-gray-500 mb-4">Saved on {formattedDate}</p>
      <div className="space-y-2">
        <button
          onClick={openInApp}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          View in ApplyFlow
        </button>
        <p className="text-xs text-gray-500">
          Status: <span className="font-medium">{application.status}</span>
        </p>
      </div>
    </div>
  )
}
