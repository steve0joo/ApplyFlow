import { Badge } from '@/components/ui/badge'
import type { ApplicationStatus } from '@/types/database'

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  SAVED: { label: 'Saved', variant: 'secondary' },
  APPLIED: { label: 'Applied', variant: 'default' },
  SCREENING: { label: 'Screening', variant: 'default' },
  INTERVIEWING: { label: 'Interviewing', variant: 'default' },
  OFFER: { label: 'Offer', variant: 'default' },
  ACCEPTED: { label: 'Accepted', variant: 'default' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  WITHDRAWN: { label: 'Withdrawn', variant: 'outline' },
  GHOSTED: { label: 'Ghosted', variant: 'outline' },
}

interface StatusBadgeProps {
  status: ApplicationStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge variant={config.variant} className={getStatusClassName(status)}>
      {config.label}
    </Badge>
  )
}

function getStatusClassName(status: ApplicationStatus): string {
  switch (status) {
    case 'OFFER':
    case 'ACCEPTED':
      return 'bg-green-500 hover:bg-green-600'
    case 'INTERVIEWING':
      return 'bg-blue-500 hover:bg-blue-600'
    case 'SCREENING':
      return 'bg-purple-500 hover:bg-purple-600'
    case 'APPLIED':
      return 'bg-indigo-500 hover:bg-indigo-600'
    default:
      return ''
  }
}
