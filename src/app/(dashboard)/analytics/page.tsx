'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AnalysisReportDisplay } from '@/components/analytics/analysis-report'
import type { AnalysisReport, JobType } from '@/types/database'

const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
]

const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: '180', label: 'Last 6 Months' },
  { value: '365', label: 'Last Year' },
]

export default function AnalyticsPage() {
  const [reports, setReports] = useState<AnalysisReport[]>([])
  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [polling, setPolling] = useState<string | null>(null)

  // Filters for new report
  const [dateRange, setDateRange] = useState('all')
  const [jobType, setJobType] = useState<JobType | 'all'>('all')

  const loadReports = useCallback(async () => {
    try {
      const response = await fetch('/api/analysis')
      const { data, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      setReports(data || [])

      // Auto-select the most recent completed report
      if (data && data.length > 0 && !selectedReport) {
        const completedReport = data.find((r: AnalysisReport) => r.status === 'completed')
        if (completedReport) {
          setSelectedReport(completedReport)
        }
      }
    } catch (error) {
      console.error('Failed to load reports:', error)
      toast.error('Failed to load analysis reports')
    } finally {
      setLoading(false)
    }
  }, [selectedReport])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  // Poll for report completion
  useEffect(() => {
    if (!polling) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/analysis/${polling}`)
        const { data } = await response.json()

        if (data?.status === 'completed') {
          setPolling(null)
          setSelectedReport(data)
          setReports((prev) =>
            prev.map((r) => (r.id === data.id ? data : r))
          )
          toast.success('Analysis complete!')
        } else if (data?.status === 'failed') {
          setPolling(null)
          toast.error('Analysis failed', {
            description: data.error_message || 'Please try again',
          })
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(interval)
  }, [polling])

  async function generateReport() {
    setGenerating(true)

    try {
      const now = new Date()
      let dateFrom: string | undefined
      const dateTo: string | undefined = now.toISOString()

      if (dateRange !== 'all') {
        const days = parseInt(dateRange)
        const from = new Date(now)
        from.setDate(from.getDate() - days)
        dateFrom = from.toISOString()
      }

      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateFrom,
          dateTo,
          jobTypes: jobType !== 'all' ? [jobType] : undefined,
        }),
      })

      const { data, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      // Add the new report to the list and start polling
      setReports((prev) => [data, ...prev])
      setPolling(data.id)
      toast.success('Analysis started', {
        description: 'Your report is being generated...',
      })
    } catch (error) {
      console.error('Failed to generate report:', error)
      toast.error('Failed to start analysis')
    } finally {
      setGenerating(false)
    }
  }

  async function deleteReport(reportId: string) {
    try {
      const response = await fetch(`/api/analysis/${reportId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }

      setReports((prev) => prev.filter((r) => r.id !== reportId))
      if (selectedReport?.id === reportId) {
        setSelectedReport(null)
      }
      toast.success('Report deleted')
    } catch (error) {
      console.error('Failed to delete report:', error)
      toast.error('Failed to delete report')
    }
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64 md:col-span-2" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Generate & History */}
        <div className="space-y-6">
          {/* Generate New Report */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Analysis</CardTitle>
              <CardDescription>
                Get AI-powered insights on your job search
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_RANGES.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Job Type</label>
                <Select value={jobType} onValueChange={(v) => setJobType(v as JobType | 'all')}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {JOB_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={generateReport}
                disabled={generating || polling !== null}
              >
                {generating
                  ? 'Starting...'
                  : polling
                    ? 'Generating...'
                    : 'Generate Report'}
              </Button>
            </CardContent>
          </Card>

          {/* Report History */}
          <Card>
            <CardHeader>
              <CardTitle>Report History</CardTitle>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No reports yet. Generate your first analysis above.
                </p>
              ) : (
                <div className="space-y-2">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedReport?.id === report.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() =>
                        report.status === 'completed' && setSelectedReport(report)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(report.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {report.application_count} applications
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {report.status === 'pending' && (
                            <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                              Pending
                            </span>
                          )}
                          {report.status === 'processing' && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded animate-pulse">
                              Processing
                            </span>
                          )}
                          {report.status === 'completed' && (
                            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                              Complete
                            </span>
                          )}
                          {report.status === 'failed' && (
                            <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                              Failed
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteReport(report.id)
                            }}
                            className="text-gray-400 hover:text-red-500 p-1"
                            title="Delete report"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Report Display */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <AnalysisReportDisplay report={selectedReport} />
          ) : (
            <Card className="h-full min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mx-auto text-gray-300 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Report Selected
                </h3>
                <p className="text-gray-500 mb-4">
                  Generate a new analysis or select one from your history.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
