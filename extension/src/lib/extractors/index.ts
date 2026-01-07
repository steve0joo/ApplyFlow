/**
 * Intelligent Job Extraction Pipeline
 *
 * Four-layer extraction system that works on any job page:
 * 1. Structured Data (JSON-LD, OpenGraph) - highest confidence
 * 2. Job Page Detection - confirms this is a job page
 * 3. Intelligent DOM Extraction - semantic HTML patterns
 * 4. LLM Fallback (Claude Haiku) - when other layers fail
 */

export * from './types'

import type { ExtractedJobData, ExtractionResult, MergedResult, JobDetectionResult } from './types'
import { extractStructuredData } from './structured-data'
import { detectJobPage, isKnownJobBoard } from './job-detection'
import { extractFromDom } from './dom-extraction'
import { extractWithLLM } from './llm-fallback'
import { mergeResults, hasMinimumData } from './merger'

/**
 * Configuration for the extraction pipeline
 */
export interface ExtractionConfig {
  /** Skip job page detection (use when you know it's a job page) */
  skipDetection?: boolean
  /** Skip LLM fallback (save API costs) */
  skipLLM?: boolean
  /** Minimum confidence threshold */
  minConfidence?: number
  /** Enable debug logging */
  debug?: boolean
}

const DEFAULT_CONFIG: ExtractionConfig = {
  skipDetection: false,
  skipLLM: false,
  minConfidence: 0.5,
  debug: false
}

/**
 * Main extraction function - orchestrates all layers
 */
export async function extractJobData(
  config: ExtractionConfig = {}
): Promise<{
  success: boolean
  data?: ExtractedJobData
  detection?: JobDetectionResult
  mergedResult?: MergedResult
  error?: string
}> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const log = cfg.debug ? console.log : () => {}

  log('=== Starting Job Extraction ===')
  log('URL:', window.location.href)

  // Step 1: Check if this is a known job board for early confidence
  const isKnown = isKnownJobBoard()
  log('Is known job board:', isKnown)

  // Step 2: Detect if this is a job page
  let detection: JobDetectionResult | undefined

  if (!cfg.skipDetection && !isKnown) {
    detection = detectJobPage()
    log('Job detection:', detection)

    if (!detection.isJobPage) {
      return {
        success: false,
        detection,
        error: 'This does not appear to be a job page'
      }
    }
  }

  // Step 3: Run extraction layers
  const results: ExtractionResult[] = []

  // Layer 1: Structured data (JSON-LD + OpenGraph)
  try {
    const structuredResult = extractStructuredData()
    if (structuredResult) {
      results.push(structuredResult)
      log('Structured data:', structuredResult.fieldsExtracted)
    }
  } catch (error) {
    log('Structured data error:', error)
  }

  // Layer 3: DOM extraction
  try {
    const domResult = extractFromDom()
    if (domResult) {
      results.push(domResult)
      log('DOM extraction:', domResult.fieldsExtracted)
    }
  } catch (error) {
    log('DOM extraction error:', error)
  }

  // Merge current results
  let merged = mergeResults(results)
  log('Merged after DOM:', merged.overallConfidence)

  // Layer 4: LLM fallback (if needed and not skipped)
  if (!cfg.skipLLM && !hasMinimumData(merged)) {
    log('Calling LLM fallback...')
    try {
      const llmResult = await extractWithLLM()
      if (llmResult) {
        results.push(llmResult)
        merged = mergeResults(results)
        log('After LLM:', merged.overallConfidence)
      }
    } catch (error) {
      log('LLM error:', error)
    }
  }

  // Check final result quality
  if (!hasMinimumData(merged)) {
    return {
      success: false,
      detection,
      mergedResult: merged,
      error: 'Could not extract enough job data from this page'
    }
  }

  log('=== Extraction Complete ===')
  log('Final data:', merged.data)

  return {
    success: true,
    data: merged.data,
    detection,
    mergedResult: merged
  }
}

/**
 * Quick extraction - only uses fast layers (no LLM)
 * Good for previews or when speed is critical
 */
export function extractJobDataQuick(): {
  success: boolean
  data?: Partial<ExtractedJobData>
  confidence: number
} {
  const results: ExtractionResult[] = []

  // Try structured data first
  const structured = extractStructuredData()
  if (structured) results.push(structured)

  // Try DOM extraction
  const dom = extractFromDom()
  if (dom) results.push(dom)

  if (results.length === 0) {
    return { success: false, confidence: 0 }
  }

  const merged = mergeResults(results)

  return {
    success: hasMinimumData(merged),
    data: merged.data,
    confidence: merged.overallConfidence
  }
}

/**
 * Check if current page is likely a job page
 * Quick check without full extraction
 */
export function isJobPage(): boolean {
  if (isKnownJobBoard()) return true

  const detection = detectJobPage()
  return detection.isJobPage
}

/**
 * Get extraction source info for UI display
 */
export function getExtractionSourceInfo(result: MergedResult): {
  primary: string
  confidence: string
  sources: string[]
} {
  const sourceLabels: Record<ExtractionResult['source'], string> = {
    'json-ld': 'Structured Data',
    'opengraph': 'Meta Tags',
    'dom': 'Page Analysis',
    'llm': 'AI Extraction',
    'site-specific': 'Site Extractor'
  }

  return {
    primary: sourceLabels[result.sources[0]?.source] || 'Unknown',
    confidence: `${Math.round(result.overallConfidence * 100)}%`,
    sources: result.sources.map(s => sourceLabels[s.source])
  }
}
