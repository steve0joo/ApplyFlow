import { getAuthToken, WEB_APP_URL } from './auth'

export interface ExtractedJob {
  jobTitle: string
  companyName: string
  jobUrl: string
  location?: string
  locationType?: 'remote' | 'hybrid' | 'onsite'
  salaryMin?: number
  salaryMax?: number
  jobType?: 'internship' | 'full_time' | 'part_time' | 'contract'
  description?: string
}

export interface Application {
  id: string
  job_title: string
  company_name: string
  job_url: string | null
  status: string
  date_saved: string
  created_at: string
}

async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string }> {
  const token = await getAuthToken()

  if (!token) {
    return { error: 'Not authenticated' }
  }

  try {
    const response = await fetch(`${WEB_APP_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })

    const result = await response.json()

    if (!response.ok) {
      return { error: result.error || 'Request failed' }
    }

    return { data: result.data }
  } catch (error) {
    return { error: 'Network error' }
  }
}

export async function checkDuplicate(
  jobUrlHash: string
): Promise<{ exists: boolean; application?: Application }> {
  const token = await getAuthToken()
  if (!token) return { exists: false }

  try {
    const response = await fetch(`${WEB_APP_URL}/api/applications?job_url_hash=${jobUrlHash}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const result = await response.json()
    return { exists: result.exists, application: result.application || undefined }
  } catch {
    return { exists: false }
  }
}

export async function createApplication(
  job: ExtractedJob,
  status: string = 'SAVED',
  notes?: string,
  dateApplied?: string
): Promise<{ data?: Application; error?: string }> {
  return apiClient<Application>('/api/applications', {
    method: 'POST',
    body: JSON.stringify({
      job_title: job.jobTitle,
      company_name: job.companyName,
      job_url: job.jobUrl,
      location: job.location,
      location_type: job.locationType,
      salary_min: job.salaryMin,
      salary_max: job.salaryMax,
      job_type: job.jobType,
      job_description: job.description,
      status,
      notes,
      date_applied: dateApplied,
      source: 'extension',
    }),
  })
}

export async function hashJobUrl(url: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(url)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
