import { useState, type ChangeEvent } from 'react';
import { TextField, InputAdornment, type TextFieldProps } from '@mui/material';
import { usPhoneNumberRegex } from '../utils/regex';
import { stripPhoneFormatting } from '../utils/phoneUtilities';

/**
 * Props for the PhoneInput component
 * @interface PhoneInputProps
 */
export interface PhoneInputProps {
  /**
   * Current value of the phone input
   */
  value: string;

  /**
   * Callback when value changes
   */
  onChange: (value: string) => void;

  /**
   * Error state from parent form validation
   */
  error?: boolean;

  /**
   * Error message from parent form validation
   */
  helperText?: string;

  /**
   * Props to pass to the underlying TextField component
   */
  textFieldProps?: Omit<
    TextFieldProps,
    'value' | 'onChange' | 'error' | 'helperText'
  >;

  /**
   * Whether to show country code (+1) as prefix
   * @default true
   */

  showCountryCode?: boolean;
}

/**
 * A reusable phone input component that automatically formats the input to (123) 456-7890
 * and validates that the input doesn't contain alphabetic characters
 *
 * @param {PhoneInputProps} props - Component props
 * @returns {React.ReactElement} Rendered component
 */
const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  error = false,
  helperText,
  textFieldProps,
  showCountryCode = true,
}) => {
  const [phoneError, setPhoneError] = useState<string | null>(null);

  /**
   * Handles phone number input changes
   * @param {ChangeEvent<HTMLInputElement | HTMLTextAreaElement>} event - The input change event
   * @returns {void}
   */
  const handlePhoneChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const inputValue = event.target.value;

    // Just get the raw digits - this prevents any special chars
    const rawDigits = stripPhoneFormatting(inputValue);

    // Limit to 10 digits
    if (rawDigits.length > 10) {
      return;
    }

    // Clear any previous error
    setPhoneError(null);

    // Format the phone number based on digits only
    let formattedNumber = '';

    if (rawDigits.length > 0) {
      // Area code (first 3 digits)
      if (rawDigits.length <= 3) {
        formattedNumber = `(${rawDigits}`;
      }
      // Area code + first 3 digits of local number
      else if (rawDigits.length <= 6) {
        formattedNumber = `(${rawDigits.slice(0, 3)}) ${rawDigits.slice(3)}`;
      }
      // Complete phone number
      else {
        formattedNumber = `(${rawDigits.slice(0, 3)}) ${rawDigits.slice(3, 6)}-${rawDigits.slice(6)}`;
      }
    }

    // Only validate if we have a complete 10-digit number
    if (rawDigits.length === 10) {
      // Format for validation
      const validationFormat = `${rawDigits.slice(0, 3)}-${rawDigits.slice(3, 6)}-${rawDigits.slice(6)}`;

      // Check valid US area code
      if (!usPhoneNumberRegex.test(validationFormat)) {
        setPhoneError('Invalid US phone number format');
        onChange(formattedNumber);
        return;
      }

      // If valid and complete, return in submission format
      onChange(validationFormat);
    } else {
      // For partial numbers, just return the formatted display version
      onChange(formattedNumber);
    }
  };

  // Format the display value to always show brackets format for UI
  const displayValue = (): string => {
    if (!value) return '';

    // Extract just the digits for consistent formatting
    const digitsOnly = stripPhoneFormatting(value);

    // Format based on number of digits - this matches handlePhoneChange logic exactly
    if (digitsOnly.length === 0) return '';
    if (digitsOnly.length <= 3) return `(${digitsOnly}`;
    if (digitsOnly.length <= 6)
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`;
    if (digitsOnly.length <= 10)
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;

    // For more than 10 digits (shouldn't happen), truncate to 10
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;
  };

  return (
    <TextField
      fullWidth
      type="text"
      placeholder="(123) 456-7890"
      value={displayValue()}
      onChange={handlePhoneChange}
      error={error || !!phoneError}
      helperText={phoneError || helperText}
      InputProps={{
        ...(showCountryCode
          ? {
              startAdornment: (
                <InputAdornment position="start">+1</InputAdornment>
              ),
            }
          : {}),
        ...textFieldProps?.InputProps,
      }}
      {...textFieldProps}
    />
  );
};

export default PhoneInput;
