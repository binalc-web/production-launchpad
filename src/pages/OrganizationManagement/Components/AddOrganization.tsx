import {
  Box,
  type SelectChangeEvent,
  Button,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  InputLabel,
  Typography,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import { XIcon } from '@phosphor-icons/react';
import { yupResolver } from '@hookform/resolvers/yup';
import { AddOrganizationSchema } from '../schema/validationSchema';
import { Controller, useForm } from 'react-hook-form';
import type { FormData } from '../types/FromData';
import { useEffect, useState } from 'react';
import PhoneInput from '@/components/PhoneInput';
import { useMutation } from '@tanstack/react-query';
import { PopUp } from '@/components/Popup';
import ToastAlert from '@/components/ToastAlert';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import {
  createOrganization,
  type createOrganizationType,
} from '@/api/OrganizationManagement/createOrganization';
import type { organization } from '../types/organization';
import {
  editOrganization,
  type editOrganizationType,
} from '@/api/OrganizationManagement/editOrganization';
import { organizationTypes } from '@/pages/Register/steps/data';

interface AddOrganizationPopOverProps {
  open: boolean;
  handleClose: () => void;
  refetch: () => void;
  selectedOrganizationData?: organization;
}

const AddOrganization: React.FC<AddOrganizationPopOverProps> = ({
  open,
  handleClose,
  refetch,
  selectedOrganizationData,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    // setValue,
  } = useForm<FormData>({
    resolver: yupResolver(AddOrganizationSchema),
    mode: 'onChange',
    defaultValues: selectedOrganizationData
      ? {
          firstName: selectedOrganizationData.organizationAdmin.firstName,
          lastName: selectedOrganizationData.organizationAdmin.lastName,
          userEmail: selectedOrganizationData.organizationAdmin.email,
          userContact: selectedOrganizationData.organizationAdmin.contact,
          name: selectedOrganizationData.name,
          contact: selectedOrganizationData.contact,
          email: selectedOrganizationData.email,
          address: selectedOrganizationData.address,
        }
      : {
          firstName: '',
          lastName: '',
          userEmail: '',
          userContact: '',
          name: '',
          contact: '',
          email: '',
          address: '',
        },
  });

  const [organizationTypeError, setOrganizationTypeError] = useState<
    string | null
  >(null);
  const [selectedOrganizationType, setOrganizationType] = useState<string>(
    organizationTypes[0].type
  );

  const [isErrorAddOrganization, setIsErrorAddOrganization] =
    useState<boolean>(false);

  const {
    mutate,
    isError,
    error,
    isSuccess,
    isPending,
    reset: resetMutation,
  } = useMutation({
    mutationFn: async (
      addOrganizationData: createOrganizationType | editOrganizationType
    ) => {
      // Call the API to Add or edit organization based on presence of selectedOrganizationData
      if (selectedOrganizationData) {
        const response = await editOrganization(
          addOrganizationData as editOrganizationType
        );
        return response;
      }
      const response = await createOrganization(
        addOrganizationData as createOrganizationType
      );
      return response;
    },
  });

  useEffect(() => {
    if (isError) {
      setIsErrorAddOrganization(true);
      setTimeout(() => {
        setIsErrorAddOrganization(false);
        reset();
      }, 2000);
    }
  }, [isError, reset]);

  useEffect(() => {
    if (selectedOrganizationData) {
      setOrganizationType(selectedOrganizationData.organizationType);
      reset({
        firstName: selectedOrganizationData.organizationAdmin.firstName,
        lastName: selectedOrganizationData.organizationAdmin.lastName,
        userEmail: selectedOrganizationData.organizationAdmin.email,
        userContact: selectedOrganizationData.organizationAdmin.contact,
        name: selectedOrganizationData.name,
        contact: selectedOrganizationData.contact,
        email: selectedOrganizationData.email,
        address: selectedOrganizationData.address,
      });
    } else {
      reset({
        firstName: '',
        lastName: '',
        userEmail: '',
        userContact: '',
        name: '',
        contact: '',
        email: '',
        address: '',
      });
    }
  }, [selectedOrganizationData, reset]);

  const handleOrganizationTypeChange = (event: SelectChangeEvent): void => {
    setOrganizationType(event.target.value);
    setOrganizationTypeError(null);
  };

  const onSubmit = async (data: FormData): Promise<void> => {
    try {
      // Import the utility function to strip phone formatting
      // We want to ensure that phone numbers are sent to the API without formatting
      const { stripPhoneFormatting } = await import(
        '../../../utils/phoneUtilities'
      );

      if (selectedOrganizationData) {
        const editData: editOrganizationType = {
          contact: stripPhoneFormatting(data.contact),
          address: data.address,
          name: data.name,
          organizationId: selectedOrganizationData._id,
        };
        mutate(editData);
      } else {
        data.contact = stripPhoneFormatting(data.contact);
        data.userContact = stripPhoneFormatting(data.userContact);

        const createData: createOrganizationType = {
          ...data,
          organizationType: selectedOrganizationType,
        };

        mutate(createData);
      }
    } catch (error) {
      console.error('Error importing phone utilities:', error);
    }
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
            Add New Organization
          </Typography>
          <IconButton
            onClick={() => {
              reset();
              handleClose();
              setIsErrorAddOrganization(false);
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
            <Box width={'100%'}>
              <InputLabel>
                <Typography component="span" sx={{ color: 'error.main' }}>
                  *
                </Typography>{' '}
                Organization Type
              </InputLabel>
              <Select
                disabled={selectedOrganizationData ? true : false}
                fullWidth
                size="large"
                displayEmpty
                value={selectedOrganizationType}
                error={!!organizationTypeError}
                onChange={handleOrganizationTypeChange}
              >
                <MenuItem value="" disabled>
                  Select Organization Type
                </MenuItem>
                {organizationTypes.map((organizationType) => (
                  <MenuItem
                    key={organizationType.type}
                    value={organizationType.type}
                  >
                    {organizationType.title}
                  </MenuItem>
                ))}
              </Select>
              {organizationTypeError && (
                <FormHelperText>{organizationTypeError}</FormHelperText>
              )}
            </Box>

            <Box width="100%" mt={2}>
              <InputLabel htmlFor="name">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                Organization Name
              </InputLabel>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    id="name"
                    type="text"
                    placeholder="Enter organization name"
                    {...{
                      ...field,
                      // onChange: (
                      //   event: React.ChangeEvent<HTMLInputElement>
                      // ) => {
                      //   const value = event.target.value.replace(
                      //     /^\s+|\s+$/g,
                      //     ''
                      //   );
                      //   field.onChange(value);
                      // },
                    }}
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Box>

            <Box width="100%" mt={2}>
              <InputLabel htmlFor="email">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                Organization Email
              </InputLabel>
              <Controller
                name="email"
                disabled={selectedOrganizationData ? true : false}
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    id="email"
                    type="text"
                    placeholder="Enter Organization Email"
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
                Organization Phone
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
                      placeholder: 'Enter Organization Phone',
                      ...fieldProps,
                    }}
                  />
                )}
              />
            </Box>

            <Box width="100%" mt={2}>
              <InputLabel htmlFor="address">Organization Address</InputLabel>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    id="address"
                    type="text"
                    placeholder="Enter Organization Address"
                    {...{
                      ...field,
                      // onChange: (
                      //   event: React.ChangeEvent<HTMLInputElement>
                      // ) => {
                      //   const value = event.target.value.replace(
                      //     /^\s+|\s+$/g,
                      //     ''
                      //   );
                      //   field.onChange(value);
                      // },
                    }}
                    error={!!errors.address}
                    helperText={errors.address?.message}
                  />
                )}
              />
            </Box>

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
                    Admin's First Name
                  </InputLabel>
                  <Controller
                    name="firstName"
                    control={control}
                    disabled={selectedOrganizationData ? true : false}
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
                    Admin's Last Name
                  </InputLabel>
                  <Controller
                    name="lastName"
                    control={control}
                    disabled={selectedOrganizationData ? true : false}
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
              <InputLabel htmlFor="userEmail">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                Admin's Email
              </InputLabel>
              <Controller
                name="userEmail"
                control={control}
                disabled={selectedOrganizationData ? true : false}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    id="userEmail"
                    type="text"
                    placeholder="Enter Email"
                    {...field}
                    error={!!errors.userEmail}
                    helperText={errors.userEmail?.message}
                  />
                )}
              />
            </Box>

            <Box width="100%" mt={2}>
              <InputLabel htmlFor="userContact">
                <Typography
                  component="span"
                  sx={{ color: 'error.main', fontSize: 12 }}
                >
                  *
                </Typography>{' '}
                Admin's Phone
              </InputLabel>
              <Controller
                name="userContact"
                disabled={selectedOrganizationData ? true : false}
                control={control}
                render={({ field: { onChange, value, ...fieldProps } }) => (
                  <PhoneInput
                    value={value || ''}
                    onChange={onChange}
                    error={!!errors.userContact}
                    helperText={errors.userContact?.message}
                    textFieldProps={{
                      id: 'userContact',
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
              {!selectedOrganizationData ? 'Add new organization' : 'Update'}
            </Button>
            <Button
              size="large"
              variant="outlined"
              onClick={() => {
                reset();
                handleClose();
                setIsErrorAddOrganization(false);
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
            title={
              !selectedOrganizationData
                ? 'Organization added Successfully!'
                : 'Organization details updated Successfully!'
            }
            buttonText="Okay, Understood"
            isOpen={isSuccess}
            description={
              selectedOrganizationData
                ? ''
                : "An invite has been sent to the admin'email you mentioned."
            }
            onClick={() => {
              reset();
              void trackEvent('Organization added.');
              handleClose();
              resetMutation();
              setIsErrorAddOrganization(false);
              refetch();
            }}
          />
        ) : null}

        {isErrorAddOrganization ? (
          <ToastAlert
            placement="right"
            severity="error"
            showAlert={isErrorAddOrganization}
            onClose={() => {
              setIsErrorAddOrganization(false);
              reset();
              handleClose();
            }}
            message={
              error instanceof Error
                ? error.message
                : selectedOrganizationData
                  ? 'Failed to update organization details.'
                  : 'Failed to add organization. Please try again.'
            }
            icon={<XIcon weight="bold" />}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default AddOrganization;
