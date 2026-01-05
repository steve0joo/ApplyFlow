import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { encrypt, decrypt, maskApiKey } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { user, error: authError, supabase } = await getAuthenticatedUser(request)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user settings
    const { data: userData, error } = await supabase
      .from('users')
      .select('supabase_url, llm_provider, llm_api_key_encrypted, byoa_setup_complete')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    // Mask the API key for display
    let maskedApiKey: string | null = null
    if (userData.llm_api_key_encrypted) {
      try {
        const decrypted = decrypt(userData.llm_api_key_encrypted)
        maskedApiKey = maskApiKey(decrypted)
      } catch {
        // If decryption fails, show generic mask
        maskedApiKey = '***'
      }
    }

    return NextResponse.json({
      supabaseUrl: userData.supabase_url,
      llmProvider: userData.llm_provider,
      llmApiKeyMasked: maskedApiKey,
      hasLlmApiKey: !!userData.llm_api_key_encrypted,
      byoaSetupComplete: userData.byoa_setup_complete,
    })
  } catch (error) {
    console.error('Error getting API keys:', error)
    return NextResponse.json(
      { error: 'Failed to get API keys' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const { user, error: authError, supabase } = await getAuthenticatedUser(request)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { supabaseUrl, llmProvider, llmApiKey, byoaSetupComplete } = body

    // Build update object
    const updates: Record<string, unknown> = {}

    if (supabaseUrl !== undefined) {
      updates.supabase_url = supabaseUrl || null
    }

    if (llmProvider !== undefined) {
      if (llmProvider && !['anthropic', 'openai'].includes(llmProvider)) {
        return NextResponse.json(
          { error: 'Provider must be "anthropic" or "openai"' },
          { status: 400 }
        )
      }
      updates.llm_provider = llmProvider || null
    }

    if (llmApiKey !== undefined) {
      // Encrypt the API key before storing
      updates.llm_api_key_encrypted = llmApiKey ? encrypt(llmApiKey) : null
    }

    if (byoaSetupComplete !== undefined) {
      updates.byoa_setup_complete = byoaSetupComplete
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update user settings
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)

    if (error) {
      console.error('Error updating user settings:', error)
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating API keys:', error)
    return NextResponse.json(
      { error: 'Failed to update API keys' },
      { status: 500 }
    )
  }
}
