import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { inngest } from '@/inngest/client'
import type { JobType } from '@/types/database'

/**
 * GET /api/analysis - List analysis reports for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error, supabase } = await getAuthenticatedUser(request)

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data, error: fetchError, count } = await supabase
      .from('analysis_reports')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    return NextResponse.json({ data, count })
  } catch (error) {
    console.error('Failed to fetch analysis reports:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/analysis - Create a new analysis report
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error, supabase } = await getAuthenticatedUser(request)

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { dateFrom, dateTo, jobTypes } = body as {
      dateFrom?: string
      dateTo?: string
      jobTypes?: JobType[]
    }

    // Create the report record
    const { data: report, error: insertError } = await supabase
      .from('analysis_reports')
      .insert({
        user_id: user.id,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        job_types: jobTypes || null,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Send event to Inngest to process the analysis
    await inngest.send({
      name: 'analysis/run',
      data: {
        reportId: report.id,
        userId: user.id,
        dateFrom,
        dateTo,
        jobTypes,
      },
    })

    return NextResponse.json({ data: report }, { status: 201 })
  } catch (error) {
    console.error('Failed to create analysis report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
