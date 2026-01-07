import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

// Schema for job extraction response
const jobExtractionSchema = z.object({
  jobTitle: z.string().nullable(),
  companyName: z.string().nullable(),
  location: z.string().nullable(),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  salaryCurrency: z.string().nullable(),
  jobType: z.enum(['internship', 'full_time', 'part_time', 'contract']).nullable(),
  locationType: z.enum(['remote', 'hybrid', 'onsite']).nullable(),
  description: z.string().nullable(),
})

const EXTRACTION_PROMPT = `You are a job posting extraction system. Extract job details from the following webpage text.

IMPORTANT: Return ONLY the JSON fields as specified. Use null for any field you cannot determine with confidence.

Rules:
- For salary, extract annual amounts. Convert hourly rates to annual (multiply by 2080).
- For jobType, use exact values: "internship", "full_time", "part_time", "contract"
- For locationType, use exact values: "remote", "hybrid", "onsite"
- For description, provide a brief 2-3 sentence summary of the role.
- Be conservative - only extract data you're confident about.`

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser(request)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { pageText, url, title } = body

  if (!pageText) {
    return NextResponse.json({ error: 'pageText is required' }, { status: 400 })
  }

  // Truncate page text if too long
  const truncatedText = pageText.length > 6000 ? pageText.slice(0, 6000) + '...' : pageText

  try {
    const { object } = await generateObject({
      model: anthropic('claude-3-haiku-20240307'),
      schema: jobExtractionSchema,
      system: EXTRACTION_PROMPT,
      prompt: `Page URL: ${url || 'Unknown'}
Page Title: ${title || 'Unknown'}

Webpage text:
${truncatedText}`,
    })

    // Clean up the response - remove null values
    const cleanedData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(object)) {
      if (value !== null && value !== undefined) {
        cleanedData[key] = value
      }
    }

    return NextResponse.json({ data: cleanedData })
  } catch (error) {
    console.error('LLM extraction failed:', error)
    return NextResponse.json(
      { error: 'Failed to extract job data' },
      { status: 500 }
    )
  }
}
