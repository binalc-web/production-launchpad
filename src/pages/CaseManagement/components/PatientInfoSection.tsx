import {
  type Control,
  Controller,
  type FieldErrors,
  type FieldValues,
} from 'react-hook-form';
import {
  Typography,
  Box,
  CardContent,
  Grid,
  InputLabel,
  TextField,
  Divider,
  Autocomplete,
  CircularProgress,
  Fab,
} from '@mui/material';
import type { FormData, patientDetailsType } from '../types';
import UserProfileTile from '@/components/Table/UserProfileTile';
import { CaretDownIcon, PlusIcon } from '@phosphor-icons/react';

/**
 * Props for the PatientInfoSection component
 * @interface PatientInfoSectionProps
 * @property {Control<FormData>} control - React Hook Form control object
 * @property {FieldErrors<FormData>} errors - Form validation errors from React Hook Form
 * @property {patientDetailsType[] | undefined} patients - List of patients from API
 * @property {boolean} isLoading - Loading state for patients data
 */
interface PatientInfoSectionProps {
  // Use a more flexible control type to accommodate useForm's output
  control: Control<FormData, object, FieldValues>;
  errors: FieldErrors<FormData>;
  patients?: Array<patientDetailsType>;
  isLoading?: boolean;
  id?: number | undefined;
  handleOpen: () => void;
}

/**
 * Component that renders the Patient Information section of the case form
 * @component
 * @description Displays form fields for patient details including first name,
 * last name, email, and phone number. Part of the AddCase component refactoring
 * that breaks down a large form into smaller, focused components.
 *
 * @param {object} props - Component props
 * @param {Control<FormData>} props.control - React Hook Form control object
 * @param {FieldErrors<FormData>} props.errors - Form validation errors
 * @param {patientDetailsType[]} [props.patients] - List of patients from API
 * @param {boolean} [props.isLoading=false] - Loading state for patients data
 * @param {number | undefined} [props.id] - Case ID, if editing an existing case
 * @param {() => void} props.handleOpen - Function to open the invite patient modal
 * @returns {React.ReactElement} Rendered component
 */
const PatientInfoSection: React.FC<PatientInfoSectionProps> = ({
  control,
  errors,
  id,
  patients = [],
  isLoading = false,
  handleOpen,
}) => {
  return (
    <>
      <CardContent>
        <Typography variant="h6">Patient Information</Typography>
        <Grid mt={3} container spacing={2.5}>
          <Grid size={{ xs: 6 }}>
            <Box>
              <InputLabel htmlFor="patientId">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                Patient
              </InputLabel>
              <Controller
                name="patientId"
                control={control}
                render={({ field: { onChange, value, ...fieldProps } }) => (
                  <Autocomplete
                    id="patientId"
                    disabled={Boolean(id)}
                    options={patients || []}
                    popupIcon={<CaretDownIcon />}
                    getOptionLabel={(option) =>
                      typeof option === 'string'
                        ? option
                        : `${option.firstName} ${option.lastName}`
                    }
                    loading={isLoading}
                    value={
                      patients?.find((patient) => patient._id === value) || null
                    }
                    onChange={(_, newValue) => {
                      onChange(newValue ? newValue._id : '');
                    }}
                    renderInput={(parameters) => (
                      <TextField
                        {...parameters}
                        {...fieldProps}
                        placeholder="Select or Search patient"
                        error={!!errors.patientId}
                        helperText={errors.patientId?.message}
                        InputProps={{
                          ...parameters.InputProps,
                          endAdornment: (
                            <>
                              {isLoading ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : null}
                              {parameters.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box
                        component="li"
                        {...props}
                        sx={{
                          '& .MuiAvatar-root': {
                            width: 24,
                            height: 24,
                            fontSize: 12,
                          },
                        }}
                      >
                        <UserProfileTile
                          fullName={`${option.firstName} ${option.lastName}`}
                          imageUrl={option.avatar || undefined}
                        />
                      </Box>
                    )}
                  />
                )}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 6 }} sx={{ display: 'flex', alignItems: 'end' }}>
            <Fab color="primary" aria-label="add" onClick={handleOpen}>
              <PlusIcon />
            </Fab>
          </Grid>
        </Grid>
      </CardContent>
      <Divider sx={{ mt: 1 }} />
    </>
  );
};

export default PatientInfoSection;
