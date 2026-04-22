import { type FC, useEffect, useState } from 'react';
import type { FormData } from './index';

import {
  Controller,
  type Control,
  type FieldErrors,
  type ControllerRenderProps,
} from 'react-hook-form';
import {
  Typography,
  Box,
  Grid,
  InputLabel,
  CardContent,
  Select,
  MenuItem,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  Divider,
  FormHelperText,
  Checkbox,
  Button,
} from '@mui/material';
import ReactDatepicker from '@/components/ReactDatepicker';

// Dummy data for dropdowns
const RECORD_TYPES = [
  { value: 'medical', label: 'Medical' },
  { value: 'billing', label: 'Billing' },
];

interface RecordTypeSelectProps {
  field: ControllerRenderProps<FormData, 'recordType'>;
  error?: boolean;
  errorMessage?: string;
}

const RecordTypeSelect: FC<RecordTypeSelectProps> = ({
  field,
  error,
  errorMessage,
}) => {
  const [selectOpen, setSelectOpen] = useState(false);
  const [temporaryValues, setTemporaryValues] = useState<Array<string>>([]);

  useEffect(() => {
    if (!selectOpen) {
      const currentValue = field.value;
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
  }, [selectOpen, field.value]);

  const toggleAllOptions = (currentValues: Array<string>): Array<string> => {
    const allSelected = RECORD_TYPES.every((option) =>
      currentValues.includes(option.value)
    );
    return allSelected ? [] : RECORD_TYPES.map((option) => option.value);
  };

  const areAllOptionsSelected = (values: Array<string>): boolean => {
    return (
      RECORD_TYPES.length > 0 &&
      RECORD_TYPES.every((option) => values.includes(option.value))
    );
  };

  const resetSelections = (): Array<string> => {
    return [];
  };

  return (
    <>
      <Select
        {...field}
        open={selectOpen}
        onOpen={() => setSelectOpen(true)}
        onClose={() => setSelectOpen(false)}
        fullWidth
        multiple
        displayEmpty
        renderValue={(selected) => {
          const selectedArray = Array.isArray(selected)
            ? selected
            : selected
              ? [selected]
              : [];
          if (selectedArray.length === 0) return 'Select Record Type';
          return selectedArray
            .map(
              (value) =>
                RECORD_TYPES.find((option) => option.value === value)?.label ||
                value
            )
            .join(', ');
        }}
        value={temporaryValues}
        onChange={(event) => {
          const newValue = event.target.value as Array<string>;
          setTemporaryValues(newValue);
        }}
        error={error}
        sx={{
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: error ? 'error.main' : 'neutral.300',
            },
          },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              maxHeight: 300,
              width: 'auto',
              minWidth: 250,
            },
          },
        }}
      >
        <MenuItem
          dense
          sx={{
            fontSize: 14,
            mx: 0.5,
            my: 0.5,
            borderRadius: 1,
            '&:hover': {
              backgroundColor: '#F1F5FD',
            },
          }}
          disableRipple
        >
          <Checkbox
            checked={areAllOptionsSelected(temporaryValues)}
            indeterminate={
              temporaryValues.length > 0 &&
              temporaryValues.length < RECORD_TYPES.length
            }
            onClick={(event) => {
              event.stopPropagation();
              setTemporaryValues(toggleAllOptions(temporaryValues));
            }}
            sx={{
              padding: '4px',
              '& .MuiSvgIcon-root': { fontSize: 20 },
            }}
            color="info"
          />
          <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
            Select All
          </Typography>
        </MenuItem>
        <Divider />
        <Box sx={{ maxHeight: '218px', overflow: 'auto' }}>
          {RECORD_TYPES.map((option) => (
            <MenuItem
              key={option.value}
              value={option.value}
              disableRipple
              sx={{
                borderRadius: 1,
                mx: 0.5,
                my: 0.3,
                '&:hover': {
                  backgroundColor: '#F1F5FD',
                },
              }}
              onClick={() => {
                const newValues = [...temporaryValues];
                const currentIndex = newValues.indexOf(option.value);
                if (currentIndex === -1) {
                  newValues.push(option.value);
                } else {
                  newValues.splice(currentIndex, 1);
                }
                setTemporaryValues(newValues);
                field.onChange(newValues);
              }}
            >
              <Checkbox
                checked={temporaryValues.indexOf(option.value) !== -1}
                onClick={(event) => {
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
                sx={{
                  padding: '4px',
                  '& .MuiSvgIcon-root': { fontSize: 20 },
                }}
                color="info"
              />
              <Typography sx={{ fontSize: 14 }}>{option.label}</Typography>
            </MenuItem>
          ))}
        </Box>

        <Box
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
            color="info"
            sx={{ fontSize: 12 }}
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
            sx={{ fontSize: 12 }}
          >
            Okay
          </Button>
        </Box>
      </Select>
      {error && errorMessage && (
        <FormHelperText error sx={{ mt: 0.5 }}>
          {errorMessage}
        </FormHelperText>
      )}
    </>
  );
};

type RecordInfoSectionProps = {
  control: Control<FormData>;
  errors: FieldErrors<FormData>;
  watch: (fieldName: string) => string;
};

const RecordInfoSection: FC<RecordInfoSectionProps> = ({
  control,
  errors,
  watch,
}) => {
  return (
    <>
      <CardContent>
        <Typography variant="h6">Record Information</Typography>
        <Grid mt={3} container spacing={2.5}>
          <Grid size={{ xs: 12 }}>
            <Box mt={2}>
              <InputLabel htmlFor="medicalRecordProvider">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                Medical Record Provider
              </InputLabel>
              <Controller
                name="medicalRecordProvider"
                control={control}
                render={({ field }) => (
                  <FormControl>
                    <RadioGroup row {...field}>
                      <FormControlLabel
                        value="ehr"
                        control={<Radio color="info" />}
                        label="EHR"
                      />
                      <FormControlLabel
                        value="self"
                        control={<Radio color="info" />}
                        label="Self"
                      />
                    </RadioGroup>
                    {errors.medicalRecordProvider && (
                      <FormHelperText error sx={{ mt: 0.5 }}>
                        {errors.medicalRecordProvider.message}
                      </FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            </Box>
          </Grid>
          {(watch('medicalRecordProvider') === 'ehr' ||
            watch('medicalRecordProvider') === 'epic') && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <InputLabel htmlFor="date">
                  <Typography
                    component="span"
                    sx={{ color: 'error.main', fontSize: 12 }}
                  >
                    *
                  </Typography>{' '}
                  Record Date Range
                </InputLabel>
                <Controller
                  name="dateRange"
                  control={control}
                  render={({ field }) => (
                    <>
                      <ReactDatepicker
                        selectsRange
                        maxDate={new Date()}
                        monthsShown={2}
                        onChange={field.onChange}
                        placeholderText="Start Date - End Date"
                        startDate={field.value?.[0] || null}
                        endDate={field.value?.[1] || null}
                        className={errors.dateRange ? 'error' : ''}
                      />
                      {errors.dateRange && (
                        <FormHelperText error sx={{ mt: 0.5, fontWeight: 600 }}>
                          {errors.dateRange.message}
                        </FormHelperText>
                      )}
                    </>
                  )}
                />
              </Box>
            </Grid>
          )}
          {watch('medicalRecordProvider') !== 'self' && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <InputLabel htmlFor="recordType">
                  <Typography
                    component="span"
                    sx={{ color: 'error.main', fontSize: 12 }}
                  >
                    *
                  </Typography>{' '}
                  Record Type
                </InputLabel>
                <Controller
                  name="recordType"
                  control={control}
                  render={({ field }) => (
                    <RecordTypeSelect
                      field={field}
                      error={!!errors.recordType}
                      errorMessage={errors.recordType?.message}
                    />
                  )}
                />
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>
      <Divider sx={{ mt: 1 }} />
    </>
  );
};

export default RecordInfoSection;
