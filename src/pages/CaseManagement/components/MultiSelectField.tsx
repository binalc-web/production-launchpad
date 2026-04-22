import { useState, useEffect, type FC, type MouseEvent } from 'react';
import { type Control, Controller, type FieldErrors } from 'react-hook-form';
import {
  Box,
  Select,
  MenuItem,
  Checkbox,
  Typography,
  Button,
  type SelectChangeEvent,
} from '@mui/material';
import { INTERESTED_THIRD_PARTY_TYPE_OPTIONS } from '../constants/options';
import type { FormData } from '../types';

/**
 * Props for the MultiSelectField component
 * @interface MultiSelectFieldProps
 * @property {Control<FormData>} control - React Hook Form control object
 * @property {FieldErrors<FormData>} errors - Form validation errors from React Hook Form
 * @property {'interestedThirdPartyType'} name - Name of the form field to control
 */
interface MultiSelectFieldProps {
  control: Control<FormData>;
  errors: FieldErrors<FormData>;
  name: 'interestedThirdPartyType';
}

/**
 * A reusable multi-select dropdown component with select all functionality
 * @component
 * @description Provides a customized multi-select field with select all, reset, and
 * confirm actions. Maintains a temporary state for selections until the user confirms.
 * Designed specifically for use with React Hook Form.
 *
 * @param {object} props - Component props
 * @param {Control<FormData>} props.control - React Hook Form control object
 * @param {FieldErrors<FormData>} props.errors - Form validation errors
 * @param {'interestedThirdPartyType'} props.name - Name of the form field to control
 * @returns {React.ReactElement} Rendered multi-select component
 */
const MultiSelectField: FC<MultiSelectFieldProps> = ({
  control,
  errors,
  name,
}) => {
  const [temporaryValues, setTemporaryValues] = useState<Array<string>>([]);
  const [selectOpen, setSelectOpen] = useState(false);

  useEffect(() => {
    if (!selectOpen && control) {
      const currentValue = control._formValues?.[name];
      if (currentValue !== undefined) {
        setTemporaryValues(
          currentValue
            ? Array.isArray(currentValue)
              ? currentValue
              : currentValue.split(',')
            : []
        );
      }
    }
  }, [selectOpen, control, name]);

  /**
   * Toggles all options in the multi-select
   * @description If all options are currently selected, deselects all. Otherwise, selects all.
   * @param {Array<string>} currentValues - Currently selected values
   * @param {Array<{value: string}>} allOptions - All available options
   * @returns {Array<string>} New array of selected values after toggle
   */
  const toggleAllOptions = (
    currentValues: Array<string>,
    allOptions: Array<{ value: string }>
  ): Array<string> => {
    const allSelected = allOptions.every((option) =>
      currentValues.includes(option.value)
    );
    return allSelected ? [] : allOptions.map((option) => option.value);
  };

  /**
   * Checks if all available options are currently selected
   * @param {Array<string>} values - Currently selected values
   * @param {Array<{value: string}>} allOptions - All available options
   * @returns {boolean} True if all options are selected, false otherwise
   */
  const areAllOptionsSelected = (
    values: Array<string>,
    allOptions: Array<{ value: string }>
  ): boolean => {
    return (
      allOptions.length > 0 &&
      allOptions.every((option) => values.includes(option.value))
    );
  };

  /**
   * Resets all selections to empty
   * @returns {Array<string>} Empty array representing no selections
   */
  const resetSelections = (): Array<string> => {
    return [];
  };

  return (
    <Controller
      name={name}
      control={control}
      defaultValue=""
      render={({ field }) => {
        return (
          <>
            <Select
              id={name}
              multiple
              fullWidth
              displayEmpty
              open={selectOpen}
              onOpen={() => setSelectOpen(true)}
              onClose={() => setSelectOpen(false)}
              value={temporaryValues}
              onChange={(event: SelectChangeEvent<typeof temporaryValues>) => {
                const newValue = event.target.value as Array<string>;
                setTemporaryValues(newValue);
              }}
              renderValue={(selected) => {
                const selectedArray = Array.isArray(selected)
                  ? selected
                  : selected
                    ? (selected).toString().split(',').filter(Boolean)
                    : [];
                return selectedArray.length > 0
                  ? `${selectedArray.length} selected`
                  : 'Select Third Party Type';
              }}
              error={!!errors[name]}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,
                  },
                  sx: {
                    '& .MuiList-root': {
                      paddingTop: 0,
                      paddingBottom: 0,
                      position: 'relative',
                    },
                  },
                },
                autoFocus: false,
              }}
              sx={{
                ...(!field.value?.length
                  ? {
                      '& .MuiSelect-select': {
                        color: 'neutral.400',
                      },
                    }
                  : {}),
              }}
            >
              <MenuItem
                dense
                sx={{
                  borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  backgroundColor: 'background.paper',
                  fontWeight: 'bold',
                }}
                onClick={() => {
                  setTemporaryValues(
                    toggleAllOptions(
                      temporaryValues,
                      INTERESTED_THIRD_PARTY_TYPE_OPTIONS
                    )
                  );
                }}
              >
                <Checkbox
                  checked={areAllOptionsSelected(
                    temporaryValues,
                    INTERESTED_THIRD_PARTY_TYPE_OPTIONS
                  )}
                  indeterminate={
                    temporaryValues.length > 0 &&
                    !areAllOptionsSelected(
                      temporaryValues,
                      INTERESTED_THIRD_PARTY_TYPE_OPTIONS
                    )
                  }
                  onClick={(event: MouseEvent) => {
                    event.stopPropagation();
                    setTemporaryValues(
                      toggleAllOptions(
                        temporaryValues,
                        INTERESTED_THIRD_PARTY_TYPE_OPTIONS
                      )
                    );
                  }}
                />
                <Typography>Select All</Typography>
              </MenuItem>

              <Box sx={{ maxHeight: '218px', overflow: 'auto' }}>
                {INTERESTED_THIRD_PARTY_TYPE_OPTIONS.map((option) => (
                  <MenuItem
                    key={option.value}
                    value={option.value}
                    disableRipple
                    onClick={() => {
                      const newValues = [...temporaryValues];
                      const currentIndex = newValues.indexOf(option.value);
                      if (currentIndex === -1) {
                        newValues.push(option.value);
                      } else {
                        newValues.splice(currentIndex, 1);
                      }
                      setTemporaryValues(newValues);
                    }}
                  >
                    <Checkbox
                      checked={temporaryValues.indexOf(option.value) !== -1}
                      onClick={(event: MouseEvent) => {
                        event.stopPropagation();
                        const newValues = [...temporaryValues];
                        const currentIndex = newValues.indexOf(option.value);
                        if (currentIndex === -1) {
                          newValues.push(option.value);
                        } else {
                          newValues.splice(currentIndex, 1);
                        }
                        setTemporaryValues(newValues);
                      }}
                    />
                    <Typography>{option.label}</Typography>
                  </MenuItem>
                ))}
              </Box>

              <Box
                className="action-buttons"
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  p: 1,
                  borderTop: '1px solid rgba(0, 0, 0, 0.12)',
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 1,
                  backgroundColor: 'background.paper',
                }}
              >
                <Button
                  onClick={() => {
                    setTemporaryValues(resetSelections());
                  }}
                  variant="text"
                  size="small"
                >
                  Reset
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    field.onChange(temporaryValues.join(','));
                    setSelectOpen(false);
                  }}
                >
                  Okay
                </Button>
              </Box>
            </Select>
            {errors[name] && (
              <Typography
                variant="caption"
                color="error.main"
                sx={{ mt: 0.5, display: 'block' }}
              >
                {errors[name]?.message}
              </Typography>
            )}
          </>
        );
      }}
    />
  );
};

export default MultiSelectField;
