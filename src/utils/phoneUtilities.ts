/**
 * Utility functions for phone number formatting and manipulation
 */

/**
 * Strips all formatting from a phone number, leaving only digits
 * @param {string} phoneNumber - The phone number to strip formatting from
 * @returns {string} Phone number with only digits
 */
export const stripPhoneFormatting = (phoneNumber: string): string => {
  if (!phoneNumber) return '';
  return phoneNumber.replace(/\D/g, '');
};

/**
 * Formats a phone number string to (123) 456-7890 format
 * @param {string} value - The phone number string to format
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (value: string): string => {
  // Remove all non-numeric characters
  const phoneDigits = stripPhoneFormatting(value);

  // Format based on the number of digits
  if (phoneDigits.length === 0) return '';
  if (phoneDigits.length <= 3) return `(${phoneDigits}`;
  if (phoneDigits.length <= 6)
    return `+1 (${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3)}`;

  // Format to (123) 456-7890 format
  return `+1 (${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6, 10)}`;
};

/**
 * Formats a phone number for API submission
 * Uses the xxx-xxx-xxxx format that passes validation
 * @param {string} value - The phone number to format
 * @returns {string} Formatted phone number for API submission
 */
export const formatPhoneForSubmission = (value: string): string => {
  const digits = stripPhoneFormatting(value);

  if (digits.length !== 10) return value; // Return original if not a valid 10-digit number

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};
