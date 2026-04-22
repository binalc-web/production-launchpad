import { useState, useEffect, type FC, type MouseEvent } from 'react';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import {
  Box,
  Select,
  MenuItem,
  Checkbox,
  Typography,
  Button,
  Avatar,
  Tooltip,
  Chip,
} from '@mui/material';
import type { FormData } from '../types';
import { XIcon } from '@phosphor-icons/react';

/**
 * Props for the InterestedThirdPartyMultiSelect component
 * @interface InterestedThirdPartyMultiSelectProps
 * @property {Control<FormData>} control - React Hook Form control object
 * @property {FieldErrors<FormData>} errors - Form validation errors from React Hook Form
 * @property {'interestedThirdPartyName'} name - Name of the form field to control
 * @property {Array<Object>} options - Array of third-party user options to select from
 * @property {boolean} [disabled] - Whether the control is disabled
 */
interface InterestedThirdPartyMultiSelectProps {
  control: Control<FormData>;
  errors: FieldErrors<FormData>;
  name: 'interestedThirdPartyName';
  options: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    businessDetail?: { name?: string };
  }>;
  disabled?: boolean;
}

/**
 * A specialized multi-select component for selecting interested third parties
 * @component
 * @description Provides a customized multi-select field with avatars, names, and business details.
 * Features include select all, reset, and confirm actions with a temporary selection state until confirmed.
 *
 * Designed specifically for selecting third-party users who may have interest in a case.
 * Displays users with their avatars, names, and business details in a dropdown with checkboxes.
 *
 * @param {object} props - Component props
 * @param {Control<FormData>} props.control - React Hook Form control object
 * @param {FieldErrors<FormData>} props.errors - Form validation errors
 * @param {'interestedThirdPartyName'} props.name - Name of the form field to control
 * @param {Array<Object>} props.options - Array of third-party user options
 * @param {boolean} [props.disabled] - Whether the control is disabled
 * @returns {React.ReactElement} Rendered multi-select component
 */
const InterestedThirdPartyMultiSelect: FC<
  InterestedThirdPartyMultiSelectProps
> = ({ control, errors, name, options, disabled }) => {
  const [selectOpen, setSelectOpen] = useState(false);
  const [temporaryValues, setTemporaryValues] = useState<Array<string>>([]);

  useEffect(() => {
    if (!selectOpen && control) {
      const currentValue = control._formValues?.[name];
      if (currentValue !== undefined) {
        setTemporaryValues(
          Array.isArray(currentValue)
            ? currentValue
            : currentValue
              ? [currentValue]
              : []
        );
      }
    }
  }, [selectOpen, control, name]);

  /**
   * Toggles all options in the multi-select
   * @description If all options are currently selected, deselects all. Otherwise, selects all.
   * @param {Array<string>} currentValues - Currently selected values
   * @param {Array<{_id: string}>} allOptions - All available options
   * @returns {Array<string>} New array of selected values after toggle
   */
  const toggleAllOptions = (
    currentValues: Array<string>,
    allOptions: Array<{ _id: string }>
  ): Array<string> => {
    const allSelected = allOptions.every((option) =>
      currentValues.includes(option._id)
    );
    return allSelected ? [] : allOptions.map((option) => option._id);
  };

  /**
   * Checks if all available options are currently selected
   * @param {Array<string>} values - Currently selected values
   * @param {Array<{_id: string}>} allOptions - All available options
   * @returns {boolean} True if all options are selected, false otherwise
   */
  const areAllOptionsSelected = (
    values: Array<string>,
    allOptions: Array<{ _id: string }>
  ): boolean => {
    return (
      allOptions.length > 0 &&
      allOptions.every((option) => values.includes(option._id))
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
      render={({ field }) => (
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
            onChange={(event) => {
              const newValue = event.target.value as Array<string>;
              setTemporaryValues(newValue);
            }}
            renderValue={(selected) => {
              const selectedArray = Array.isArray(selected)
                ? selected
                : selected
                  ? [selected]
                  : [];
              if (selectedArray.length === 0)
                return 'Select Interested Third Parties';
              return (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selectedArray.map((value) => {
                    const option = options.find((opt) => opt._id === value);
                    if (!option) return null;
                    return (
                      <Tooltip
                        key={option._id}
                        arrow
                        title={option.businessDetail?.name || ''}
                      >
                        <Chip
                          color="secondary"
                          avatar={
                            <Avatar
                              src={option?.avatar || undefined}
                              sx={{
                                fontSize: 10,
                              }}
                            >
                              {option.firstName[0] + option.lastName[0]}
                            </Avatar>
                          }
                          label={option.firstName + ' ' + option.lastName}
                          deleteIcon={<XIcon size={12} />}
                          onMouseDown={(event) => event.stopPropagation()}
                          onDelete={
                            disabled
                              ? undefined
                              : (
                                  event: React.MouseEvent<HTMLButtonElement>
                                ): void => {
                                  event.stopPropagation();
                                  const newValues = selectedArray.filter(
                                    (v) => v !== value
                                  );
                                  setTemporaryValues(newValues);
                                  field.onChange(newValues);
                                }
                          }
                          size="small"
                          sx={{
                            mt: -0.05,
                            bgcolor: 'background.default',
                            '& .MuiChip-label': {
                              mx: 0.5,
                              fontSize: 12,
                              color: 'text.primary',
                            },
                          }}
                        />
                      </Tooltip>
                    );
                  })}
                </Box>
              );
            }}
            disabled={disabled}
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
                setTemporaryValues(toggleAllOptions(temporaryValues, options));
              }}
              disabled={disabled}
            >
              <Checkbox
                checked={areAllOptionsSelected(temporaryValues, options)}
                indeterminate={
                  temporaryValues.length > 0 &&
                  !areAllOptionsSelected(temporaryValues, options)
                }
                onClick={(event: MouseEvent) => {
                  event.stopPropagation();
                  setTemporaryValues(
                    toggleAllOptions(temporaryValues, options)
                  );
                }}
                disabled={disabled}
              />
              <Typography>Select All</Typography>
            </MenuItem>

            <Box sx={{ maxHeight: '218px', overflow: 'auto' }}>
              {options.map((option) => (
                <MenuItem
                  key={option._id}
                  value={option._id}
                  disableRipple
                  onClick={() => {
                    if (disabled) return;
                    const newValues = [...temporaryValues];
                    const currentIndex = newValues.indexOf(option._id);
                    if (currentIndex === -1) {
                      newValues.push(option._id);
                    } else {
                      newValues.splice(currentIndex, 1);
                    }
                    setTemporaryValues(newValues);
                  }}
                  disabled={disabled}
                >
                  <Checkbox
                    checked={temporaryValues.indexOf(option._id) !== -1}
                    onClick={(event: MouseEvent) => {
                      event.stopPropagation();
                      if (disabled) return;
                      const newValues = [...temporaryValues];
                      const currentIndex = newValues.indexOf(option._id);
                      if (currentIndex === -1) {
                        newValues.push(option._id);
                      } else {
                        newValues.splice(currentIndex, 1);
                      }
                      setTemporaryValues(newValues);
                    }}
                    disabled={disabled}
                  />
                  <Avatar
                    src={option.avatar || undefined}
                    sx={{ width: 20, height: 20, fontSize: 10, mr: 1 }}
                  >
                    {option.firstName[0] + option.lastName[0]}
                  </Avatar>
                  <Typography>
                    {option.firstName + ' ' + option.lastName}
                  </Typography>
                  {option.businessDetail?.name && (
                    <Typography
                      color="text.secondary"
                      sx={{ ml: 1, fontSize: 10 }}
                    >
                      {option.businessDetail.name}
                    </Typography>
                  )}
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
                disabled={disabled}
              >
                Reset
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  field.onChange(temporaryValues);
                  setSelectOpen(false);
                }}
                disabled={disabled}
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
      )}
    />
  );
};

export default InterestedThirdPartyMultiSelect;
