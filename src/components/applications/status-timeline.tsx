'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from './status-badge'
import type { Application, ApplicationStatus, EmailClassification } from '@/types/database'

interface TimelineEntry {
  id: string
  from_status: ApplicationStatus | null
  to_status: ApplicationStatus
  trigger_type: string
  trigger_email_id: string | null
  created_at: string
  application_emails?: {
    id: string
    subject: string
    from_address: string
    classification: EmailClassification | null
  } | null
}

interface StatusTimelineProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  application: Application | null
}

const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Manual update',
  email_auto: 'Auto-detected from email',
  email_manual: 'Manual classification',
  extension: 'Saved via extension',
  kanban: 'Moved on Kanban board',
}

export function StatusTimeline({ open, onOpenChange, application }: StatusTimelineProps) {
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<TimelineEntry[]>([])

  useEffect(() => {
    if (open && application) {
      loadTimeline()
    }
  }, [open, application])

  async function loadTimeline() {
    if (!application) return

    setLoading(true)
    try {
      const response = await fetch(`/api/applications/${application.id}/timeline`)
      if (response.ok) {
        const data = await response.json()
        setHistory(data.history)
      }
    } catch (error) {
      console.error('Failed to load timeline:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Status Timeline</DialogTitle>
          {application && (
            <p className="text-sm text-gray-500">
              {application.job_title} at {application.company_name}
            </p>
          )}
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-3 w-3 rounded-full mt-1.5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No status changes recorded yet.</p>
              <p className="text-sm mt-1">
                Status changes will appear here as your application progresses.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-gray-200" />

              <div className="space-y-6">
                {history.map((entry, index) => (
                  <div key={entry.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div
                      className={`relative z-10 h-3 w-3 rounded-full mt-1.5 ${
                        index === 0 ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    />

                    <div className="flex-1 pb-2">
                      {/* Status change */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.from_status ? (
                          <>
                            <StatusBadge status={entry.from_status} />
                            <span className="text-gray-400">→</span>
                            <StatusBadge status={entry.to_status} />
                          </>
                        ) : (
                          <>
                            <span className="text-sm text-gray-500">Created as</span>
                            <StatusBadge status={entry.to_status} />
                          </>
                        )}
                      </div>

                      {/* Trigger info */}
                      <p className="text-sm text-gray-500 mt-1">
                        {TRIGGER_LABELS[entry.trigger_type] || entry.trigger_type}
                      </p>

                      {/* Email info if applicable */}
                      {entry.application_emails && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                          <p className="font-medium truncate">
                            {entry.application_emails.subject}
                          </p>
                          <p className="text-gray-500 text-xs">
                            From: {entry.application_emails.from_address}
                          </p>
                        </div>
                      )}

                      {/* Timestamp */}
                      <p className="text-xs text-gray-400 mt-2">
                        {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                        {' · '}
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
