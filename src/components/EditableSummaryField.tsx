import type { FC } from 'react';
import { TextField } from '@mui/material';
import {
  CHRONOLOGY_SUMMARY_MAX_LENGTH,
  isSummaryBelowMinLength,
  CHRONOLOGY_SUMMARY_MIN_LENGTH,
} from '@/utils/chronologyEditPayload';

interface EditableSummaryFieldProps {
  /** The current value of the summary text. */
  value: string;
  /** Called when the user modifies the text. */
  onChange: (newValue: string) => void;
}

/**
 * A reusable text field for editing chronology summaries.
 *
 * Encapsulates the validation display (min/max length), character counter,
 * and error state. Can be dropped into any accordion or card that needs
 * an editable summary — medical, billing, or master chronology.
 *
 * Follows the **Single Responsibility Principle**: it only handles
 * rendering and visual validation for a single summary field.
 */
const EditableSummaryField: FC<EditableSummaryFieldProps> = ({
  value,
  onChange,
}) => {
  const showError = isSummaryBelowMinLength(value);
  const isAtMaxLength = value.length >= CHRONOLOGY_SUMMARY_MAX_LENGTH;

  const helperText = showError
    ? `Minimum ${CHRONOLOGY_SUMMARY_MIN_LENGTH} characters required (${value.length}/${CHRONOLOGY_SUMMARY_MAX_LENGTH})`
    : isAtMaxLength
      ? `${value.length}/${CHRONOLOGY_SUMMARY_MAX_LENGTH}  Character limit reached`
      : `${value.length}/${CHRONOLOGY_SUMMARY_MAX_LENGTH} characters`;

  return (
    <TextField
      fullWidth
      multiline
      minRows={3}
      maxRows={10}
      value={value}
      onChange={(event_) => {
        // Collapse multiple consecutive spaces (but not newlines) into one.
        const normalized = event_.target.value.replace(/ {2,}/g, ' ');
        if (normalized.length <= CHRONOLOGY_SUMMARY_MAX_LENGTH) {
          onChange(normalized);
        }
      }}
      error={showError || isAtMaxLength}
      inputProps={{
        maxLength: CHRONOLOGY_SUMMARY_MAX_LENGTH,
      }}
      helperText={helperText}
      sx={{
        '& .MuiOutlinedInput-root': {
          fontSize: '14px',
        },
      }}
    />
  );
};

export default EditableSummaryField;
