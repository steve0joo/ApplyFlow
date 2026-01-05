import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { processEmail } from '@/inngest/functions/process-email'
import { runAnalysis } from '@/inngest/functions/run-analysis'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processEmail, runAnalysis],
})
