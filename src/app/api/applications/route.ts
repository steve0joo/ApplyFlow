import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApplicationInsert, ApplicationStatus, JobType } from '@/types/database'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.getAll('status') as ApplicationStatus[]
  const jobType = searchParams.getAll('jobType') as JobType[]
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  let query = supabase
    .from('applications')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (status.length > 0) {
    query = query.in('status', status)
  }

  if (jobType.length > 0) {
    query = query.in('job_type', jobType)
  }

  if (search) {
    query = query.or(`company_name.ilike.%${search}%,job_title.ilike.%${search}%`)
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Generate URL hash for duplicate detection
  let jobUrlHash: string | null = null
  if (body.job_url) {
    jobUrlHash = crypto.createHash('sha256').update(body.job_url).digest('hex')
  }

  const application: ApplicationInsert = {
    user_id: user.id,
    job_title: body.job_title,
    company_name: body.company_name,
    job_url: body.job_url || null,
    job_url_hash: jobUrlHash,
    location: body.location || null,
    location_type: body.location_type || null,
    salary_min: body.salary_min || null,
    salary_max: body.salary_max || null,
    salary_currency: body.salary_currency || 'USD',
    job_type: body.job_type || 'full_time',
    job_description: body.job_description || null,
    requirements: body.requirements || null,
    status: body.status || 'SAVED',
    source: body.source || 'manual',
    notes: body.notes || null,
    date_applied: body.date_applied || null,
  }

  const { data, error } = await supabase
    .from('applications')
    .insert(application)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'This job URL has already been tracked' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
