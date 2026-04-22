/**
 * Regular expression for validating US phone numbers
 * @description Validates phone numbers in various formats (with/without country code,
 * with/without separators) but ensures the area code is valid according to validAreaCodes list
 * @example Valid formats:
 * - 123-456-7890
 * - (123) 456-7890
 * - 123.456.7890
 * - +1 123 456 7890
 * @type {RegExp}
 */
export const usPhoneNumberRegex = new RegExp(
  `^(?:\\+?1[\\s.-]?)?\\d{3}[\\s.-]?\\d{3}[\\s.-]?\\d{4}$`
);

/**
 * List of email domains that are blocked for registration
 * Used to construct the emailRegex pattern to prevent usage of public email providers
 * @description Application requires users to register with business/organization email addresses
 * @type {Array<string>}
 */
export const blockedDomains = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
];

/**
 * Regular expression for validating email addresses
 * @description Validates standard email format while rejecting addresses from blockedDomains
 * This ensures users register with business/organization email addresses rather than personal accounts
 * @example
 * - user@company.com ✓
 * - user@gmail.com ✗ (blocked domain)
 * @type {RegExp}
 */
export const emailRegex = new RegExp(
  `^[a-zA-Z0-9._%+-]+@(?!(?:${blockedDomains.join('|')})$)([a-zA-Z0-9.-]+)$`
);

/**
 * Regular expression for password validation
 * @description Ensures passwords meet security requirements by containing:
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one digit
 * - At least one special character from the set: !@#$%^&*(),.?":{}|<>
 * @type {RegExp}
 */
export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).*$/;

export const nameRegex = /^[A-Za-z\s\-']+$/;
