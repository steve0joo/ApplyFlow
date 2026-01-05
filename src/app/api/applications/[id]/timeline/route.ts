import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { user, error: authError, supabase } = await getAuthenticatedUser(request)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify the application belongs to the user
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, job_title, company_name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Fetch status history with related email info
    const { data: history, error: historyError } = await supabase
      .from('status_history')
      .select(`
        id,
        from_status,
        to_status,
        trigger_type,
        trigger_email_id,
        created_at,
        application_emails (
          id,
          subject,
          from_address,
          classification
        )
      `)
      .eq('application_id', id)
      .order('created_at', { ascending: false })

    if (historyError) {
      console.error('Error fetching status history:', historyError)
      return NextResponse.json(
        { error: 'Failed to fetch timeline' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      application,
      history: history || [],
    })
  } catch (error) {
    console.error('Error in timeline:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
