/**
 * Converts a record status value to a human-readable format
 * @description Maps internal case type values to their display-friendly equivalents
 * @param {string} recordStatus - The raw case type value ('in_progress', 'failed', or 'completed)
 * @returns {string} Human-readable case type ('Completed', 'Failed', or 'In Review')
 */
export const getRecordStatus = (recordStatus: string): string => {
  if (recordStatus === 'completed') {
    return 'Completed';
  } else if (recordStatus === 'in_progress') {
    return 'In Progress';
  }

  return 'Failed';
};
