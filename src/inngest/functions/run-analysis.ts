import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import type { Application, ApplicationStatus, JobType } from '@/types/database'

interface AnalysisRequestEvent {
  name: 'analysis/run'
  data: {
    reportId: string
    userId: string
    dateFrom?: string
    dateTo?: string
    jobTypes?: JobType[]
  }
}

// Schema for LLM pattern analysis
const patternAnalysisSchema = z.object({
  summary: z.string().describe('A 2-3 sentence summary of the application patterns'),
  key_findings: z.array(z.string()).describe('3-5 key findings from the data'),
  strengths: z.array(z.string()).describe('2-3 strengths in the job search approach'),
  areas_for_improvement: z.array(z.string()).describe('2-3 areas that could be improved'),
  recommendations: z.array(z.string()).describe('4-6 actionable recommendations'),
})

type PatternAnalysis = z.infer<typeof patternAnalysisSchema>

/**
 * Calculate statistics from applications
 */
function calculateStatistics(applications: Application[]): Record<string, number> {
  const total = applications.length
  if (total === 0) {
    return {
      total_applications: 0,
      response_rate: 0,
      interview_rate: 0,
      offer_rate: 0,
      rejection_rate: 0,
      ghosted_rate: 0,
      avg_days_to_response: 0,
    }
  }

  // Count statuses
  const statusCounts: Record<string, number> = {}
  const responsiveStatuses: ApplicationStatus[] = [
    'SCREENING',
    'INTERVIEWING',
    'OFFER',
    'ACCEPTED',
    'REJECTED',
  ]

  for (const app of applications) {
    statusCounts[app.status] = (statusCounts[app.status] || 0) + 1
  }

  // Calculate rates
  const responsiveCount = responsiveStatuses.reduce(
    (sum, status) => sum + (statusCounts[status] || 0),
    0
  )

  const interviewCount =
    (statusCounts['INTERVIEWING'] || 0) +
    (statusCounts['OFFER'] || 0) +
    (statusCounts['ACCEPTED'] || 0)

  const offerCount = (statusCounts['OFFER'] || 0) + (statusCounts['ACCEPTED'] || 0)

  // Calculate average days to first response
  let totalDaysToResponse = 0
  let appsWithResponse = 0

  for (const app of applications) {
    if (app.date_applied && responsiveStatuses.includes(app.status)) {
      const applied = new Date(app.date_applied)
      const updated = new Date(app.updated_at)
      const days = Math.floor((updated.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24))
      if (days >= 0 && days < 365) {
        // Sanity check
        totalDaysToResponse += days
        appsWithResponse++
      }
    }
  }

  return {
    total_applications: total,
    response_rate: Math.round((responsiveCount / total) * 100),
    interview_rate: Math.round((interviewCount / total) * 100),
    offer_rate: Math.round((offerCount / total) * 100),
    rejection_rate: Math.round(((statusCounts['REJECTED'] || 0) / total) * 100),
    ghosted_rate: Math.round(((statusCounts['GHOSTED'] || 0) / total) * 100),
    avg_days_to_response: appsWithResponse > 0 ? Math.round(totalDaysToResponse / appsWithResponse) : 0,
  }
}

/**
 * Format applications for LLM analysis
 */
function formatApplicationsForAnalysis(applications: Application[], stats: Record<string, number>): string {
  const statusBreakdown = applications.reduce(
    (acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const jobTypeBreakdown = applications.reduce(
    (acc, app) => {
      acc[app.job_type] = (acc[app.job_type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const locationBreakdown = applications.reduce(
    (acc, app) => {
      const loc = app.location_type || 'unknown'
      acc[loc] = (acc[loc] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const sourceBreakdown = applications.reduce(
    (acc, app) => {
      acc[app.source] = (acc[app.source] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // Get sample of companies (recent)
  const recentCompanies = applications
    .slice(0, 20)
    .map((a) => `${a.company_name} - ${a.job_title} (${a.status})`)
    .join('\n')

  return `Job Search Analysis Data:

STATISTICS:
- Total Applications: ${stats.total_applications}
- Response Rate: ${stats.response_rate}%
- Interview Rate: ${stats.interview_rate}%
- Offer Rate: ${stats.offer_rate}%
- Rejection Rate: ${stats.rejection_rate}%
- Ghosted Rate: ${stats.ghosted_rate}%
- Average Days to Response: ${stats.avg_days_to_response}

STATUS BREAKDOWN:
${Object.entries(statusBreakdown)
  .map(([status, count]) => `- ${status}: ${count}`)
  .join('\n')}

JOB TYPE BREAKDOWN:
${Object.entries(jobTypeBreakdown)
  .map(([type, count]) => `- ${type}: ${count}`)
  .join('\n')}

LOCATION TYPE BREAKDOWN:
${Object.entries(locationBreakdown)
  .map(([type, count]) => `- ${type}: ${count}`)
  .join('\n')}

APPLICATION SOURCES:
${Object.entries(sourceBreakdown)
  .map(([source, count]) => `- ${source}: ${count}`)
  .join('\n')}

SAMPLE OF RECENT APPLICATIONS:
${recentCompanies}`
}

const ANALYSIS_PROMPT = `You are a career coach and job search strategist analyzing a user's job application data.
Based on the statistics and application data provided, identify patterns and provide actionable recommendations.

Focus on:
1. What's working well in their job search
2. What could be improved
3. Specific, actionable recommendations
4. Any concerning patterns (high ghosted rate, low response rate, etc.)

Be encouraging but honest. Provide practical advice they can implement immediately.
Keep recommendations specific and actionable, not generic career advice.`

export const runAnalysis = inngest.createFunction(
  {
    id: 'run-analysis',
    retries: 2,
  },
  { event: 'analysis/run' },
  async ({ event, step }) => {
    const { reportId, userId, dateFrom, dateTo, jobTypes } = event.data

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Step 1: Update report status to processing
    await step.run('update-status-processing', async () => {
      const { error } = await supabase
        .from('analysis_reports')
        .update({ status: 'processing' })
        .eq('id', reportId)

      if (error) throw error
    })

    // Step 2: Fetch applications
    const applications = await step.run('fetch-applications', async () => {
      let query = supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (dateFrom) {
        query = query.gte('created_at', dateFrom)
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo)
      }
      if (jobTypes && jobTypes.length > 0) {
        query = query.in('job_type', jobTypes)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Application[]
    })

    // Handle empty applications
    if (applications.length === 0) {
      await step.run('save-empty-report', async () => {
        const { error } = await supabase
          .from('analysis_reports')
          .update({
            status: 'completed',
            application_count: 0,
            statistics: { total_applications: 0 },
            patterns: {
              summary: 'No applications found in the selected date range.',
              key_findings: [],
              strengths: [],
              areas_for_improvement: [],
            },
            recommendations: ['Start tracking your job applications to get personalized insights.'],
            completed_at: new Date().toISOString(),
          })
          .eq('id', reportId)

        if (error) throw error
      })

      return { status: 'completed', applicationCount: 0 }
    }

    // Step 3: Calculate statistics
    const statistics = await step.run('calculate-statistics', async () => {
      return calculateStatistics(applications)
    })

    // Step 4: Run LLM analysis
    const patternAnalysis = await step.run('analyze-patterns', async () => {
      const analysisData = formatApplicationsForAnalysis(applications, statistics)

      try {
        const { object } = await generateObject({
          model: anthropic('claude-3-5-sonnet-20241022'),
          schema: patternAnalysisSchema,
          system: ANALYSIS_PROMPT,
          prompt: analysisData,
        })

        return object as PatternAnalysis
      } catch (error) {
        console.error('LLM analysis failed:', error)
        // Return default analysis if LLM fails
        return {
          summary: `Analysis of ${applications.length} applications shows a ${statistics.response_rate}% response rate.`,
          key_findings: [
            `Total applications: ${applications.length}`,
            `Interview rate: ${statistics.interview_rate}%`,
            `Average response time: ${statistics.avg_days_to_response} days`,
          ],
          strengths: ['Consistent application tracking'],
          areas_for_improvement: ['Continue applying to more positions'],
          recommendations: [
            'Keep tracking your applications for better insights',
            'Follow up on applications after 1-2 weeks',
            'Tailor your resume for each application',
          ],
        }
      }
    })

    // Step 5: Save completed report
    await step.run('save-report', async () => {
      const { error } = await supabase
        .from('analysis_reports')
        .update({
          status: 'completed',
          application_count: applications.length,
          statistics,
          patterns: {
            summary: patternAnalysis.summary,
            key_findings: patternAnalysis.key_findings,
            strengths: patternAnalysis.strengths,
            areas_for_improvement: patternAnalysis.areas_for_improvement,
          },
          recommendations: patternAnalysis.recommendations,
          completed_at: new Date().toISOString(),
        })
        .eq('id', reportId)

      if (error) throw error
    })

    return {
      status: 'completed',
      reportId,
      applicationCount: applications.length,
      statistics,
    }
  }
)
