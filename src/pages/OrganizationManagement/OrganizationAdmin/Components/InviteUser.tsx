import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Divider,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Grid,
  TextField,
  type SelectChangeEvent,
} from '@mui/material';
import { XIcon } from '@phosphor-icons/react';
import { yupResolver } from '@hookform/resolvers/yup';
import { InvitePatientSchema } from '../schema/validationSchema';
import { Controller, useForm } from 'react-hook-form';
import type { FormData } from '../types/FromData';
import { useEffect, useState } from 'react';
import PhoneInput from '@/components/PhoneInput';
import { useMutation } from '@tanstack/react-query';
import type { InvitePatientType } from '@/api/roleManagement/invitePatient';
import { PopUp } from '@/components/Popup';
import ToastAlert from '@/components/ToastAlert';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import { inviteUser } from '@/api/OrganizationManagement/inviteUser';
import { useAuth } from '@/context/auth/useAuth';

interface InvitePatientPopOverProps {
  open: boolean;
  handleClose: () => void;
  shouldShowUserTypeDropdown?: boolean;
  userRole?: string;
  organizationId?: string;
}

const InviteUser: React.FC<InvitePatientPopOverProps> = ({
  open,
  handleClose,
  shouldShowUserTypeDropdown = false,
  userRole,
  organizationId,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    // setValue,
  } = useForm<FormData>({
    resolver: yupResolver(InvitePatientSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      contact: '',
      email: '',
    },
  });

  const [roleError, setRoleError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('patient');
  const [isErrorInvitePatient, setIsErrorInvitePatient] =
    useState<boolean>(false);

  const { basicUserDetails } = useAuth();

  const {
    mutate,
    isError,
    error,
    isSuccess,
    isPending,
    reset: resetMutation,
  } = useMutation({
    mutationFn: async (inviteData: InvitePatientType) => {
      // Call the API to invite the patient
      const response = await inviteUser(inviteData);
      return response;
    },
  });

  useEffect(() => {
    if (isError) {
      setIsErrorInvitePatient(true);
      setTimeout(() => {
        setIsErrorInvitePatient(false);
        reset();
      }, 2000);
    }
  }, [isError, reset]);

  const onSubmit = async (data: FormData): Promise<void> => {
    try {
      // Import the utility function to strip phone formatting
      // We want to ensure that phone numbers are sent to the API without formatting
      const { stripPhoneFormatting } = await import(
        '../../../../utils/phoneUtilities'
      );

      // Create a copy of the data and clean phone numbers
      const dataToSendApi: InvitePatientType = {
        ...data,
        ...(organizationId && {
          organizationId,
        }),
        role: shouldShowUserTypeDropdown
          ? selectedRole
          : userRole
            ? userRole
            : basicUserDetails!.role,
      };
      dataToSendApi.contact = stripPhoneFormatting(data.contact);

      mutate(dataToSendApi);
    } catch (error) {
      console.error('Error importing phone utilities:', error);
    }
  };

  const handleRoleChange = (event: SelectChangeEvent): void => {
    setSelectedRole(event.target.value);
    setRoleError(null);
  };

  return (
    <Dialog
      sx={{
        '& .MuiPaper-root': {
          borderRadius: '24px',
          width: 700,
        },
      }}
      open={open}
    >
      <DialogContent
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          ml={3.2}
          mr={3.2}
          mt={1.6}
          mb={1.6}
          display={'flex'}
          justifyContent="space-between"
          alignItems={'center'}
        >
          <Typography
            fontWeight={600}
            fontSize={20}
            variant="h4"
            color="neutral.600"
          >
            Invite User
          </Typography>
          <IconButton
            onClick={() => {
              reset();
              handleClose();
              setIsErrorInvitePatient(false);
            }}
            sx={{
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: 'transparent',
              },
            }}
          >
            <XIcon size={24} color="neutral.500" />
          </IconButton>
        </Box>
        <Divider />
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Box
            p={3.2}
            sx={{
              gap: 1,
              flexDirection: 'column',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {shouldShowUserTypeDropdown && (
              <Box width={'100%'}>
                <InputLabel>
                  <Typography component="span" sx={{ color: 'error.main' }}>
                    *
                  </Typography>{' '}
                  User Type
                </InputLabel>
                <Select
                  fullWidth
                  size="large"
                  displayEmpty
                  value={selectedRole}
                  error={!!roleError}
                  onChange={handleRoleChange}
                >
                  <MenuItem value="" disabled>
                    Select Role
                  </MenuItem>
                  <MenuItem value="patient">Patient</MenuItem>
                  <MenuItem value="legal_user">Legal User</MenuItem>
                </Select>
                {roleError && <FormHelperText>{roleError}</FormHelperText>}
              </Box>
            )}

            <Grid
              mt={2}
              container
              spacing={2.5}
              sx={{
                width: '100%',
              }}
            >
              <Grid size={{ xs: 12, md: 6, lg: 6 }}>
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
                        fullWidth
                        id="firstName"
                        type="text"
                        placeholder="Enter first name"
                        {...{
                          ...field,
                          onChange: (
                            event: React.ChangeEvent<HTMLInputElement>
                          ) => {
                            const value = event.target.value.replace(
                              /^\s+|\s+$/g,
                              ''
                            );
                            field.onChange(value);
                          },
                        }}
                        error={!!errors.firstName}
                        helperText={errors.firstName?.message}
                      />
                    )}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6, lg: 6 }}>
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
                        fullWidth
                        id="lastName"
                        type="text"
                        placeholder="Enter Last name"
                        {...{
                          ...field,
                          onChange: (
                            event: React.ChangeEvent<HTMLInputElement>
                          ) => {
                            const value = event.target.value.replace(
                              /^\s+|\s+$/g,
                              ''
                            );
                            field.onChange(value);
                          },
                        }}
                        error={!!errors.lastName}
                        helperText={errors.lastName?.message}
                      />
                    )}
                  />
                </Box>
              </Grid>
            </Grid>

            <Box width="100%" mt={2}>
              <InputLabel htmlFor="email">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                Email
              </InputLabel>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    id="email"
                    type="text"
                    placeholder="Enter Email"
                    {...field}
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />
            </Box>

            <Box width="100%" mt={2}>
              <InputLabel htmlFor="contact">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                Phone
              </InputLabel>
              <Controller
                name="contact"
                control={control}
                render={({ field: { onChange, value, ...fieldProps } }) => (
                  <PhoneInput
                    value={value || ''}
                    onChange={onChange}
                    error={!!errors.contact}
                    helperText={errors.contact?.message}
                    textFieldProps={{
                      id: 'contact',
                      placeholder: 'Enter Phone',
                      ...fieldProps,
                    }}
                  />
                )}
              />
            </Box>
          </Box>

          <Divider />

          <Box
            p={2.4}
            sx={{
              gap: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Button
              loading={isPending}
              type="submit"
              variant="contained"
              size="large"
            >
              Send Invite
            </Button>
            <Button
              size="large"
              variant="outlined"
              onClick={() => {
                reset();
                handleClose();
                setIsErrorInvitePatient(false);
              }}
              sx={{
                color: 'neutral.700',
                borderColor: 'neutral.500',
              }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
        {isSuccess ? (
          <PopUp
            type="INVITE_PATIENT"
            title="Invitation Sent Successfully!"
            buttonText="Okay, Understood"
            isOpen={isSuccess}
            description="An invite has been sent to the email you mentioned."
            onClick={() => {
              reset();
              void trackEvent('Patient Invited');
              handleClose();
              resetMutation();
              setIsErrorInvitePatient(false);
            }}
          />
        ) : null}

        {isErrorInvitePatient ? (
          <ToastAlert
            placement="right"
            severity="error"
            showAlert={isErrorInvitePatient}
            onClose={() => {
              setIsErrorInvitePatient(false);
              reset();
              handleClose();
            }}
            message={
              error instanceof Error
                ? error.message
                : 'Failed to send invitation. Please try again.'
            }
            icon={<XIcon weight="bold" />}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default InviteUser;
