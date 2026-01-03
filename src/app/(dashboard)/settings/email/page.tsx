'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

interface UserSettings {
  inbound_email_address: string | null
  email_sync_enabled: boolean
}

const ATS_DOMAINS = [
  '*@greenhouse.io',
  '*@lever.co',
  '*@ashbyhq.com',
  '*@jobvite.com',
  '*@workday.com',
  '*@myworkdayjobs.com',
  '*@icims.com',
  '*@smartrecruiters.com',
]

export default function EmailSettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<'address' | 'filter' | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from('users')
      .select('inbound_email_address, email_sync_enabled')
      .eq('id', user.id)
      .single()

    setSettings(data)
    setLoading(false)
  }

  async function toggleEmailSync(enabled: boolean) {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { error } = await supabase
      .from('users')
      .update({ email_sync_enabled: enabled })
      .eq('id', user.id)

    if (error) {
      toast.error('Failed to update settings')
    } else {
      setSettings((prev) => prev ? { ...prev, email_sync_enabled: enabled } : null)
      toast.success(
        enabled ? 'Email sync enabled' : 'Email sync disabled',
        {
          description: enabled
            ? 'You will now receive automatic status updates from forwarded emails.'
            : 'Email forwarding is now disabled.',
        }
      )
    }

    setSaving(false)
  }

  async function copyToClipboard(text: string, type: 'address' | 'filter') {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
    toast.success(
      'Copied!',
      { description: type === 'address' ? 'Email address copied to clipboard' : 'Filter string copied to clipboard' }
    )
  }

  const filterString = ATS_DOMAINS.join(' OR ')

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Email Settings</h1>

      <div className="space-y-6">
        {/* Enable/Disable Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Automatic Email Tracking</span>
              <Switch
                checked={settings?.email_sync_enabled ?? false}
                onCheckedChange={toggleEmailSync}
                disabled={saving}
              />
            </CardTitle>
            <CardDescription>
              Automatically update application status based on forwarded emails from job boards.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Forwarding Address */}
        <Card>
          <CardHeader>
            <CardTitle>Your Forwarding Address</CardTitle>
            <CardDescription>
              Forward job-related emails to this address to automatically track status updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                {settings?.inbound_email_address || 'Loading...'}
              </code>
              <Button
                variant="outline"
                onClick={() => settings?.inbound_email_address && copyToClipboard(settings.inbound_email_address, 'address')}
              >
                {copied === 'address' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gmail Filter Setup */}
        <Card>
          <CardHeader>
            <CardTitle>Gmail Filter Setup</CardTitle>
            <CardDescription>
              Set up a Gmail filter to automatically forward job emails. This ensures all ATS emails are captured.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Step 1: Go to Gmail Settings</p>
              <p className="text-sm text-gray-600">
                Settings → Filters and Blocked Addresses → Create a new filter
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Step 2: Add this to the &ldquo;From&rdquo; field:</p>
              <div className="flex items-start gap-2">
                <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-xs font-mono break-all">
                  {filterString}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(filterString, 'filter')}
                >
                  {copied === 'filter' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Step 3: Set the action</p>
              <p className="text-sm text-gray-600">
                Check &ldquo;Forward it to&rdquo; and paste your forwarding address above.
              </p>
            </div>

            <div className="bg-blue-50 p-3 rounded text-sm">
              <p className="font-medium text-blue-900">Tip:</p>
              <p className="text-blue-700">
                You may need to verify the forwarding address first. Check your ApplyFlow inbox for a verification email from Gmail.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ATS Providers */}
        <Card>
          <CardHeader>
            <CardTitle>Supported Job Boards</CardTitle>
            <CardDescription>
              We automatically detect and process emails from these Applicant Tracking Systems.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {['Greenhouse', 'Lever', 'Ashby', 'Jobvite', 'Workday', 'iCIMS', 'SmartRecruiters', 'LinkedIn'].map(
                (ats) => (
                  <span key={ats} className="px-2 py-1 bg-gray-100 rounded text-sm">
                    {ats}
                  </span>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
