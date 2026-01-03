import { openLoginPage } from '~lib/auth'

export function LoginPrompt() {
  return (
    <div className="p-4 text-center">
      <div className="mb-4">
        <svg
          className="w-12 h-12 mx-auto text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold mb-2">Login Required</h2>
      <p className="text-sm text-gray-600 mb-4">
        Connect your ApplyFlow account to start tracking jobs.
      </p>
      <button
        onClick={() => openLoginPage()}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
      >
        Login with Google
      </button>
    </div>
  )
}
