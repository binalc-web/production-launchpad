/**
 * Converts a file type value to a human-readable format
 * @description Maps internal file type values to their display-friendly equivalents
 * @param {string} fileType - The raw case type value ('ocr_medical', 'ocr_billing', or other)
 * @returns {string} Human-readable file type ('Medical Document', 'Billing Document', or 'Other Document')
 */
export const getFileType = (fileType: string): string => {
  if (fileType === 'ocr_medical') {
    return 'Medical Document';
  } else if (fileType === 'ocr_billing') {
    return 'Billing Document';
  }

  return 'Other Document';
};
