import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { inngest } from '@/inngest/client'

// SendGrid sends multipart/form-data
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Extract email fields from SendGrid webhook
    const to = formData.get('to') as string
    const from = formData.get('from') as string
    const subject = formData.get('subject') as string
    const text = formData.get('text') as string
    const html = formData.get('html') as string

    // Validate required fields
    if (!to || !from || !subject) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Extract inbound email address (the "to" field)
    const inboundAddress = extractInboundAddress(to)
    if (!inboundAddress) {
      return NextResponse.json({ error: 'Invalid inbound address' }, { status: 400 })
    }

    // Look up user by inbound email address
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email_sync_enabled')
      .eq('inbound_email_address', inboundAddress)
      .single()

    if (userError || !user) {
      console.log('Unknown inbound address:', inboundAddress)
      return NextResponse.json({ error: 'Unknown inbound address' }, { status: 404 })
    }

    // Check if email sync is enabled for this user
    if (!user.email_sync_enabled) {
      return NextResponse.json({ message: 'Email sync disabled for user' }, { status: 200 })
    }

    // Parse sender info
    const { email: fromEmail, name: fromName } = parseEmailAddress(from)

    // Send to Inngest for processing
    await inngest.send({
      name: 'email/received',
      data: {
        userId: user.id,
        email: {
          from: fromEmail,
          fromName,
          subject,
          body: text || stripHtml(html) || '',
          receivedAt: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Extract the inbound email address from the "to" field
 * Handles formats like: "steve-abc123@inbound.applyflow.com"
 * or "Steve <steve-abc123@inbound.applyflow.com>"
 */
function extractInboundAddress(to: string): string | null {
  const match = to.match(/([a-z0-9-]+@inbound\.applyflow\.com)/i)
  return match ? match[1].toLowerCase() : null
}

/**
 * Parse email address from "Name <email>" format
 */
function parseEmailAddress(from: string): { email: string; name: string | undefined } {
  const match = from.match(/^(?:"?(.+?)"?\s*)?<?([^<>]+@[^<>]+)>?$/)
  if (match) {
    return {
      name: match[1]?.trim(),
      email: match[2].trim().toLowerCase(),
    }
  }
  return { email: from.trim().toLowerCase(), name: undefined }
}

/**
 * Basic HTML stripping for email body
 */
function stripHtml(html: string | null): string {
  if (!html) return ''
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
