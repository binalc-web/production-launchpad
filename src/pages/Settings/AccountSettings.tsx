import {
  Box,
  Paper,
  Typography,
  Grid,
  InputLabel,
  TextField,
  InputAdornment,
  Button,
  Divider,
  Switch,
} from '@mui/material';
import type { AccountSettingsFromData } from './types/FromData';
import { AccountSettingsSchema } from './schema/accountSettingSchema';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth/useAuth';
import type { User } from './types/User';
import { useQuery } from '@tanstack/react-query';
import { getUserDetails } from '@/api/users/getUserDetails';

import { useUpdateUser } from './hooks/useUpdateUser';
import ToastAlert from '@/components/ToastAlert';
import { useUpdatePassword } from './hooks/useUpdatePassword';
import { trackEvent } from '@/utils/mixPanel/mixpanel';

const AccountSettings: React.FC = () => {
  const { basicUserDetails } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AccountSettingsFromData>({
    resolver: yupResolver(AccountSettingsSchema),
    mode: 'onChange',
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });
  const [checked, setChecked] = useState(true);
  const { mutate, isError, isSuccess, error } = useUpdateUser();
  const {
    mutate: updatePasswordMutate,
    isError: isErrorExistWhileUpdatePassword,
    isSuccess: isSuccessExistWhileUpdatePassword,
    error: errorExistWhileUpdatePassword,
  } = useUpdatePassword();

  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
  const [showErrorMessage, setShowErrorMessage] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setNewShowPassword] = useState(false);
  const [showConfirmNewPassword, setConfirmNewPassword] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const {
    data: userInformation,
  }: {
    data: User | undefined;
    refetch: () => void;
  } = useQuery({
    queryKey: ['userDetails'],
    queryFn: async () => {
      const data = await getUserDetails(basicUserDetails?.userId ?? '');
      return data;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    void trackEvent('Account setting Page Viewed', {
      userId: basicUserDetails?.userId,
    });
  }, [basicUserDetails?.userId]);

  useEffect(() => {
    if (isSuccess || isSuccessExistWhileUpdatePassword) {
      setShowSuccessMessage(true);
      void trackEvent(
        isSuccess
          ? 'Notification preferences updated'
          : 'Password updated successfully',
        {
          userId: basicUserDetails?.userId,
        }
      );
      setSuccessMessage(
        isSuccess
          ? 'Notification preferences updated!'
          : 'Password updated successfully.'
      );
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 2000);
    }
  }, [isSuccess, isSuccessExistWhileUpdatePassword, basicUserDetails?.userId]);

  useEffect(() => {
    if (isError || isErrorExistWhileUpdatePassword) {
      setShowErrorMessage(true);

      const errorMessage = isError
        ? (error?.message ?? 'Something went wrong!')
        : (errorExistWhileUpdatePassword?.message ?? 'Something went wrong.');

      setErrorMessage(errorMessage);

      setTimeout(() => {
        setShowErrorMessage(false);
      }, 2000);
    }
  }, [isError, isErrorExistWhileUpdatePassword]);

  useEffect(() => {
    if (userInformation) {
      setChecked(userInformation?.isEmailNotification ?? true);
    }
  }, [userInformation]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setChecked(event.target.checked);

    mutate({
      user: { isEmailNotification: event.target.checked },
    });
  };

  const onSubmit = (data: AccountSettingsFromData): void => {
    updatePasswordMutate({
      password: data.oldPassword,
      newPassword: data.newPassword,
      confirmNewPassword: data.confirmNewPassword,
    });
    reset();
  };

  return (
    <>
      <Box
        component={Paper}
        py={1.6}
        px={2.4}
        mt={2}
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
      >
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Typography fontWeight={600} fontSize={16} color="natural.700">
            Change Password
          </Typography>

          <Grid mt={3} container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Box>
                <InputLabel htmlFor="oldPassword">Current Password</InputLabel>
                <Controller
                  name="oldPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      {...field}
                      id="oldPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      error={!!errors.oldPassword}
                      helperText={errors.oldPassword?.message}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment
                              position="end"
                              sx={{
                                cursor: 'pointer',
                              }}
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeIcon size={20} />
                              ) : (
                                <EyeSlashIcon size={20} />
                              )}
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  )}
                />
              </Box>
            </Grid>
          </Grid>
          <Grid mt={3} container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Box>
                <InputLabel htmlFor="newPassword">New Password</InputLabel>
                <Controller
                  name="newPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      {...field}
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      error={!!errors.newPassword}
                      helperText={errors.newPassword?.message}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment
                              position="end"
                              sx={{
                                cursor: 'pointer',
                              }}
                              onClick={() =>
                                setNewShowPassword(!showNewPassword)
                              }
                            >
                              {showNewPassword ? (
                                <EyeIcon size={20} />
                              ) : (
                                <EyeSlashIcon size={20} />
                              )}
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  )}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Box>
                <InputLabel htmlFor="confirmNewPassword">
                  Confirm New Password
                </InputLabel>
                <Controller
                  name="confirmNewPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      {...field}
                      id="confirmNewPassword"
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      error={!!errors.confirmNewPassword}
                      helperText={errors.confirmNewPassword?.message}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment
                              position="end"
                              sx={{
                                cursor: 'pointer',
                              }}
                              onClick={() =>
                                setConfirmNewPassword(!showConfirmNewPassword)
                              }
                            >
                              {showConfirmNewPassword ? (
                                <EyeIcon size={20} />
                              ) : (
                                <EyeSlashIcon size={20} />
                              )}
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  )}
                />
              </Box>
            </Grid>
          </Grid>

          <Box
            sx={{
              mt: 2.4,
              mb: 1,
              gap: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Button loading={false} type="submit" variant="contained">
              Update
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                reset();
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
      </Box>

      <Box
        component={Paper}
        mt={2}
        py={1.6}
        px={2.4}
        display="flex"
        flexDirection="column"
      >
        <Box display="flex" flexDirection="column">
          <Box
            display="flex"
            flexDirection="row"
            width="100%"
            justifyContent="space-between"
          >
            <Typography fontWeight={600} fontSize={16} color="natural.700">
              Enable Notifications For
            </Typography>
            <Typography fontWeight={600} fontSize={16} color="natural.700">
              Email
            </Typography>
          </Box>
          <Divider
            sx={{
              mt: 1.6,
            }}
          />

          <Box
            py={3}
            display="flex"
            flexDirection="row"
            width="100%"
            justifyContent="space-between"
          >
            <Typography fontWeight={500} fontSize={16} color="natural.700">
              General Notifications
            </Typography>
            <Switch onChange={handleChange} checked={checked} />
          </Box>
        </Box>
        <ToastAlert
          placement="right"
          severity="success"
          showAlert={showSuccessMessage}
          onClose={() => setShowSuccessMessage(false)}
          message={successMessage}
          icon={<CheckIcon weight="bold" />}
        />
        <ToastAlert
          placement="right"
          severity="error"
          showAlert={showErrorMessage}
          onClose={() => setShowErrorMessage(false)}
          message={errorMessage}
          icon={<XCircleIcon weight="bold" />}
        />
      </Box>
    </>
  );
};

export default AccountSettings;
