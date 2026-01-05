'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { AnalysisReport } from '@/types/database'

interface AnalysisReportDisplayProps {
  report: AnalysisReport
}

export function AnalysisReportDisplay({ report }: AnalysisReportDisplayProps) {
  const stats = report.statistics
  const patterns = report.patterns

  return (
    <div className="space-y-6">
      {/* Summary */}
      {patterns.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{patterns.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
          <CardDescription>
            Based on {report.application_count} applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              label="Response Rate"
              value={`${stats.response_rate || 0}%`}
              progress={stats.response_rate || 0}
              color="blue"
            />
            <StatCard
              label="Interview Rate"
              value={`${stats.interview_rate || 0}%`}
              progress={stats.interview_rate || 0}
              color="green"
            />
            <StatCard
              label="Offer Rate"
              value={`${stats.offer_rate || 0}%`}
              progress={stats.offer_rate || 0}
              color="purple"
            />
            <StatCard
              label="Rejection Rate"
              value={`${stats.rejection_rate || 0}%`}
              progress={stats.rejection_rate || 0}
              color="red"
            />
            <StatCard
              label="Ghosted Rate"
              value={`${stats.ghosted_rate || 0}%`}
              progress={stats.ghosted_rate || 0}
              color="gray"
            />
            <StatCard
              label="Avg. Response Time"
              value={`${stats.avg_days_to_response || 0} days`}
              color="yellow"
            />
          </div>
        </CardContent>
      </Card>

      {/* Key Findings */}
      {patterns.key_findings && patterns.key_findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {patterns.key_findings.map((finding, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span className="text-gray-700">{finding}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Strengths & Areas for Improvement */}
      <div className="grid md:grid-cols-2 gap-6">
        {patterns.strengths && patterns.strengths.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {patterns.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">+</span>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {patterns.areas_for_improvement && patterns.areas_for_improvement.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-700">Areas for Improvement</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {patterns.areas_for_improvement.map((area, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">!</span>
                    <span className="text-gray-700">{area}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>
              Actionable suggestions to improve your job search
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg"
                >
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-gray-700">{rec}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Metadata */}
      <div className="flex flex-wrap gap-2 text-sm text-gray-500">
        <span>Generated: {new Date(report.created_at).toLocaleString()}</span>
        {report.date_from && (
          <span>• From: {new Date(report.date_from).toLocaleDateString()}</span>
        )}
        {report.date_to && (
          <span>• To: {new Date(report.date_to).toLocaleDateString()}</span>
        )}
        {report.job_types && report.job_types.length > 0 && (
          <span>
            • Job Types:{' '}
            {report.job_types.map((jt) => (
              <Badge key={jt} variant="outline" className="ml-1">
                {jt}
              </Badge>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  progress?: number
  color: 'blue' | 'green' | 'purple' | 'red' | 'gray' | 'yellow'
}

function StatCard({ label, value, progress, color }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    red: 'text-red-600',
    gray: 'text-gray-600',
    yellow: 'text-yellow-600',
  }

  const progressColors: Record<string, string> = {
    blue: '[&>div]:bg-blue-500',
    green: '[&>div]:bg-green-500',
    purple: '[&>div]:bg-purple-500',
    red: '[&>div]:bg-red-500',
    gray: '[&>div]:bg-gray-500',
    yellow: '[&>div]:bg-yellow-500',
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      {progress !== undefined && (
        <Progress value={progress} className={`mt-2 h-1.5 ${progressColors[color]}`} />
      )}
    </div>
  )
}
