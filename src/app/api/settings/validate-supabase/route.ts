import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { supabaseUrl, anonKey, serviceKey } = body

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { status: 'error', message: 'Supabase URL and Anon Key are required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(supabaseUrl)
    } catch {
      return NextResponse.json(
        { status: 'error', message: 'Invalid Supabase URL format' },
        { status: 400 }
      )
    }

    // Test connection with service key if provided, otherwise anon key
    const testKey = serviceKey || anonKey
    const testClient = createClient(supabaseUrl, testKey)

    // Try to make a simple query to test connection
    const { error: connectionError } = await testClient
      .from('_test_connection')
      .select('*')
      .limit(1)

    // PGRST116 means table doesn't exist, which is fine - connection works
    if (connectionError && connectionError.code !== 'PGRST116') {
      // Check for auth errors
      if (connectionError.code === 'PGRST301' || connectionError.message.includes('JWT')) {
        return NextResponse.json({
          status: 'error',
          message: 'Invalid API key. Please check your Supabase keys.',
        })
      }

      // Generic connection error
      return NextResponse.json({
        status: 'error',
        message: `Connection failed: ${connectionError.message}`,
      })
    }

    // Check if ApplyFlow schema exists by checking for applications table
    const { error: schemaError } = await testClient
      .from('applications')
      .select('id')
      .limit(1)

    if (schemaError && schemaError.code === 'PGRST116') {
      return NextResponse.json({
        status: 'warning',
        message: 'Connected successfully, but ApplyFlow schema not found. Run the migrations to create tables.',
        action: 'run_migrations',
      })
    }

    return NextResponse.json({
      status: 'success',
      message: 'Connected to Supabase successfully!',
    })
  } catch (error) {
    console.error('Supabase validation error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to validate Supabase connection' },
      { status: 500 }
    )
  }
}
