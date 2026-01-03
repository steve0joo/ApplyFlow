/**
 * Status transition logic for email-triggered updates
 */

export type EmailClassification =
  | 'REJECTION'
  | 'INTERVIEW_REQUEST'
  | 'OFFER'
  | 'SCREENING_INVITE'
  | 'ASSESSMENT_REQUEST'
  | 'GENERIC_UPDATE'
  | 'UNRELATED'

export type ApplicationStatus =
  | 'SAVED'
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEWING'
  | 'OFFER'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'GHOSTED'

// Map email classification to new application status
const CLASSIFICATION_TO_STATUS: Record<EmailClassification, ApplicationStatus | null> = {
  REJECTION: 'REJECTED',
  INTERVIEW_REQUEST: 'INTERVIEWING',
  OFFER: 'OFFER',
  SCREENING_INVITE: 'SCREENING',
  ASSESSMENT_REQUEST: 'SCREENING',
  GENERIC_UPDATE: null, // No status change
  UNRELATED: null, // No status change
}

// Define valid status transitions (from -> allowed to states)
const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  SAVED: ['APPLIED', 'REJECTED', 'WITHDRAWN'],
  APPLIED: ['SCREENING', 'INTERVIEWING', 'OFFER', 'REJECTED', 'WITHDRAWN', 'GHOSTED'],
  SCREENING: ['INTERVIEWING', 'OFFER', 'REJECTED', 'WITHDRAWN', 'GHOSTED'],
  INTERVIEWING: ['OFFER', 'REJECTED', 'WITHDRAWN', 'GHOSTED'],
  OFFER: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  ACCEPTED: [], // Terminal state
  REJECTED: [], // Terminal state (could allow appeal in future)
  WITHDRAWN: [], // Terminal state
  GHOSTED: ['SCREENING', 'INTERVIEWING', 'REJECTED'], // Can come back from ghosted
}

// Confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
  AUTO_UPDATE: 0.9, // Auto-update without review
  FLAG_FOR_REVIEW: 0.7, // Auto-update but flag for review
  MANUAL_ONLY: 0.0, // Don't auto-update, queue for manual review
}

export interface TransitionResult {
  shouldUpdate: boolean
  newStatus: ApplicationStatus | null
  reason: string
  needsReview: boolean
}

/**
 * Determine if status should be updated based on classification
 */
export function getStatusTransition(
  classification: EmailClassification,
  confidence: number,
  currentStatus: ApplicationStatus
): TransitionResult {
  const targetStatus = CLASSIFICATION_TO_STATUS[classification]

  // No status change for this classification
  if (!targetStatus) {
    return {
      shouldUpdate: false,
      newStatus: null,
      reason: `Classification ${classification} does not trigger status change`,
      needsReview: false,
    }
  }

  // Check if transition is valid
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || []
  if (!allowedTransitions.includes(targetStatus)) {
    return {
      shouldUpdate: false,
      newStatus: null,
      reason: `Invalid transition from ${currentStatus} to ${targetStatus}`,
      needsReview: true, // Flag for manual review
    }
  }

  // Check confidence threshold
  if (confidence < CONFIDENCE_THRESHOLDS.FLAG_FOR_REVIEW) {
    return {
      shouldUpdate: false,
      newStatus: targetStatus,
      reason: `Confidence ${confidence} below threshold`,
      needsReview: true,
    }
  }

  // Auto-update with or without review flag
  return {
    shouldUpdate: true,
    newStatus: targetStatus,
    reason: `Auto-updating to ${targetStatus} (confidence: ${confidence})`,
    needsReview: confidence < CONFIDENCE_THRESHOLDS.AUTO_UPDATE,
  }
}

/**
 * Get the trigger type for status history
 */
export function getTriggerType(confidence: number): 'email_auto' | 'email_manual' {
  return confidence >= CONFIDENCE_THRESHOLDS.FLAG_FOR_REVIEW ? 'email_auto' : 'email_manual'
}
