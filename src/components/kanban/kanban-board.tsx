'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import type { Application, ApplicationStatus } from '@/types/database'

interface KanbanBoardProps {
  applications: Application[]
  onStatusChange: (applicationId: string, newStatus: ApplicationStatus) => Promise<void>
  onCardClick?: (application: Application) => void
}

// Active statuses shown on the board (excludes terminal states)
const KANBAN_STATUSES: ApplicationStatus[] = [
  'SAVED',
  'APPLIED',
  'SCREENING',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
]

export function KanbanBoard({ applications, onStatusChange, onCardClick }: KanbanBoardProps) {
  const [activeApplication, setActiveApplication] = useState<Application | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Group applications by status
  const applicationsByStatus = KANBAN_STATUSES.reduce((acc, status) => {
    acc[status] = applications.filter((app) => app.status === status)
    return acc
  }, {} as Record<ApplicationStatus, Application[]>)

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const application = applications.find((app) => app.id === active.id)
    if (application) {
      setActiveApplication(application)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveApplication(null)

    if (!over) return

    const applicationId = active.id as string
    const application = applications.find((app) => app.id === applicationId)
    if (!application) return

    // Determine target status
    let targetStatus: ApplicationStatus | null = null

    if (over.data.current?.type === 'column') {
      targetStatus = over.data.current.status
    } else if (over.data.current?.type === 'application') {
      // Dropped on another card - get that card's status
      const targetApp = applications.find((app) => app.id === over.id)
      targetStatus = targetApp?.status || null
    }

    if (!targetStatus || targetStatus === application.status) return

    try {
      await onStatusChange(applicationId, targetStatus)
      toast.success(`Moved to ${targetStatus.toLowerCase().replace('_', ' ')}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            applications={applicationsByStatus[status] || []}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeApplication ? (
          <div className="transform rotate-3">
            <KanbanCard application={activeApplication} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
