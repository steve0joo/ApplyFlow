'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import type { Application } from '@/types/database'

interface KanbanCardProps {
  application: Application
  onClick?: () => void
}

export function KanbanCard({ application, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: application.id,
    data: {
      type: 'application',
      application,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <h4 className="font-medium text-sm truncate mb-1">
          {application.job_title}
        </h4>
        <p className="text-xs text-gray-600 truncate mb-2">
          {application.company_name}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500">
          {application.location_type && (
            <span className="capitalize">
              {application.location_type}
            </span>
          )}
          <span>
            {formatDistanceToNow(new Date(application.updated_at), { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
