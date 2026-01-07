/**
 * Types for the intelligent job extraction pipeline
 */

export interface ExtractedJobData {
  jobTitle?: string
  companyName?: string
  location?: string
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  jobType?: 'internship' | 'full_time' | 'part_time' | 'contract'
  locationType?: 'remote' | 'hybrid' | 'onsite'
  description?: string
  jobUrl?: string
  postedDate?: string
  applicationDeadline?: string
}

export interface ExtractionResult {
  data: Partial<ExtractedJobData>
  confidence: number // 0-1 scale
  source: 'json-ld' | 'opengraph' | 'dom' | 'llm' | 'site-specific'
  fieldsExtracted: string[]
}

export interface JobDetectionResult {
  isJobPage: boolean
  confidence: number
  signals: {
    urlScore: number
    titleScore: number
    hasApplyButton: boolean
    hasStructuredData: boolean
    hasJobKeywords: boolean
  }
}

export interface MergedResult {
  data: ExtractedJobData
  overallConfidence: number
  sources: ExtractionResult[]
  isComplete: boolean // All required fields present
}

// Required fields for a valid job extraction
export const REQUIRED_FIELDS: (keyof ExtractedJobData)[] = [
  'jobTitle',
  'companyName',
  'jobUrl'
]

// Optional but valuable fields
export const OPTIONAL_FIELDS: (keyof ExtractedJobData)[] = [
  'location',
  'salaryMin',
  'salaryMax',
  'salaryCurrency',
  'jobType',
  'locationType',
  'description',
  'postedDate',
  'applicationDeadline'
]
