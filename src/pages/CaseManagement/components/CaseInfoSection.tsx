import type { ReactNode } from 'react';
import {
  Controller,
  type UseFormSetValue,
  type Control,
  type FieldErrors,
  type UseFormWatch,
} from 'react-hook-form';

import {
  Typography,
  Box,
  CardContent,
  Grid,
  InputLabel,
  TextField,
  Select,
  MenuItem,
  Avatar,
  Divider,
} from '@mui/material';
import ReactDatepicker from '@/components/ReactDatepicker';
import type { FormData } from '../types';
import {
  CASE_STATUS_OPTIONS,
  CASE_TYPE_OPTIONS,
  AUTHORIZING_PERSON_OPTIONS,
} from '../constants/options';
import MultiSelectField from './MultiSelectField';
import InterestedThirdPartyMultiSelect from './InterestedThirdPartyMultiSelect';
import { renderPlaceholder, emptySelectStyle } from '@/utils/placeholder';
import { useAuth } from '@/context/auth/useAuth';

/**
 * Props for the CaseInfoSection component
 * @interface CaseInfoSectionProps
 * @property {number} [id] - Optional case ID
 * @property {Control<FormData>} control - react-hook-form control object
 * @property {FieldErrors<FormData>} errors - Form validation errors
 * @property {UseFormWatch<FormData>} watch - react-hook-form watch function
 * @property {boolean} isError - Whether there was an error loading data
 * @property {boolean} isLoading - Whether data is being loaded
 * @property {UseFormSetValue<FormData>} setValue - Function to set form values
 * @property {object} data - Data containing available assignees
 */
export type CaseInfoSectionProps = {
  id?: number;
  control: Control<FormData>;
  errors: FieldErrors<FormData>;
  watch: UseFormWatch<FormData>;
  isError: boolean;
  isLoading: boolean;
  setValue: UseFormSetValue<FormData>;
  data: {
    data: Array<{
      _id: string;
      firstName: string;
      lastName: string;
      avatar: string;
      businessDetail: {
        name: string;
      };
    }>;
  };
};

/**
 * Component that renders an avatar with user's first and last name
 * @component
 * @param {object} props - The component props
 * @param {string} props.firstName - User's first name
 * @param {string} props.lastName - User's last name
 * @param {string} props.avatar - URL to the user's avatar image
 * @returns {ReactNode} Avatar with user name
 */
export const SelectAvatar = ({
  firstName,
  lastName,
  avatar,
}: {
  firstName: string;
  lastName: string;
  avatar: string;
}): ReactNode => {
  return (
    <Box
      sx={{
        mt: 0.25,
        gap: 1,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Avatar
        src={avatar || undefined}
        sx={{ height: 20, width: 20, fontSize: 12 }}
      >
        {lastName?`${firstName[0]}${lastName[0]}`:firstName[0]}
      </Avatar>
      <Typography fontSize={14}>{firstName + ' ' + lastName}</Typography>
    </Box>
  );
};

/**
 * Component that renders the Case Information section of the case form
 * @component
 * @description Displays form fields for case details including case ID, title, type, status,
 * start date, case description, authorizing person type, and various related fields.
 * Handles conditional rendering based on authorizing person type selection.
 *
 * @param {object} props - Component props
 * @param {number} [props.id] - Optional case ID
 * @param {object} props.data - Data containing available assignees
 * @param {boolean} props.isError - Whether there was an error loading data
 * @param {boolean} props.isLoading - Whether data is being loaded
 * @param {Control<FormData>} props.control - react-hook-form control object
 * @param {FieldErrors<FormData>} props.errors - Form validation errors
 * @param {UseFormWatch<FormData>} props.watch - Function to subscribe to form changes
 * @param {UseFormSetValue<FormData>} props.setValue - Function to set form values
 * @returns {React.ReactElement} Rendered component
 */
const CaseInfoSection: React.FC<CaseInfoSectionProps> = ({
  id,
  data,
  isError,
  isLoading,
  control,
  errors,
  watch,
  setValue,
}) => {
  const authorizingPerson = watch('authorizingPerson');

  const { basicUserDetails } = useAuth();
  return (
    <>
      <CardContent
        sx={{
          '& .MuiSelect-select': {
            height: '24px !important',
          },
        }}
      >
        <Typography variant="h6">Case Information</Typography>
        <Grid mt={3} container spacing={2.5}>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <Box>
              <InputLabel htmlFor="caseID">Case ID</InputLabel>
              <TextField
                fullWidth
                disabled
                id="caseID"
                type="text"
                value={id || 'After Case Creation'}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box>
              <InputLabel htmlFor="caseTitle">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                Case Title
              </InputLabel>
              <Controller
                name="caseTitle"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    id="caseTitle"
                    type="text"
                    placeholder="Enter case title e.g. The Workplace Injury - March 2025"
                    error={!!errors.caseTitle}
                    helperText={errors.caseTitle?.message}
                    {...{
                      ...field,
                      onChange: (
                        event: React.ChangeEvent<HTMLInputElement>
                      ) => {
                        const value = event.target.value.replace(/^\s+/, '');
                        field.onChange(value);
                      },
                    }}
                  />
                )}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <Box>
              <InputLabel htmlFor="caseStatus">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                Case Status
              </InputLabel>
              <Controller
                name="caseStatus"
                control={control}
                render={({ field }) => (
                  <>
                    <Select fullWidth {...field} error={!!errors.caseStatus}>
                      {CASE_STATUS_OPTIONS.map((option) => (
                        <MenuItem
                          key={option.value}
                          value={option.value}
                          disabled={option.value === 'closed' && !id}
                        >
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.caseStatus && (
                      <Typography
                        variant="caption"
                        color="error.main"
                        sx={{ mt: 0.5, display: 'block' }}
                      >
                        {errors.caseStatus.message}
                      </Typography>
                    )}
                  </>
                )}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <Box>
              <InputLabel htmlFor="caseType">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                Case Type
              </InputLabel>
              <Controller
                name="caseType"
                control={control}
                render={({ field }) => (
                  <>
                    <Select
                      fullWidth
                      {...field}
                      error={!!errors.caseType}
                      displayEmpty
                      renderValue={(value) =>
                        renderPlaceholder(
                          value,
                          CASE_TYPE_OPTIONS,
                          'Select Case Type'
                        )
                      }
                      sx={{
                        ...emptySelectStyle(field.value),
                      }}
                    >
                      {CASE_TYPE_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.caseType && (
                      <Typography
                        variant="caption"
                        color="error.main"
                        sx={{ mt: 0.5, display: 'block' }}
                      >
                        {errors.caseType.message}
                      </Typography>
                    )}
                  </>
                )}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <Box>
              <InputLabel htmlFor="date">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                Case Start Date
              </InputLabel>
              <>
                <Controller
                  name="date"
                  control={control}
                  render={({ field }) => (
                    <ReactDatepicker
                      maxDate={new Date()}
                      onChange={field.onChange}
                      placeholderText="Select Date"
                      selected={field.value}
                      disabled={id ? true : false}
                      className={errors.date ? 'error' : ''}
                    />
                  )}
                />
                {errors.date && (
                  <Typography
                    variant="caption"
                    color="error.main"
                    sx={{ mt: 0.5, display: 'block' }}
                  >
                    {errors.date.message}
                  </Typography>
                )}
              </>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <Box>
              <InputLabel htmlFor="assigneeName">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                Assignee Name
              </InputLabel>
              <Controller
                name="assigneeName"
                control={control}
                render={({ field }) => (
                  <>
                    <Select
                      fullWidth
                      {...field}
                      displayEmpty
                      error={!!errors.assigneeName}
                      renderValue={(selected) => {
                        const option = data?.data?.find(
                          (option) => option._id === selected
                        );
                        return option && selected ? (
                          <SelectAvatar
                            firstName={
                              basicUserDetails?.userId === option._id
                                ? 'Self'
                                : option.firstName
                            }
                            lastName={
                              basicUserDetails?.userId === option._id
                                ? ''
                                : option.lastName
                            }
                            avatar={`${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${option?.avatar}`}
                          />
                        ) : (
                          'Select Assignee'
                        );
                      }}
                      sx={{
                        ...emptySelectStyle(field.value),
                      }}
                    >
                      {isLoading ? (
                        <MenuItem value="">Loading...</MenuItem>
                      ) : isError ? (
                        <MenuItem value="">Error loading assignees</MenuItem>
                      ) : data?.data?.length ? (
                        data?.data.map((option) => (
                          <MenuItem key={option._id} value={option._id}>
                            <Box
                              sx={{
                                gap: 1,
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <Avatar
                                src={`${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${option?.avatar}`}
                                sx={{ height: 24, width: 24, fontSize: 12 }}
                              >
                                {option.firstName[0] + option.lastName[0]}
                              </Avatar>
                              <Typography>
                                {`${basicUserDetails?.userId === option._id ? 'self' : option.firstName + ' ' + option.lastName}`}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem value="">No Assignees Found</MenuItem>
                      )}
                    </Select>
                    {errors.assigneeName && (
                      <Typography
                        variant="caption"
                        color="error.main"
                        sx={{ mt: 0.5, display: 'block' }}
                      >
                        {errors.assigneeName.message}
                      </Typography>
                    )}
                  </>
                )}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <Box>
              <InputLabel htmlFor="authorizingPerson">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                Authorizing Person
              </InputLabel>
              <Controller
                name="authorizingPerson"
                control={control}
                render={({ field }) => (
                  <>
                    <Select
                      fullWidth
                      {...field}
                      error={!!errors.authorizingPerson}
                      displayEmpty
                      renderValue={(value) =>
                        renderPlaceholder(
                          value,
                          AUTHORIZING_PERSON_OPTIONS,
                          'Select Authorizing Person'
                        )
                      }
                      onChange={(event) => {
                        field.onChange(event.target.value);
                        if (event.target.value === 'self') {
                          setValue('attorneyName', '');
                        }
                      }}
                      sx={{
                        ...emptySelectStyle(field.value),
                      }}
                    >
                      {AUTHORIZING_PERSON_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.authorizingPerson && (
                      <Typography
                        variant="caption"
                        color="error.main"
                        sx={{ mt: 0.5, display: 'block' }}
                      >
                        {errors.authorizingPerson.message}
                      </Typography>
                    )}
                  </>
                )}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <Box>
              <InputLabel htmlFor="attorneyName">
                {authorizingPerson !== 'self' && (
                  <Typography
                    component="span"
                    sx={{ color: 'error.main', fontSize: 12 }}
                  >
                    *
                  </Typography>
                )}{' '}
                {authorizingPerson === 'guardian'
                  ? 'Guardian/Social Worker Name'
                  : authorizingPerson === 'power_of_attorney'
                    ? 'Power of Attorney/Trustee Name'
                    : 'Attorney Name'}
              </InputLabel>
              <Controller
                name="attorneyName"
                control={control}
                render={({ field }) => (
                  <>
                    <Select
                      fullWidth
                      {...field}
                      displayEmpty
                      disabled={
                        authorizingPerson === 'self' || authorizingPerson === ''
                      }
                      error={
                        !!errors.attorneyName && authorizingPerson !== 'self'
                      }
                      renderValue={(selected) => {
                        const option = data?.data?.find(
                          (option) => option._id === selected
                        );
                        return selected === '' ? (
                          'Select Attorney'
                        ) : option ? (
                          <SelectAvatar
                            firstName={option.firstName}
                            lastName={option.lastName}
                            avatar={`${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${option?.avatar}`}
                          />
                        ) : authorizingPerson === 'guardian' ? (
                          'Guardian/Social Worker Name'
                        ) : authorizingPerson === 'power_of_attorney' ? (
                          'Power of Attorney/Trustee Name'
                        ) : (
                          'Select Attorney'
                        );
                      }}
                      sx={{
                        ...emptySelectStyle(field.value as string),
                      }}
                    >
                      {isLoading ? (
                        <MenuItem value="">Loading...</MenuItem>
                      ) : isError ? (
                        <MenuItem value="">Error loading assignees</MenuItem>
                      ) : data?.data?.length ? (
                        data?.data.map((option) => (
                          <MenuItem key={option._id} value={option._id}>
                            <Box
                              sx={{
                                gap: 1,
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <Avatar
                                src={`${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${option?.avatar}`}
                                sx={{ height: 24, width: 24, fontSize: 12 }}
                              >
                                {option.firstName[0] + option.lastName[0]}
                              </Avatar>
                              <Typography>
                                {option.firstName + ' ' + option.lastName}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem value="">No Assignees Found</MenuItem>
                      )}
                    </Select>
                    {errors.attorneyName && authorizingPerson !== 'self' && (
                      <Typography
                        variant="caption"
                        color="error.main"
                        sx={{ mt: 0.5, display: 'block' }}
                      >
                        {authorizingPerson === 'guardian'
                          ? errors.attorneyName.message?.replace(
                              'Attorney',
                              'Guardian'
                            )
                          : errors.attorneyName.message}
                      </Typography>
                    )}
                  </>
                )}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <Box>
              <InputLabel htmlFor="interestedThirdPartyType">
                Interested Third Party Type
              </InputLabel>
              <MultiSelectField
                control={control}
                errors={errors}
                name="interestedThirdPartyType"
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box>
              <InputLabel htmlFor="interestedThirdPartyName">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  {watch('interestedThirdPartyType')?.length > 0 ? '*' : ''}
                </Typography>{' '}
                Interested Third Parties
              </InputLabel>
              <InterestedThirdPartyMultiSelect
                control={control}
                errors={errors}
                name="interestedThirdPartyName"
                options={data?.data || []}
                disabled={!watch('interestedThirdPartyType')?.length}
              />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
      <Divider sx={{ mt: 1 }} />
    </>
  );
};

export default CaseInfoSection;
