import type { FC } from 'react';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import type { FormData } from './index';
import {
  Typography,
  Box,
  TextField,
  Grid,
  InputLabel,
  CardContent,
  Divider,
} from '@mui/material';

type PatientInfoSectionProps = {
  control: Control<FormData>;
  errors: FieldErrors<FormData>;
};

const PatientInfoSection: FC<PatientInfoSectionProps> = ({
  control,
  errors,
}) => {
  return (
    <>
      <CardContent>
        <Typography variant="h6">Patient Information</Typography>
        <Grid mt={3} container spacing={2.5}>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <Box>
              <InputLabel htmlFor="firstName">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                First Name
              </InputLabel>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <TextField
                    disabled
                    fullWidth
                    id="firstName"
                    type="text"
                    placeholder="Enter first name"
                    {...field}
                    error={!!errors.firstName}
                    helperText={errors.firstName?.message}
                  />
                )}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <Box>
              <InputLabel htmlFor="lastName">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                Last Name
              </InputLabel>
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <TextField
                    disabled
                    fullWidth
                    id="lastName"
                    type="text"
                    placeholder="Enter last name"
                    {...field}
                    error={!!errors.lastName}
                    helperText={errors.lastName?.message}
                  />
                )}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <Box>
              <InputLabel htmlFor="subRole">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                Sub-Role
              </InputLabel>
              <Controller
                name="subRole"
                control={control}
                render={({ field }) => (
                  <TextField
                    disabled
                    fullWidth
                    id="subRole"
                    type="text"
                    placeholder="Enter sub-role"
                    {...field}
                    error={!!errors.subRole}
                    helperText={errors.subRole?.message}
                  />
                )}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <Box>
              <InputLabel htmlFor="caseId">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                Case ID
              </InputLabel>
              <Controller
                name="caseId"
                control={control}
                render={({ field }) => (
                  <TextField
                    disabled
                    fullWidth
                    id="caseId"
                    type="text"
                    placeholder="Enter case ID"
                    {...field}
                    error={!!errors.caseId}
                    helperText={errors.caseId?.message}
                  />
                )}
              />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
      <Divider sx={{ mt: 1 }} />
    </>
  );
};

export default PatientInfoSection;
