import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { User } from '@supabase/supabase-js'

interface AuthResult {
  user: User | null
  error: Error | null
  supabase: SupabaseClient
}

/**
 * Unified authentication helper that supports both:
 * - Cookie-based auth (web app)
 * - Bearer token auth (Chrome extension)
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization')

  // Check for Bearer token (extension auth)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    return { user, error, supabase }
  }

  // Fall back to cookie-based auth
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error, supabase }
}
