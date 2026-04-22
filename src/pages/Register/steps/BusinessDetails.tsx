import { type FC, useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { Box, Button, InputLabel, TextField, Typography } from '@mui/material';

import { authWrapperFlexStyles, authWrapperStyles } from '@/utils/commonStyles';
import { addBusinessDetails } from '@/api/auth/register';
import { emailRegex, usPhoneNumberRegex } from '@/utils/regex';
import ToastAlert from '@/components/ToastAlert';
import { XCircleIcon } from '@phosphor-icons/react';
import { useFormData } from '@/context/register/useFormData';
import PhoneInput from '@/components/PhoneInput';
import { stripPhoneFormatting } from '@/utils/phoneUtilities';

type FormData = {
  lawFirmName: string;
  contactEmail: string;
  phone: string;
};

const schema = yup.object().shape({
  lawFirmName: yup.string().required('Business Name is required'),
  contactEmail: yup
    .string()
    .email('Invalid email format')
    .matches(emailRegex, 'Public domains are not allowed (e.g. gmail, yahoo)')
    .required('Contact Email is required'),
  phone: yup
    .string()
    .matches(usPhoneNumberRegex, 'Invalid US phone number format')
    .required('Phone number is required'),
});

export const BusinessDetails: FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const { formData, setFormData } = useFormData();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: {
      lawFirmName: '',
      contactEmail: '',
      phone: '',
    },
  });
  useEffect(() => {
    if (!formData?.email) {
      void navigate({
        to: '/auth/register',
      });
    }
  }, [formData, navigate]);

  const onSubmit = async (data: FormData): Promise<void> => {
    try {
      setIsLoading(true);

      // Strip phone formatting before submission
      const cleanedPhone = stripPhoneFormatting(data.phone);

      const businessDetails = {
        name: data.lawFirmName,
        email: data.contactEmail,
        contact: cleanedPhone, // Use the cleaned phone number
      };

      // Only proceed if formData and email exist
      if (formData?.email) {
        await addBusinessDetails({
          email: formData.email,
          businessDetails,
        });
      } else {
        throw new Error('Email is required to continue');
      }

      setFormData({
        ...formData,
        businessDetails: {
          ...businessDetails,
        },
      });

      await navigate({
        to: '/auth/register/role-selection',
        replace: true,
      });
    } catch (error: unknown) {
      setIsLoading(false);

      if (error instanceof Error) {
        setAlertMessage(error.message);
        setShowAlert(true);
      } else {
        setAlertMessage('Something went wrong!');
        setShowAlert(true);
      }
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        ...authWrapperFlexStyles(),
      }}
    >
      <Box
        sx={{
          width: '100%',
          ...authWrapperStyles(0, 'center'),
        }}
      >
        <Typography variant="h2">You're Almost There!</Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          Enter your business details to continue.
        </Typography>
      </Box>
      <Box
        sx={{
          width: '100%',
          ...authWrapperStyles(3, null),
          '& .MuiInputBase-root': {
            bgcolor: 'common.white',
          },
          '& .MuiFormLabel-root ': {
            mb: 0,
            fontSize: 12,
          },
          '& .MuiFormControlLabel-label ': {
            fontSize: 14,
          },
        }}
      >
        <Typography variant="h5" sx={{ mb: 3 }}>
          Business Details
        </Typography>
        <Box>
          <InputLabel htmlFor="lawFirmName">
            {' '}
            <Typography component="span" sx={{ color: 'error.main' }}>
              *
            </Typography>{' '}
            Name
          </InputLabel>
          <TextField
            fullWidth
            id="lawFirmName"
            type="text"
            {...register('lawFirmName')}
            error={!!errors.lawFirmName}
            helperText={errors.lawFirmName?.message}
            placeholder="Enter Business Name"
          />
        </Box>
        <Box sx={{ mt: 2 }}>
          <InputLabel htmlFor="contactEmail">
            {' '}
            <Typography component="span" sx={{ color: 'error.main' }}>
              *
            </Typography>{' '}
            Contact Email
          </InputLabel>
          <TextField
            fullWidth
            type="email"
            id="contactEmail"
            {...register('contactEmail')}
            error={!!errors.contactEmail}
            placeholder="Enter contact email"
            helperText={errors.contactEmail?.message}
          />
        </Box>
        <Box sx={{ mt: 2 }}>
          <InputLabel htmlFor="phone">
            {' '}
            <Typography component="span" sx={{ color: 'error.main' }}>
              *
            </Typography>{' '}
            Phone Number
          </InputLabel>
          <Controller
            name="phone"
            control={control}
            render={({ field: { onChange, value, ...fieldProps } }) => (
              <PhoneInput
                value={value || ''}
                onChange={onChange}
                error={!!errors.phone}
                helperText={errors.phone?.message}
                textFieldProps={{
                  id: 'phone',
                  placeholder: '(123) 456-7890',
                  ...fieldProps,
                }}
              />
            )}
          />
        </Box>

        <Box sx={{ mt: 3 }}>
          <Button
            fullWidth
            loading={isLoading}
            variant="contained"
            color="primary"
            type="submit"
          >
            {isLoading ? 'Submitting...' : 'Next'}
          </Button>
        </Box>
      </Box>

      <ToastAlert
        showAlert={showAlert}
        onClose={() => setShowAlert(false)}
        message={alertMessage}
        icon={<XCircleIcon weight="fill" />}
        severity="error"
      />
    </Box>
  );
};
