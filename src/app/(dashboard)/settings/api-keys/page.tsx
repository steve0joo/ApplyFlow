'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

interface ApiKeySettings {
  supabaseUrl: string | null;
  llmProvider: 'anthropic' | 'openai' | null;
  llmApiKeyMasked: string | null;
  hasLlmApiKey: boolean;
  byoaSetupComplete: boolean;
}

type SetupStep = 'supabase' | 'llm' | 'complete';
type ValidationStatus = 'idle' | 'validating' | 'success' | 'error' | 'warning';

export default function ApiKeysSettingsPage() {
  const [settings, setSettings] = useState<ApiKeySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<SetupStep>('supabase');

  // Supabase form state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [serviceKey, setServiceKey] = useState('');
  const [supabaseStatus, setSupabaseStatus] =
    useState<ValidationStatus>('idle');
  const [supabaseMessage, setSupabaseMessage] = useState('');

  // LLM form state
  const [llmProvider, setLlmProvider] = useState<'anthropic' | 'openai'>(
    'anthropic'
  );
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmStatus, setLlmStatus] = useState<ValidationStatus>('idle');
  const [llmMessage, setLlmMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const response = await fetch('/api/settings/api-keys');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);

        // Pre-fill form with existing values
        if (data.supabaseUrl) setSupabaseUrl(data.supabaseUrl);
        if (data.llmProvider) setLlmProvider(data.llmProvider);

        // Determine initial step
        if (data.byoaSetupComplete) {
          setCurrentStep('complete');
        } else if (data.supabaseUrl) {
          setCurrentStep('llm');
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function validateSupabase() {
    setSupabaseStatus('validating');
    setSupabaseMessage('');

    try {
      const response = await fetch('/api/settings/validate-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseUrl, anonKey, serviceKey }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setSupabaseStatus('success');
        setSupabaseMessage(data.message);
        toast.success(data.message);
      } else if (data.status === 'warning') {
        setSupabaseStatus('warning');
        setSupabaseMessage(data.message);
        toast.warning(data.message);
      } else {
        setSupabaseStatus('error');
        setSupabaseMessage(data.message);
        toast.error(data.message);
      }
    } catch {
      setSupabaseStatus('error');
      setSupabaseMessage('Failed to validate connection');
      toast.error('Failed to validate connection');
    }
  }

  async function saveSupabaseAndContinue() {
    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseUrl }),
      });

      if (response.ok) {
        setCurrentStep('llm');
        toast.success('Supabase configuration saved');
      } else {
        toast.error('Failed to save configuration');
      }
    } catch {
      toast.error('Failed to save configuration');
    }
  }

  async function validateLlm() {
    setLlmStatus('validating');
    setLlmMessage('');

    try {
      const response = await fetch('/api/settings/validate-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: llmProvider, apiKey: llmApiKey }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setLlmStatus('success');
        setLlmMessage(data.message);
        toast.success(data.message);
      } else {
        setLlmStatus('error');
        setLlmMessage(data.message);
        toast.error(data.message);
      }
    } catch {
      setLlmStatus('error');
      setLlmMessage('Failed to validate API key');
      toast.error('Failed to validate API key');
    }
  }

  async function saveLlmAndComplete() {
    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llmProvider,
          llmApiKey,
          byoaSetupComplete: true,
        }),
      });

      if (response.ok) {
        setCurrentStep('complete');
        setSettings((prev) =>
          prev
            ? {
                ...prev,
                byoaSetupComplete: true,
                llmProvider,
                hasLlmApiKey: true,
              }
            : null
        );
        toast.success('Setup complete!');
      } else {
        toast.error('Failed to save configuration');
      }
    } catch {
      toast.error('Failed to save configuration');
    }
  }

  function getStepProgress(): number {
    switch (currentStep) {
      case 'supabase':
        return 33;
      case 'llm':
        return 66;
      case 'complete':
        return 100;
    }
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">API Configuration</h1>
      <p className="text-gray-600 mb-6">
        Configure your own API keys to use ApplyFlow with your own accounts.
      </p>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span
            className={
              currentStep === 'supabase' ? 'font-medium' : 'text-gray-500'
            }
          >
            1. Supabase
          </span>
          <span
            className={currentStep === 'llm' ? 'font-medium' : 'text-gray-500'}
          >
            2. LLM Provider
          </span>
          <span
            className={
              currentStep === 'complete'
                ? 'font-medium text-green-600'
                : 'text-gray-500'
            }
          >
            3. Complete
          </span>
        </div>
        <Progress value={getStepProgress()} className="h-2" />
      </div>

      {/* Step 1: Supabase Configuration */}
      {currentStep === 'supabase' && (
        <Card>
          <CardHeader>
            <CardTitle>Supabase Configuration</CardTitle>
            <CardDescription>
              Connect your own Supabase project to store your application data.
              <br></br>
              Get your keys from{' '}
              <a
                href="https://app.supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                app.supabase.com
              </a>
              {' → Settings → API'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supabase-url">Project URL</Label>
              <Input
                id="supabase-url"
                placeholder="https://xxxxx.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anon-key">Anon Key (public)</Label>
              <Input
                id="anon-key"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-key">Service Role Key (optional)</Label>
              <Input
                id="service-key"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={serviceKey}
                onChange={(e) => setServiceKey(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Only needed if you want to run migrations from the app.
              </p>
            </div>

            {supabaseMessage && (
              <div
                className={`p-3 rounded text-sm ${
                  supabaseStatus === 'success'
                    ? 'bg-green-50 text-green-700'
                    : supabaseStatus === 'warning'
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {supabaseMessage}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={validateSupabase}
                disabled={
                  !supabaseUrl || !anonKey || supabaseStatus === 'validating'
                }
              >
                {supabaseStatus === 'validating'
                  ? 'Testing...'
                  : 'Test Connection'}
              </Button>
              <Button
                onClick={saveSupabaseAndContinue}
                disabled={
                  supabaseStatus !== 'success' && supabaseStatus !== 'warning'
                }
              >
                Save & Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: LLM Provider Configuration */}
      {currentStep === 'llm' && (
        <Card>
          <CardHeader>
            <CardTitle>LLM Provider</CardTitle>
            <CardDescription>
              Connect your LLM API for email classification and analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={llmProvider}
                onValueChange={(v) =>
                  setLlmProvider(v as 'anthropic' | 'openai')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="llm-key">API Key</Label>
              <Input
                id="llm-key"
                type="password"
                placeholder={
                  llmProvider === 'anthropic' ? 'sk-ant-api03-...' : 'sk-...'
                }
                value={llmApiKey}
                onChange={(e) => setLlmApiKey(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Get your API key from{' '}
                {llmProvider === 'anthropic' ? (
                  <a
                    href="https://console.anthropic.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    console.anthropic.com
                  </a>
                ) : (
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    platform.openai.com
                  </a>
                )}
              </p>
            </div>

            {llmMessage && (
              <div
                className={`p-3 rounded text-sm ${
                  llmStatus === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {llmMessage}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('supabase')}
              >
                Back
              </Button>
              <Button
                variant="outline"
                onClick={validateLlm}
                disabled={!llmApiKey || llmStatus === 'validating'}
              >
                {llmStatus === 'validating' ? 'Testing...' : 'Test API Key'}
              </Button>
              <Button
                onClick={saveLlmAndComplete}
                disabled={llmStatus !== 'success'}
              >
                Complete Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Complete */}
      {currentStep === 'complete' && (
        <div className="space-y-6">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800">Setup Complete</CardTitle>
              <CardDescription className="text-green-700">
                Your API keys are configured and ready to use.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Connected APIs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">Supabase</p>
                  <p className="text-sm text-gray-500">
                    {settings?.supabaseUrl || 'Not configured'}
                  </p>
                </div>
                <span className="text-green-600 text-sm font-medium">
                  Connected
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">
                    {settings?.llmProvider === 'anthropic'
                      ? 'Anthropic Claude'
                      : 'OpenAI GPT'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {settings?.llmApiKeyMasked || 'Not configured'}
                  </p>
                </div>
                <span className="text-green-600 text-sm font-medium">
                  Connected
                </span>
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" onClick={() => setCurrentStep('supabase')}>
            Reconfigure APIs
          </Button>
        </div>
      )}
    </div>
  );
}
