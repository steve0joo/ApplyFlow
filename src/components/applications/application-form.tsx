'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Application, ApplicationStatus, JobType, LocationType } from '@/types/database'

const STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: 'SAVED', label: 'Saved' },
  { value: 'APPLIED', label: 'Applied' },
  { value: 'SCREENING', label: 'Screening' },
  { value: 'INTERVIEWING', label: 'Interviewing' },
  { value: 'OFFER', label: 'Offer' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  { value: 'GHOSTED', label: 'Ghosted' },
]

const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'internship', label: 'Internship' },
  { value: 'contract', label: 'Contract' },
]

const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

interface FormData {
  job_title: string
  company_name: string
  job_url: string
  location: string
  location_type: LocationType | ''
  salary_min: string
  salary_max: string
  job_type: JobType
  status: ApplicationStatus
  notes: string
  date_applied: string
}

interface ApplicationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  application?: Application | null
  onSubmit: (data: Partial<Application>) => Promise<void>
}

export function ApplicationForm({
  open,
  onOpenChange,
  application,
  onSubmit,
}: ApplicationFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>(() => getInitialFormData(application))
  const lastApplicationId = useRef<string | null>(null)

  // Reset form when dialog opens with a different application
  useEffect(() => {
    const currentId = application?.id ?? null
    if (open && currentId !== lastApplicationId.current) {
      setFormData(getInitialFormData(application))
      lastApplicationId.current = currentId
    }
    if (!open) {
      lastApplicationId.current = null
    }
  }, [open, application])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSubmit({
        job_title: formData.job_title,
        company_name: formData.company_name,
        job_url: formData.job_url || null,
        location: formData.location || null,
        location_type: formData.location_type || null,
        salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
        salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
        job_type: formData.job_type,
        status: formData.status,
        notes: formData.notes || null,
        date_applied: formData.date_applied || null,
      })
      onOpenChange(false)
      setFormData(getInitialFormData(null))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {application ? 'Edit Application' : 'Add Application'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="job_title">Job Title *</Label>
              <Input
                id="job_title"
                required
                value={formData.job_title}
                onChange={(e) =>
                  setFormData({ ...formData, job_title: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="company_name">Company *</Label>
              <Input
                id="company_name"
                required
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="job_url">Job URL</Label>
              <Input
                id="job_url"
                type="url"
                value={formData.job_url}
                onChange={(e) =>
                  setFormData({ ...formData, job_url: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="location_type">Location Type</Label>
              <Select
                value={formData.location_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, location_type: value as LocationType })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="salary_min">Min Salary</Label>
              <Input
                id="salary_min"
                type="number"
                value={formData.salary_min}
                onChange={(e) =>
                  setFormData({ ...formData, salary_min: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="salary_max">Max Salary</Label>
              <Input
                id="salary_max"
                type="number"
                value={formData.salary_max}
                onChange={(e) =>
                  setFormData({ ...formData, salary_max: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="job_type">Job Type</Label>
              <Select
                value={formData.job_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, job_type: value as JobType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as ApplicationStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="date_applied">Date Applied</Label>
              <Input
                id="date_applied"
                type="date"
                value={formData.date_applied}
                onChange={(e) =>
                  setFormData({ ...formData, date_applied: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : application ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function getInitialFormData(application: Application | null | undefined): FormData {
  if (!application) {
    return {
      job_title: '',
      company_name: '',
      job_url: '',
      location: '',
      location_type: '',
      salary_min: '',
      salary_max: '',
      job_type: 'full_time',
      status: 'SAVED',
      notes: '',
      date_applied: '',
    }
  }

  return {
    job_title: application.job_title,
    company_name: application.company_name,
    job_url: application.job_url || '',
    location: application.location || '',
    location_type: application.location_type || '',
    salary_min: application.salary_min?.toString() || '',
    salary_max: application.salary_max?.toString() || '',
    job_type: application.job_type,
    status: application.status,
    notes: application.notes || '',
    date_applied: application.date_applied
      ? new Date(application.date_applied).toISOString().split('T')[0]
      : '',
  }
}
