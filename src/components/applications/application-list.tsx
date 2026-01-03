'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { ApplicationCard } from './application-card'
import { ApplicationFilters } from './application-filters'
import { ApplicationForm } from './application-form'
import { Button } from '@/components/ui/button'
import type { Application, ApplicationStatus, JobType } from '@/types/database'

interface Filters {
  status: ApplicationStatus | 'all'
  jobType: JobType | 'all'
  search: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function ApplicationList() {
  const [applications, setApplications] = useState<Application[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    jobType: 'all',
    search: '',
  })
  const [formOpen, setFormOpen] = useState(false)
  const [editingApplication, setEditingApplication] = useState<Application | null>(null)

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status !== 'all') {
        params.append('status', filters.status)
      }
      if (filters.jobType !== 'all') {
        params.append('jobType', filters.jobType)
      }
      if (filters.search) {
        params.append('search', filters.search)
      }
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())

      const response = await fetch(`/api/applications?${params}`)
      if (!response.ok) throw new Error('Failed to fetch applications')

      const result = await response.json()
      setApplications(result.data)
      setPagination(result.pagination)
    } catch {
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.page, pagination.limit])

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchApplications()
    }, filters.search ? 300 : 0)

    return () => clearTimeout(debounce)
  }, [fetchApplications, filters.search])

  const handleCreate = async (data: Partial<Application>) => {
    const response = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || 'Failed to create application')
      throw new Error(error.error)
    }

    toast.success('Application added')
    fetchApplications()
  }

  const handleUpdate = async (data: Partial<Application>) => {
    if (!editingApplication) return

    const response = await fetch(`/api/applications/${editingApplication.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || 'Failed to update application')
      throw new Error(error.error)
    }

    toast.success('Application updated')
    setEditingApplication(null)
    fetchApplications()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return

    const response = await fetch(`/api/applications/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      toast.error('Failed to delete application')
      return
    }

    toast.success('Application deleted')
    fetchApplications()
  }

  const handleEdit = (application: Application) => {
    setEditingApplication(application)
    setFormOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingApplication(null)
    }
  }

  // Stats
  const stats = {
    total: pagination.total,
    active: applications.filter((a) =>
      ['APPLIED', 'SCREENING', 'INTERVIEWING'].includes(a.status)
    ).length,
    offers: applications.filter((a) => a.status === 'OFFER').length,
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Applications</h1>
        <div className="flex gap-4 text-sm text-gray-600">
          <span>{pagination.total} Total</span>
          <span>{stats.active} Active</span>
          <span>{stats.offers} Offers</span>
        </div>
      </div>

      <ApplicationFilters
        filters={filters}
        onFiltersChange={(newFilters) => {
          setFilters(newFilters)
          setPagination((prev) => ({ ...prev, page: 1 }))
        }}
        onAddNew={() => {
          setEditingApplication(null)
          setFormOpen(true)
        }}
      />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : applications.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No applications found</p>
          <Button onClick={() => setFormOpen(true)}>Add your first application</Button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={pagination.page === pagination.totalPages}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <ApplicationForm
        open={formOpen}
        onOpenChange={handleFormClose}
        application={editingApplication}
        onSubmit={editingApplication ? handleUpdate : handleCreate}
      />
    </div>
  )
}