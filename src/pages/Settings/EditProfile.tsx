import { yupResolver } from '@hookform/resolvers/yup';
import {
  Box,
  Divider,
  Paper,
  Typography,
  Grid,
  InputLabel,
  TextField,
  Select,
  MenuItem,
  CardContent,
  Button,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import PhoneInput from '@/components/PhoneInput';

import type { FormData } from './types/FromData';
import { EditProfileSchema } from './schema/validationSchema';
import {
  CaretDownIcon,
  CheckIcon,
  UploadSimpleIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import {
  CITY_OPTIONS,
  COUNTRY_OPTIONS,
  STATE_OPTIONS,
} from './constants/options';
import { useNavigate } from '@tanstack/react-router';
import type { User } from './types/User';
import { getUserDetails } from '@/api/users/getUserDetails';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth/useAuth';
import { useCallback, useEffect, useState } from 'react';
import { roles } from '../Register/steps/data';
import { useUpdateUser } from './hooks/useUpdateUser';
import ToastAlert from '@/components/ToastAlert';
import { useDropzone } from 'react-dropzone';
import type {
  UploadedFile,
  UploadFilesResponse,
} from '../CaseManagement/AddCase';
import { uploadCaseFilesAPI } from '@/api/caseManagement/addCase';
import axios from 'axios';
import profile from '@assets/profile.png';
import { trackEvent } from '@/utils/mixPanel/mixpanel';

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const { basicUserDetails } = useAuth();
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
  const [showErrorMessage, setShowErrorMessage] = useState<boolean>(false);
  const [preview, setPreview] = useState<string | null>(null);

  const [fileInfo, setFileInfo] = useState<{
    name: string;
    type: string;
    base64: ArrayBuffer | null;
  } | null>(null);

  const { mutate, isError, isSuccess, error } = useUpdateUser();

  const mutateCall = useCallback(
    (cleanedData: FormData) => {
      mutate({
        user: {
          firstName: cleanedData.firstName,
          ...(cleanedData.avatar && { avatar: cleanedData.avatar }),
          lastName: cleanedData.lastName,
          contact: cleanedData.contact,
          addressDetails: {
            streetName: cleanedData.streetName,
            country: cleanedData.country,
            city: cleanedData.city,
            state: cleanedData.state,
            zipCode: Number(cleanedData.zipCode),
          },

          ...(basicUserDetails?.role === 'legal_user' && {
            businessDetails: {
              name: cleanedData.businessName ?? '',
              contact: cleanedData.businessContact ?? '',
              email: cleanedData.businessEmail ?? '',
            },

            subRoleDetails: {
              name: cleanedData.subRoleName ?? '',
              contact: cleanedData.subRoleContact ?? '',
              email: cleanedData.subRoleEmail ?? '',
            },
          }),
        },
      });
    },
    [basicUserDetails?.role, mutate]
  );

  const uploadFilesMutation = useMutation<UploadFilesResponse, Error>({
    mutationFn: async () => {
      const response = await uploadCaseFilesAPI({
        filesFor: 'avatars',
        files: [
          {
            name: fileInfo?.name?.replace(/\s+/g, '_') ?? '',
            mimeType: fileInfo?.type ?? '',
          },
        ],
      });

      await Promise.all(
        response.data.map(async (uploadedFile: UploadedFile) => {
          try {
            await axios.request({
              method: 'put',
              url: uploadedFile.signedUrl,
              headers: {
                'Content-Type': fileInfo?.type ?? '',
              },
              data: fileInfo?.base64,
            });

            return uploadedFile.key;
          } catch (error) {
            console.error('Failed to upload file:', error);

            setShowErrorMessage(true);
            setTimeout(() => {
              setShowErrorMessage(false);
            }, 2000);

            throw error;
          }
        })
      );

      return response;
    },
  });

  const onSubmit = async (data: FormData): Promise<void> => {
    try {
      // Import the utility function to strip phone formatting
      // We want to ensure that phone numbers are sent to the API without formatting
      const { stripPhoneFormatting } = await import(
        '../../utils/phoneUtilities'
      );

      // Create a copy of the data and clean phone numbers
      const cleanedData = { ...data };
      cleanedData.contact = stripPhoneFormatting(data.contact);
      if (data.businessContact) {
        cleanedData.businessContact = stripPhoneFormatting(
          data.businessContact
        );
      }
      if (data.subRoleContact) {
        cleanedData.subRoleContact = stripPhoneFormatting(data.subRoleContact);
      }
      if (fileInfo) {
        void uploadFilesMutation.mutateAsync().then((response) => {
          console.log('response??', response, response.data.length);
          if (response && response.data.length > 0) {
            const avatarKey = response.data[0].key;
            cleanedData.avatar = avatarKey;
          }
          mutateCall(cleanedData);
        });
      } else {
        mutateCall(cleanedData);
      }
    } catch (error) {
      console.error('Error processing form submission:', error);
      setShowErrorMessage(true);
    }
  };

  const {
    data: userInformation,
  }: {
    data: User | undefined;
    isLoading: boolean;
    isError: boolean;
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

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<FormData>({
    // @ts-expect-error yupResolver type mismatch
    resolver: yupResolver(EditProfileSchema, {
      context: { role: basicUserDetails?.role },
    }),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      contact: '',
      email: '',
      streetName: '',
      country: '',
      state: '',
      city: '',
      zipCode: '',
      subRoleName: '',
      subRoleContact: '',
      subRoleEmail: '',
      businessContact: '',
      businessEmail: '',
      businessName: '',
    },
  });

  useEffect(() => {
    if (isSuccess === true) {
      reset();
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
        void trackEvent('Profile Edited', {
          userId: basicUserDetails?.userId,
        });
        void navigate({
          to: '/settings/profile-overview',
        });
      }, 2000);
    }
  }, [basicUserDetails?.userId, isSuccess, navigate, reset]);

  useEffect(() => {
    if (isError === true) {
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
      }, 2000);
    }
  }, [isError]);

  useEffect(() => {
    if (userInformation) {
      setValue('firstName', userInformation?.firstName ?? '');
      setValue('lastName', userInformation.lastName ?? '');
      setValue('contact', userInformation.contact ?? '');
      setValue('email', userInformation.email ?? '');
      setValue('streetName', userInformation.addressDetails?.streetName ?? '');
      setValue('country', userInformation.addressDetails?.country ?? '');
      setValue('state', userInformation.addressDetails?.state ?? '');
      setValue('city', userInformation.addressDetails?.city ?? '');
      setValue(
        'zipCode',
        userInformation.addressDetails?.zipCode?.toString() ?? ''
      );
      setValue('subRoleName', userInformation.subRoleDetails?.name ?? '');
      setValue(
        'subRoleContact',
        userInformation.subRoleDetails?.contact?.toString() ?? ''
      );
      setValue('subRoleEmail', userInformation.subRoleDetails?.email ?? '');
      setValue(
        'businessContact',
        userInformation.businessDetails?.contact.toString() ?? ''
      );
      setValue('businessEmail', userInformation.businessDetails?.email ?? '');
      setValue('businessName', userInformation.businessDetails?.name ?? '');
    }
  }, [setValue, userInformation]);

  const getSubRoleTitle = (
    role: string,
    subRole: string
  ): string | undefined => {
    const mainRole = roles.find((r) => r.role === role);
    return mainRole?.subRoles?.find((sr) => sr.role === subRole)?.title;
  };

  const onDrop = useCallback(
    async (acceptedFiles: Array<File>): Promise<void> => {
      const file = acceptedFiles[0];
      if (file) {
        const reader = new FileReader();

        const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (): void => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });

        reader.onload = (): void => {
          setFileInfo({
            name: file.name,
            type: file.type,
            base64: fileData,
          });

          setPreview(URL.createObjectURL(file));
        };

        reader.readAsDataURL(file);
      }
    },
    []
  );

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop: onDrop as unknown as (acceptedFiles: Array<File>) => void,
    noClick: true,
    noKeyboard: true,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
    },
    multiple: false,
  });

  return (
    // @ts-expect-error yupResolver type mismatch
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Box
        component={Paper}
        sx={{
          mt: 2,
        }}
      >
        <Box
          py={1.6}
          mx={2.4}
          display="flex"
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography color="natural.700" fontSize={20} fontWeight={600}>
            Edit Profile
          </Typography>
        </Box>
        <Divider />

        <Box display="flex" flexDirection="column" py={1.6} mx={2.4}>
          <Typography fontSize={16} fontWeight={600} color="natural.700">
            Basic Details
          </Typography>

          <Box
            mt={2.5}
            display="flex"
            flexDirection="row"
            gap={5}
            alignItems="center"
          >
            <Box
              width={96}
              height={96}
              component="img"
              border="1px solid #ccc"
              sx={{
                objectFit: 'cover',
              }}
              borderRadius={1.6}
              src={
                preview
                  ? preview
                  : userInformation?.avatar
                    ? `${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${userInformation.avatar}`
                    : profile
              }
            />

            <Box
              {...getRootProps()}
              display="flex"
              flexDirection="column"
              alignItems="center"
              gap={2}
            >
              <Box component="input" {...getInputProps()} />
              <Button
                variant="contained"
                color="secondary"
                size="medium"
                startIcon={<UploadSimpleIcon />}
                sx={{ height: 35 }}
                onClick={open}
              >
                Change Profile Photo
              </Button>
            </Box>
          </Box>

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
                      fullWidth
                      id="lastName"
                      type="text"
                      placeholder="Enter Last name"
                      {...field}
                      error={!!errors.lastName}
                      helperText={errors.lastName?.message}
                    />
                  )}
                />
              </Box>
            </Grid>
          </Grid>

          <Grid mt={3} container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Box>
                <InputLabel htmlFor="email">
                  <Typography
                    component="span"
                    sx={{ color: 'error.main', fontSize: 12 }}
                  >
                    *
                  </Typography>{' '}
                  Email
                </InputLabel>
                <TextField
                  fullWidth
                  disabled
                  value={userInformation?.email ?? ''}
                ></TextField>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Box>
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
            </Grid>
          </Grid>
        </Box>
        <Divider sx={{ mt: 2.4 }} />

        <Box display="flex" flexDirection="column" py={1.6} mx={2.4}>
          <Typography fontSize={16} fontWeight={600} color="natural.700">
            Address
          </Typography>
          <Grid mt={3} container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6, lg: 6 }}>
              <Box>
                <InputLabel htmlFor="streetName">
                  <Typography
                    component="span"
                    sx={{ color: 'error.main', fontSize: 12 }}
                  >
                    *
                  </Typography>{' '}
                  House No./ Street Name
                </InputLabel>
                <Controller
                  name="streetName"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      id="streetName"
                      type="text"
                      placeholder="Enter House No./ Street Name"
                      {...field}
                      error={!!errors.streetName}
                      helperText={errors.streetName?.message}
                    />
                  )}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Box>
                <InputLabel htmlFor="country">
                  <Typography
                    component="span"
                    sx={{ color: 'error.main', fontSize: 12 }}
                  >
                    *
                  </Typography>{' '}
                  Country
                </InputLabel>
                <Controller
                  name="country"
                  control={control}
                  render={({ field }) => (
                    <>
                      <Select fullWidth {...field} error={!!errors.country}>
                        {COUNTRY_OPTIONS.map((option) => (
                          <MenuItem
                            key={option.value}
                            value={option.value}
                            // disabled={option.value === 'closed' && !id}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.country && (
                        <Typography
                          variant="caption"
                          color="error.main"
                          sx={{ mt: 0.5, display: 'block' }}
                        >
                          {errors.country.message}
                        </Typography>
                      )}
                    </>
                  )}
                />
              </Box>
            </Grid>
          </Grid>
          <Grid mt={3} container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Box>
                <InputLabel htmlFor="state">
                  <Typography
                    component="span"
                    sx={{ color: 'error.main', fontSize: 12 }}
                  >
                    *
                  </Typography>{' '}
                  State
                </InputLabel>
                <Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <>
                      <Select fullWidth {...field} error={!!errors.state}>
                        {STATE_OPTIONS.map((option) => (
                          <MenuItem
                            key={option.value}
                            value={option.value}
                            // disabled={option.value === 'closed' && !id}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.state && (
                        <Typography
                          variant="caption"
                          color="error.main"
                          sx={{ mt: 0.5, display: 'block' }}
                        >
                          {errors.state.message}
                        </Typography>
                      )}
                    </>
                  )}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Box>
                <InputLabel htmlFor="city">
                  <Typography
                    component="span"
                    sx={{ color: 'error.main', fontSize: 12 }}
                  >
                    *
                  </Typography>{' '}
                  City
                </InputLabel>
                <Controller
                  name="city"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      id="city"
                      type="text"
                      placeholder="Enter City"
                      {...field}
                      error={!!errors.city}
                      helperText={errors.city?.message}
                    />
                  )}
                />
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Box>
                <InputLabel htmlFor="zipCode">
                  <Typography
                    component="span"
                    sx={{ color: 'error.main', fontSize: 12 }}
                  >
                    *
                  </Typography>{' '}
                  Zip Code
                </InputLabel>
                <Controller
                  name="zipCode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      id="zipCode"
                      type="number"
                      placeholder="Enter Zip code"
                      {...field}
                      error={!!errors.zipCode}
                      helperText={errors.zipCode?.message}
                    />
                  )}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mt: 2.4 }} />

        <Box display="flex" flexDirection="column" py={1.6} mx={2.4}>
          <Typography fontSize={16} fontWeight={600} color="natural.700">
            Role & Sub-Role Details
          </Typography>

          <Grid mt={3} container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Box>
                <InputLabel htmlFor="role">
                  <Typography
                    component="span"
                    sx={{ color: 'error.main', fontSize: 12 }}
                  >
                    *
                  </Typography>{' '}
                  Role
                </InputLabel>
                <TextField
                  fullWidth
                  disabled
                  value={
                    roles.find((r) => r.role === userInformation?.role)
                      ?.title ?? ''
                  }
                  slotProps={{
                    input: {
                      endAdornment: <CaretDownIcon size={24} />,
                    },
                  }}
                ></TextField>
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
                <TextField
                  fullWidth
                  disabled
                  value={getSubRoleTitle(
                    userInformation?.role ?? '',
                    userInformation?.subRole ?? ''
                  )}
                  slotProps={{
                    input: {
                      endAdornment: <CaretDownIcon size={24} />,
                    },
                  }}
                ></TextField>
              </Box>
            </Grid>
          </Grid>
        </Box>
        <Divider sx={{ mt: 2.4 }} />

        {basicUserDetails?.role === 'legal_user' && (
          <>
            <Box display="flex" flexDirection="column" py={1.6} mx={2.4}>
              <Typography fontSize={16} fontWeight={600} color="natural.700">
                Business Details
              </Typography>

              <Grid mt={3} container spacing={2.5}>
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <Box>
                    <InputLabel htmlFor="businessName">
                      <Typography
                        component="span"
                        sx={{ color: 'error.main', fontSize: 12 }}
                      >
                        *
                      </Typography>{' '}
                      Name
                    </InputLabel>
                    <Controller
                      name="businessName"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          fullWidth
                          id="businessName"
                          type="text"
                          placeholder="Enter name"
                          {...field}
                          error={!!errors.businessName}
                          helperText={errors.businessName?.message}
                        />
                      )}
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <Box>
                    <InputLabel htmlFor="businessEmail">
                      <Typography
                        component="span"
                        sx={{ color: 'error.main', fontSize: 12 }}
                      >
                        *
                      </Typography>{' '}
                      Contact Email
                    </InputLabel>
                    <Controller
                      name="businessEmail"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          fullWidth
                          id="businessEmail"
                          type="text"
                          placeholder="Enter Email"
                          {...field}
                          error={!!errors.businessEmail}
                          helperText={errors.businessEmail?.message}
                        />
                      )}
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <Box>
                    <InputLabel htmlFor="businessContact">
                      <Typography
                        component="span"
                        sx={{ color: 'error.main', fontSize: 12 }}
                      >
                        *
                      </Typography>{' '}
                      Phone
                    </InputLabel>
                    <Controller
                      name="businessContact"
                      control={control}
                      render={({
                        field: { onChange, value, ...fieldProps },
                      }) => (
                        <PhoneInput
                          value={value || ''}
                          onChange={onChange}
                          error={!!errors.businessContact}
                          helperText={errors.businessContact?.message}
                          textFieldProps={{
                            id: 'businessContact',
                            placeholder: 'Enter phone',
                            ...fieldProps,
                          }}
                        />
                      )}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Box>
            <Divider sx={{ mt: 2.4 }} />
          </>
        )}

        {basicUserDetails?.role === 'legal_user' && (
          <>
            <Box display="flex" flexDirection="column" py={1.6} mx={2.4}>
              <Typography fontSize={16} fontWeight={600} color="natural.700">
                Supervising Attorney Details
              </Typography>

              <Grid mt={3} container spacing={2.5}>
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <Box>
                    <InputLabel htmlFor="subRoleName">
                      <Typography
                        component="span"
                        sx={{ color: 'error.main', fontSize: 12 }}
                      >
                        *
                      </Typography>{' '}
                      Name
                    </InputLabel>
                    <Controller
                      name="subRoleName"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          fullWidth
                          id="subRoleName"
                          type="text"
                          placeholder="Enter name"
                          {...field}
                          error={!!errors.subRoleName}
                          helperText={errors.subRoleName?.message}
                        />
                      )}
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <Box>
                    <InputLabel htmlFor="subRoleEmail">
                      <Typography
                        component="span"
                        sx={{ color: 'error.main', fontSize: 12 }}
                      >
                        *
                      </Typography>{' '}
                      Contact Email
                    </InputLabel>
                    <Controller
                      name="subRoleEmail"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          fullWidth
                          id="subRoleEmail"
                          type="text"
                          placeholder="Enter Email"
                          {...field}
                          error={!!errors.subRoleEmail}
                          helperText={errors.subRoleEmail?.message}
                        />
                      )}
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <Box>
                    <InputLabel htmlFor="subRoleContact">
                      <Typography
                        component="span"
                        sx={{ color: 'error.main', fontSize: 12 }}
                      >
                        *
                      </Typography>{' '}
                      Phone
                    </InputLabel>
                    <Controller
                      name="subRoleContact"
                      control={control}
                      render={({
                        field: { onChange, value, ...fieldProps },
                      }) => (
                        <PhoneInput
                          value={value || ''}
                          onChange={onChange}
                          error={!!errors.subRoleContact}
                          helperText={errors.subRoleContact?.message}
                          textFieldProps={{
                            id: 'subRoleContact',
                            placeholder: 'Enter phone number',
                            ...fieldProps,
                          }}
                        />
                      )}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ mt: 2.4 }} />
          </>
        )}

        <CardContent>
          <Box
            sx={{
              gap: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Button loading={false} type="submit" variant="contained">
              Save & Update
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                reset();
                void navigate({
                  to: '/settings/profile-overview',
                });
              }}
              sx={{
                color: 'neutral.700',
                borderColor: 'neutral.500',
              }}
            >
              Cancel
            </Button>
          </Box>
        </CardContent>
      </Box>
      <ToastAlert
        placement="right"
        severity="success"
        showAlert={showSuccessMessage}
        onClose={() => setShowSuccessMessage(false)}
        message={'Profile updated successfully.'}
        icon={<CheckIcon weight="bold" />}
      />
      <ToastAlert
        placement="right"
        severity="error"
        showAlert={showErrorMessage}
        onClose={() => setShowErrorMessage(false)}
        message={error?.message ?? 'Something went wrong!'}
        icon={<XCircleIcon weight="bold" />}
      />
    </Box>
  );
};

export default EditProfile;
