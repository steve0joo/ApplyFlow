/**
 * Merger: Combine extraction results from multiple layers
 * Prioritizes higher confidence sources and fills gaps from lower confidence
 */

import type {
  ExtractedJobData,
  ExtractionResult,
  MergedResult,
  REQUIRED_FIELDS
} from './types'

/**
 * Source priority order (higher = more trusted)
 */
const SOURCE_PRIORITY: Record<ExtractionResult['source'], number> = {
  'json-ld': 5,      // Structured data is most reliable
  'site-specific': 4, // Our extractors for known sites
  'opengraph': 3,    // OG tags are standardized
  'llm': 2,          // LLM is smart but can hallucinate
  'dom': 1           // DOM heuristics are least reliable
}

/**
 * Merge multiple extraction results into a single result
 * Higher confidence sources take priority
 */
export function mergeResults(results: ExtractionResult[]): MergedResult {
  // Filter out null results and sort by confidence and source priority
  const validResults = results
    .filter(r => r && r.fieldsExtracted.length > 0)
    .sort((a, b) => {
      // First sort by confidence
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence
      }
      // Then by source priority
      return SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source]
    })

  if (validResults.length === 0) {
    return {
      data: { jobUrl: window.location.href },
      overallConfidence: 0,
      sources: [],
      isComplete: false
    }
  }

  // Start with highest confidence result
  const merged: ExtractedJobData = { ...validResults[0].data } as ExtractedJobData

  // Fill in missing fields from other results
  for (const result of validResults.slice(1)) {
    for (const [key, value] of Object.entries(result.data)) {
      const field = key as keyof ExtractedJobData
      if (value !== undefined && merged[field] === undefined) {
        (merged as Record<string, unknown>)[field] = value
      }
    }
  }

  // Ensure URL is set
  if (!merged.jobUrl) {
    merged.jobUrl = window.location.href
  }

  // Calculate overall confidence
  const overallConfidence = calculateOverallConfidence(merged, validResults)

  // Check if all required fields are present
  const requiredFields: (keyof ExtractedJobData)[] = ['jobTitle', 'companyName', 'jobUrl']
  const isComplete = requiredFields.every(field => merged[field] !== undefined)

  return {
    data: merged,
    overallConfidence,
    sources: validResults,
    isComplete
  }
}

/**
 * Calculate overall confidence based on merged data quality
 */
function calculateOverallConfidence(
  data: ExtractedJobData,
  sources: ExtractionResult[]
): number {
  if (sources.length === 0) return 0

  // Base confidence from best source
  let confidence = sources[0].confidence

  // Bonus for multiple agreeing sources
  if (sources.length > 1) {
    const titleAgreement = sources.filter(s => s.data.jobTitle === data.jobTitle).length
    const companyAgreement = sources.filter(s => s.data.companyName === data.companyName).length

    if (titleAgreement > 1) confidence += 0.05
    if (companyAgreement > 1) confidence += 0.05
  }

  // Penalty for missing required fields
  if (!data.jobTitle) confidence -= 0.2
  if (!data.companyName) confidence -= 0.15

  // Bonus for complete data
  const optionalFields = ['location', 'salaryMin', 'salaryMax', 'jobType', 'locationType', 'description']
  const filledOptional = optionalFields.filter(f => data[f as keyof ExtractedJobData] !== undefined).length
  confidence += (filledOptional / optionalFields.length) * 0.1

  return Math.max(0, Math.min(1, confidence))
}

/**
 * Resolve conflicts when same field has different values
 * Returns the most trustworthy value
 */
export function resolveConflict<T>(
  field: keyof ExtractedJobData,
  results: ExtractionResult[]
): T | undefined {
  // Filter results that have this field
  const withField = results.filter(r => r.data[field] !== undefined)

  if (withField.length === 0) return undefined

  // Sort by confidence and source priority
  withField.sort((a, b) => {
    const confDiff = b.confidence - a.confidence
    if (Math.abs(confDiff) > 0.1) return confDiff
    return SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source]
  })

  return withField[0].data[field] as T
}

/**
 * Check if extraction result has minimum required data
 */
export function hasMinimumData(result: MergedResult): boolean {
  return (
    result.data.jobTitle !== undefined &&
    result.data.companyName !== undefined &&
    result.overallConfidence >= 0.5
  )
}

/**
 * Get extraction quality summary for debugging
 */
export function getQualitySummary(result: MergedResult): string {
  const parts: string[] = []

  parts.push(`Confidence: ${(result.overallConfidence * 100).toFixed(0)}%`)
  parts.push(`Sources: ${result.sources.map(s => s.source).join(', ')}`)
  parts.push(`Complete: ${result.isComplete ? 'Yes' : 'No'}`)

  const fields = Object.keys(result.data).filter(
    k => result.data[k as keyof ExtractedJobData] !== undefined
  )
  parts.push(`Fields: ${fields.join(', ')}`)

  return parts.join(' | ')
}
