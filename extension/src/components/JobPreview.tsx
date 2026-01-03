import type { ExtractedJob } from '~lib/api'

interface JobPreviewProps {
  job: ExtractedJob
}

export function JobPreview({ job }: JobPreviewProps) {
  const formatSalary = () => {
    if (!job.salaryMin && !job.salaryMax) return null

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    })

    if (job.salaryMin && job.salaryMax) {
      return `${formatter.format(job.salaryMin)} - ${formatter.format(job.salaryMax)}`
    }
    if (job.salaryMin) {
      return `${formatter.format(job.salaryMin)}+`
    }
    return `Up to ${formatter.format(job.salaryMax!)}`
  }

  const salary = formatSalary()

  return (
    <div className="border-b pb-3 mb-3">
      <h3 className="font-semibold text-base">{job.jobTitle}</h3>
      <p className="text-sm text-gray-600">{job.companyName}</p>
      {job.location && (
        <p className="text-sm text-gray-500 mt-1">
          {job.location}
          {job.locationType && (
            <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs capitalize">
              {job.locationType}
            </span>
          )}
        </p>
      )}
      {salary && <p className="text-sm text-green-600 mt-1">{salary}</p>}
      {job.jobType && (
        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs capitalize">
          {job.jobType.replace('_', ' ')}
        </span>
      )}
    </div>
  )
}
