import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, apiKey } = body

    if (!provider || !apiKey) {
      return NextResponse.json(
        { status: 'error', message: 'Provider and API key are required' },
        { status: 400 }
      )
    }

    if (!['anthropic', 'openai'].includes(provider)) {
      return NextResponse.json(
        { status: 'error', message: 'Provider must be "anthropic" or "openai"' },
        { status: 400 }
      )
    }

    // Test the API key with a simple request
    try {
      if (provider === 'anthropic') {
        const anthropic = createAnthropic({ apiKey })
        await generateText({
          model: anthropic('claude-3-haiku-20240307'),
          prompt: 'Reply with "ok"',
        })
      } else {
        const openai = createOpenAI({ apiKey })
        await generateText({
          model: openai('gpt-4o-mini'),
          prompt: 'Reply with "ok"',
        })
      }

      return NextResponse.json({
        status: 'success',
        message: `Connected to ${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} successfully!`,
      })
    } catch (llmError: unknown) {
      const error = llmError as { status?: number; message?: string }

      if (error.status === 401) {
        return NextResponse.json({
          status: 'error',
          message: 'Invalid API key. Please check your credentials.',
        })
      }

      if (error.status === 429) {
        return NextResponse.json({
          status: 'error',
          message: 'Rate limit exceeded. Please try again later.',
        })
      }

      if (error.status === 403) {
        return NextResponse.json({
          status: 'error',
          message: 'Access denied. Please check your API key permissions.',
        })
      }

      return NextResponse.json({
        status: 'error',
        message: `Validation failed: ${error.message || 'Unknown error'}`,
      })
    }
  } catch (error) {
    console.error('LLM validation error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to validate LLM connection' },
      { status: 500 }
    )
  }
}
