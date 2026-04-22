/**
 * Converts a case type value to a human-readable format
 * @description Maps internal case type values to their display-friendly equivalents
 * @param {string} caseType - The raw case type value ('open', 'closed', or other)
 * @returns {string} Human-readable case type ('Open', 'Closed', or 'In Review')
 */
export const getCaseType = (caseType: string): string => {
  if (caseType === 'open') {
    return 'Open';
  } else if (caseType === 'closed') {
    return 'Closed';
  }

  return 'In Review';
};
