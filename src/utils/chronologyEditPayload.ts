import type { ChronologyCategory } from '@/api/chronologies/constants';

/**
 * Represents a single chronology event update.
 * Used when building the payload for saving edited chronology summaries.
 */
export interface ChronologyEventUpdate {
  _id: string;
  translated_summary: string;
}

/**
 * Payload shape accepted by the `POST /api/v1/chronology/augment` endpoint.
 * Shared across medical and billing chronology edit flows.
 */
export interface SaveChronologyEditsPayload {
  chronologyId: string;
  category: ChronologyCategory;
  updates: Array<ChronologyEventUpdate>;
}

/**
 * Builds the payload for saving edited chronology summaries.
 *
 * This utility is **category-agnostic** — it works for both `medical` and
 * `billing` chronology categories. The calling component simply passes
 * the relevant `category` value.
 *
 * @param chronologyId - The chronology document ID (from the URL / parent component).
 * @param category     - `'medical'` or `'billing'`.
 * @param editedSummaries - A map of event `_id` → edited `translated_summary`.
 *                          Only entries whose summary actually changed should be included.
 * @returns A `SaveChronologyEditsPayload` ready to be sent to the API.
 *
 * @example
 * ```ts
 * const payload = buildChronologyEditPayload(
 *   '69ba7b10fc01a98693b04e93',
 *   'medical',
 *   new Map([
 *     ['69ba7b12f77e743a0d9ce80d', 'Edited summary text …'],
 *     ['69ba7b12f77e743a0d9ce813', 'Another edited summary'],
 *   ]),
 * );
 * ```
 */
export const buildChronologyEditPayload = (
  chronologyId: string,
  category: ChronologyCategory,
  editedSummaries: Map<string, string>
): SaveChronologyEditsPayload => {
  const updates: Array<ChronologyEventUpdate> = [];

  for (const [eventId, summary] of editedSummaries) {
    updates.push({
      _id: eventId,
      // eslint-disable-next-line camelcase
      translated_summary: summary,
    });
  }

  return {
    chronologyId,
    category,
    updates,
  };
};

/** Minimum number of characters required in an edited summary text box. */
export const CHRONOLOGY_SUMMARY_MIN_LENGTH = 4;

/** Maximum number of characters allowed in an edited summary text box. */
export const CHRONOLOGY_SUMMARY_MAX_LENGTH = 1000;

/**
 * Checks if a single summary value is below the minimum length.
 * Used by the UI component for inline visual validation.
 */
export const isSummaryBelowMinLength = (value: string): boolean =>
  value.length < CHRONOLOGY_SUMMARY_MIN_LENGTH;

/**
 * Validates all edited summaries meet the minimum length requirement.
 *
 * @param editedSummaries - Map of event `_id` → edited summary text.
 * @returns An error message string if validation fails, or `null` if valid.
 */
export const validateEditedSummaries = (
  editedSummaries: Map<string, string>
): string | null => {
  for (const [, text] of editedSummaries) {
    if (isSummaryBelowMinLength(text)) {
      return `Each summary must be at least ${CHRONOLOGY_SUMMARY_MIN_LENGTH} characters long.`;
    }
  }
  return null;
};

/**
 * Extracts a user-friendly error message from an unknown error value.
 * Prevents repeated `instanceof Error` ternary chains across components.
 */
export const extractErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong'
): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
};
