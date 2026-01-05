'use client'

import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from './status-badge'
import type { Application } from '@/types/database'

interface ApplicationCardProps {
  application: Application
  onEdit: (application: Application) => void
  onDelete: (id: string) => void
  onViewTimeline?: (application: Application) => void
}

export function ApplicationCard({ application, onEdit, onDelete, onViewTimeline }: ApplicationCardProps) {
  const formatSalary = () => {
    if (!application.salary_min && !application.salary_max) return null
    const currency = application.salary_currency || 'USD'
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    })

    if (application.salary_min && application.salary_max) {
      return `${formatter.format(application.salary_min)} - ${formatter.format(application.salary_max)}`
    }
    if (application.salary_min) {
      return `${formatter.format(application.salary_min)}+`
    }
    return `Up to ${formatter.format(application.salary_max!)}`
  }

  const salary = formatSalary()

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg truncate">
                {application.job_title}
              </h3>
              <StatusBadge status={application.status} />
            </div>
            <p className="text-gray-600 mb-2">
              {application.company_name}
              {application.location && ` • ${application.location}`}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              {salary && <span>{salary}</span>}
              {application.job_type && (
                <span className="capitalize">
                  {application.job_type.replace('_', ' ')}
                </span>
              )}
              {application.date_applied && (
                <span>
                  Applied {formatDistanceToNow(new Date(application.date_applied), { addSuffix: true })}
                </span>
              )}
              <span>
                Updated {formatDistanceToNow(new Date(application.updated_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {application.job_url && (
                <DropdownMenuItem asChild>
                  <a href={application.job_url} target="_blank" rel="noopener noreferrer">
                    View Job Posting
                  </a>
                </DropdownMenuItem>
              )}
              {onViewTimeline && (
                <DropdownMenuItem onClick={() => onViewTimeline(application)}>
                  View Timeline
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEdit(application)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(application.id)}
                className="text-red-600"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {application.notes && (
          <p className="mt-3 text-sm text-gray-600 border-t pt-3">
            {application.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
