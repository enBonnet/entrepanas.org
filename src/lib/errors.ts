// ponytail: maps server error codes to i18n messages. One lookup, no try/catch dance.
import { m } from '#/paraglide/messages.js'

const MAP = {
  RATE_LIMITED: () => m['errors.RATE_LIMITED'](),
  AMOUNT_MISMATCH: () => m['errors.AMOUNT_MISMATCH'](),
  ALREADY_CONFIRMED: () => m['errors.ALREADY_CONFIRMED'](),
  INVALID_MIME: () => m['errors.INVALID_MIME'](),
  MIME_MISMATCH: () => m['errors.MIME_MISMATCH'](),
  SIZE_MISMATCH: () => m['errors.SIZE_MISMATCH'](),
  OBJECT_NOT_FOUND: () => m['errors.OBJECT_NOT_FOUND'](),
  INVALID_TRANSITION: () => m['errors.INVALID_TRANSITION'](),
  TOTAL_MISMATCH: () => m['errors.TOTAL_MISMATCH'](),
  PASSWORD_TOO_SHORT: () => m['errors.PASSWORD_TOO_SHORT'](),
  PASSWORD_NO_UPPERCASE: () => m['errors.PASSWORD_NO_UPPERCASE'](),
  PASSWORD_NO_DIGIT: () => m['errors.PASSWORD_NO_DIGIT'](),
  NO_PROFILE: () => m['errors.NO_PROFILE'](),
  NOT_FOUND: () => m['errors.NOT_FOUND'](),
  CAMPAIGN_CLOSED: () => m['errors.CAMPAIGN_CLOSED'](),
  INSERT_FAILED: () => m['errors.INSERT_FAILED'](),
  PROFILE_EXISTS: () => m['errors.PROFILE_EXISTS'](),
  FILE_TOO_LARGE: () => m['errors.FILE_TOO_LARGE'](),
  FORBIDDEN: () => m['errors.FORBIDDEN'](),
} as const

export function errorMessage(err: unknown): string {
  const code = err instanceof Error ? err.message : String(err)
  return MAP[code as keyof typeof MAP]?.() ?? code
}
