import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import type { ApplicationStatus } from '@/types/database'

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const { user, error: authError, supabase } = await getAuthenticatedUser(request)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { applicationId, status } = body

    if (!applicationId || !status) {
      return NextResponse.json(
        { error: 'applicationId and status are required' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses: ApplicationStatus[] = [
      'SAVED', 'APPLIED', 'SCREENING', 'INTERVIEWING',
      'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'GHOSTED'
    ]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Verify the application belongs to the user
    const { data: existingApp, error: fetchError } = await supabase
      .from('applications')
      .select('id, status')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingApp) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // If status is the same, no update needed
    if (existingApp.status === status) {
      return NextResponse.json({ success: true, unchanged: true })
    }

    // Update the application status
    const { error: updateError } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', applicationId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating application status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      )
    }

    // Note: status_history is automatically created via database trigger
    // The trigger sets trigger_type to 'manual', but we could update it if needed

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in batch-status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
