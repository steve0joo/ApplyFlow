'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { ApplicationCard } from './application-card'
import { ApplicationFilters } from './application-filters'
import { ApplicationForm } from './application-form'
import { StatusTimeline } from './status-timeline'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Application, ApplicationStatus, JobType } from '@/types/database'

type ViewMode = 'list' | 'kanban'

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
  const [allApplications, setAllApplications] = useState<Application[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    jobType: 'all',
    search: '',
  })
  const [formOpen, setFormOpen] = useState(false)
  const [editingApplication, setEditingApplication] = useState<Application | null>(null)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [timelineApplication, setTimelineApplication] = useState<Application | null>(null)

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

  // Fetch all applications for Kanban view (no pagination)
  const fetchAllApplications = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.jobType !== 'all') {
        params.append('jobType', filters.jobType)
      }
      if (filters.search) {
        params.append('search', filters.search)
      }
      params.append('limit', '500') // Get all for kanban

      const response = await fetch(`/api/applications?${params}`)
      if (!response.ok) throw new Error('Failed to fetch applications')

      const result = await response.json()
      setAllApplications(result.data)
      setPagination(result.pagination)
    } catch {
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }, [filters.jobType, filters.search])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (viewMode === 'kanban') {
        fetchAllApplications()
      } else {
        fetchApplications()
      }
    }, filters.search ? 300 : 0)

    return () => clearTimeout(debounce)
  }, [fetchApplications, fetchAllApplications, filters.search, viewMode])

  const handleStatusChange = async (applicationId: string, newStatus: ApplicationStatus) => {
    const response = await fetch('/api/applications/batch-status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, status: newStatus }),
    })

    if (!response.ok) {
      throw new Error('Failed to update status')
    }

    // Optimistically update the local state
    setAllApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId ? { ...app, status: newStatus } : app
      )
    )
  }

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

  const handleViewTimeline = (application: Application) => {
    setTimelineApplication(application)
    setTimelineOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingApplication(null)
    }
  }

  // Stats - use allApplications for kanban, applications for list
  const statsSource = viewMode === 'kanban' ? allApplications : applications
  const stats = {
    total: pagination.total,
    active: statsSource.filter((a) =>
      ['APPLIED', 'SCREENING', 'INTERVIEWING'].includes(a.status)
    ).length,
    offers: statsSource.filter((a) => a.status === 'OFFER').length,
  }

  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 border rounded-lg">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Applications</h1>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>{pagination.total} Total</span>
            <span>{stats.active} Active</span>
            <span>{stats.offers} Offers</span>
          </div>
        </div>
        {/* View toggle */}
        <div className="flex border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'kanban'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Kanban
          </button>
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
        hideStatusFilter={viewMode === 'kanban'}
      />

      {loading ? (
        viewMode === 'kanban' ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="min-w-[280px] max-w-[280px] bg-gray-50 rounded-lg p-3 space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        ) : (
          renderLoadingSkeleton()
        )
      ) : viewMode === 'kanban' ? (
        allApplications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No applications found</p>
            <Button onClick={() => setFormOpen(true)}>Add your first application</Button>
          </div>
        ) : (
          <KanbanBoard
            applications={allApplications}
            onStatusChange={handleStatusChange}
            onCardClick={handleEdit}
          />
        )
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
                onViewTimeline={handleViewTimeline}
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

      <StatusTimeline
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
        application={timelineApplication}
      />
    </div>
  )
}