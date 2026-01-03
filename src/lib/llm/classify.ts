import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import type { ParsedEmail } from '../email/ats-patterns'
import type { EmailClassification } from '../email/status-transitions'

// Schema for classification response
const classificationSchema = z.object({
  type: z.enum([
    'REJECTION',
    'INTERVIEW_REQUEST',
    'OFFER',
    'SCREENING_INVITE',
    'ASSESSMENT_REQUEST',
    'GENERIC_UPDATE',
    'UNRELATED',
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  extractedData: z.object({
    interviewDate: z.string().nullable().optional(),
    interviewTime: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(),
    nextSteps: z.string().nullable().optional(),
  }).optional(),
})

export type ClassificationResult = z.infer<typeof classificationSchema>

const CLASSIFICATION_PROMPT = `You are an AI assistant that classifies job application emails. Analyze the email and determine its category.

Categories:
- REJECTION: Company decided not to move forward with the candidate. Look for phrases like "not moving forward", "other candidates", "unfortunately", "not selected".
- INTERVIEW_REQUEST: Interview invitation for any round (phone, video, onsite). Look for scheduling links, specific times, interviewer names.
- OFFER: Job offer extended. Look for "pleased to offer", "offer letter", compensation details.
- SCREENING_INVITE: Initial phone screen or recruiter call. Often the first interaction after applying.
- ASSESSMENT_REQUEST: Request to complete a coding challenge, take-home assignment, or assessment.
- GENERIC_UPDATE: Application received, under review, or general status update with no specific outcome.
- UNRELATED: Not related to a job application (marketing, spam, newsletters).

Important:
- Be accurate with confidence scores. Use 0.9+ only when very certain.
- Extract any dates, times, or deadlines mentioned.
- Consider the sender and subject line as context.`

/**
 * Classify a job application email using Claude Haiku
 */
export async function classifyEmail(email: ParsedEmail): Promise<ClassificationResult> {
  const emailContent = formatEmailForClassification(email)

  try {
    const { object } = await generateObject({
      model: anthropic('claude-3-haiku-20240307'),
      schema: classificationSchema,
      system: CLASSIFICATION_PROMPT,
      prompt: emailContent,
    })

    return object
  } catch (error) {
    console.error('Email classification failed:', error)
    // Return a safe default
    return {
      type: 'GENERIC_UPDATE',
      confidence: 0.5,
      reasoning: 'Classification failed, defaulting to generic update',
    }
  }
}

/**
 * Format email for classification prompt
 */
function formatEmailForClassification(email: ParsedEmail): string {
  const bodyPreview = email.body.slice(0, 2000) // Limit body length

  return `From: ${email.fromName || 'Unknown'} <${email.from}>
Subject: ${email.subject}
Date: ${email.receivedAt.toISOString()}

Body:
${bodyPreview}`
}

/**
 * Check if classification indicates a significant status change
 */
export function isSignificantClassification(type: EmailClassification): boolean {
  return ['REJECTION', 'INTERVIEW_REQUEST', 'OFFER', 'SCREENING_INVITE'].includes(type)
}
