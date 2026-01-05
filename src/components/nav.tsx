'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { User } from '@supabase/supabase-js'

interface NavProps {
  user: User
}

export function Nav({ user }: NavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold">
            ApplyFlow
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors hover:text-gray-900 ${
                pathname === '/' ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              Applications
            </Link>
            <Link
              href="/analytics"
              className={`text-sm font-medium transition-colors hover:text-gray-900 ${
                isActive('/analytics') ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              Analytics
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {/* Settings dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`hidden sm:flex ${isActive('/settings') ? 'bg-gray-100' : ''}`}
              >
                Settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/settings/api-keys">API Configuration</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/email">Email Tracking</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                {user.user_metadata?.avatar_url ? (
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt="Avatar"
                    width={32}
                    height={32}
                    className="rounded-full"
                    unoptimized
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    {(user.email?.[0] || 'U').toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline">
                  {user.user_metadata?.name || user.email}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Mobile-only settings links */}
              <div className="sm:hidden">
                <DropdownMenuItem asChild>
                  <Link href="/settings/api-keys">API Configuration</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/email">Email Tracking</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </div>
              <DropdownMenuItem onClick={handleLogout}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
