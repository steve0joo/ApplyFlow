import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { matchEmailToApplication, getSuggestedApplications } from '@/lib/email/matching'
import { classifyEmail } from '@/lib/llm/classify'
import { getStatusTransition, getTriggerType } from '@/lib/email/status-transitions'
import type { ParsedEmail } from '@/lib/email/ats-patterns'

interface EmailReceivedEvent {
  name: 'email/received'
  data: {
    userId: string
    email: {
      from: string
      fromName?: string
      subject: string
      body: string
      receivedAt: string
    }
  }
}

export const processEmail = inngest.createFunction(
  {
    id: 'process-email',
    retries: 3,
  },
  { event: 'email/received' },
  async ({ event, step }) => {
    const { userId, email: rawEmail } = event.data

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Parse email data
    const email: ParsedEmail = {
      from: rawEmail.from,
      fromName: rawEmail.fromName,
      subject: rawEmail.subject,
      body: rawEmail.body,
      receivedAt: new Date(rawEmail.receivedAt),
    }

    // Step 1: Match email to application
    const matchResult = await step.run('match-application', async () => {
      return matchEmailToApplication(supabase, userId, email)
    })

    // Step 2: Classify email with LLM
    const classification = await step.run('classify-email', async () => {
      return classifyEmail(email)
    })

    // Step 3: Create email record
    const emailRecord = await step.run('create-email-record', async () => {
      const { data, error } = await supabase
        .from('application_emails')
        .insert({
          user_id: userId,
          application_id: matchResult.applicationId,
          from_address: email.from,
          from_name: email.fromName,
          subject: email.subject,
          body_preview: email.body.slice(0, 500),
          received_at: email.receivedAt.toISOString(),
          classification: classification.type,
          classification_confidence: classification.confidence,
          extracted_data: classification.extractedData || {},
        })
        .select()
        .single()

      if (error) throw error
      return data
    })

    // Step 4: Handle unmatched email
    if (!matchResult.applicationId) {
      await step.run('create-unmatched-record', async () => {
        const suggestions = await getSuggestedApplications(supabase, userId, email)

        await supabase.from('unmatched_emails').insert({
          user_id: userId,
          email_id: emailRecord.id,
          suggested_application_ids: suggestions.map((s) => s.id),
          status: 'pending',
        })
      })

      return {
        status: 'unmatched',
        emailId: emailRecord.id,
        classification: classification.type,
        confidence: classification.confidence,
      }
    }

    // Step 5: Get current application status
    const application = await step.run('get-application', async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, status, company_name, job_title')
        .eq('id', matchResult.applicationId)
        .single()

      if (error) throw error
      return data
    })

    // Step 6: Determine if status should be updated
    const transition = getStatusTransition(
      classification.type,
      classification.confidence,
      application.status
    )

    // Step 7: Update application status if needed
    if (transition.shouldUpdate && transition.newStatus) {
      await step.run('update-application-status', async () => {
        // Update the application status
        const { error: updateError } = await supabase
          .from('applications')
          .update({ status: transition.newStatus })
          .eq('id', matchResult.applicationId)

        if (updateError) throw updateError

        // Note: status_history is auto-created by database trigger
        // But we can add more details by updating the trigger_type

        // Update the status history record with email trigger info
        const { error: historyError } = await supabase
          .from('status_history')
          .update({
            trigger_type: getTriggerType(classification.confidence),
            trigger_email_id: emailRecord.id,
          })
          .eq('application_id', matchResult.applicationId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (historyError) {
          console.warn('Failed to update status history:', historyError)
        }
      })
    }

    return {
      status: 'processed',
      emailId: emailRecord.id,
      applicationId: matchResult.applicationId,
      classification: classification.type,
      confidence: classification.confidence,
      statusUpdated: transition.shouldUpdate,
      newStatus: transition.newStatus,
      needsReview: transition.needsReview,
    }
  }
)
