/**
 * Format file size from bytes to human-readable format (MB or KB)
 * @param bytes - File size in bytes
 * @returns Formatted string with appropriate size unit
 */
export const bytesToMB = (bytes: number): string => {
  // Handle invalid or zero bytes
  if (!bytes || bytes <= 0) return '0 KB';

  const mb = bytes / (1024 * 1024);
  const kb = bytes / 1024;

  if (mb >= 1) {
    // If larger than 1 MB, format with up to 2 decimal places
    // Remove trailing zeros after decimal
    return mb.toFixed(2).replace(/\.?0+$/, '') + ' MB';
  } else {
    // For KB, show whole numbers without decimals
    // Always show at least 1 KB for very small files
    return Math.max(1, Math.round(kb)) + ' KB';
  }
};
