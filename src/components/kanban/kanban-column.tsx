'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanCard } from './kanban-card'
import type { Application, ApplicationStatus } from '@/types/database'

interface KanbanColumnProps {
  status: ApplicationStatus
  applications: Application[]
  onCardClick?: (application: Application) => void
}

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bgColor: string }> = {
  SAVED: { label: 'Saved', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  APPLIED: { label: 'Applied', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  SCREENING: { label: 'Screening', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  INTERVIEWING: { label: 'Interviewing', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  OFFER: { label: 'Offer', color: 'text-green-700', bgColor: 'bg-green-100' },
  ACCEPTED: { label: 'Accepted', color: 'text-green-700', bgColor: 'bg-green-100' },
  REJECTED: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
  WITHDRAWN: { label: 'Withdrawn', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  GHOSTED: { label: 'Ghosted', color: 'text-gray-700', bgColor: 'bg-gray-100' },
}

export function KanbanColumn({ status, applications, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      type: 'column',
      status,
    },
  })

  const config = STATUS_CONFIG[status]

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[280px] max-w-[280px] rounded-lg ${
        isOver ? 'bg-blue-50' : 'bg-gray-50'
      }`}
    >
      {/* Column header */}
      <div className={`p-3 rounded-t-lg ${config.bgColor}`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold text-sm ${config.color}`}>
            {config.label}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
            {applications.length}
          </span>
        </div>
      </div>

      {/* Column body with cards */}
      <div className="flex-1 p-2 overflow-y-auto max-h-[calc(100vh-250px)]">
        <SortableContext items={applications.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {applications.map((application) => (
              <KanbanCard
                key={application.id}
                application={application}
                onClick={() => onCardClick?.(application)}
              />
            ))}
            {applications.length === 0 && (
              <div className="text-center py-4 text-gray-400 text-sm">
                No applications
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
