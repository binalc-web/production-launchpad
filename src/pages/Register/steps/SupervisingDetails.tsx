import { type FC, type ChangeEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';

import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  InputLabel,
  TextField,
  Typography,
} from '@mui/material';

import { authWrapperFlexStyles, authWrapperStyles } from '@/utils/commonStyles';
import { addSupervisingDetails } from '@/api/auth/register';
import { usPhoneNumberRegex } from '@/utils/regex';
import ToastAlert from '@/components/ToastAlert';
import { XCircleIcon } from '@phosphor-icons/react';
import { useFormData } from '@/context/register/useFormData';
import PhoneInput from '@/components/PhoneInput';
import { stripPhoneFormatting } from '@/utils/phoneUtilities';
import { PopUp } from '@/components/Popup';
import { trackEvent } from '@/utils/mixPanel/mixpanel';

type FormData = {
  name: string;
  contactEmail: string;
  phone: string;
  lawFirmPartnerName?: string;
  lawFirmPartnerEmail?: string;
  lawFirmPartnerPhone?: string;
};

const schema = yup.object().shape({
  name: yup.string().required('Supervisor Name is required'),
  contactEmail: yup
    .string()
    .email('Invalid email format')
    .required('Contact Email is required'),
  phone: yup
    .string()
    .matches(usPhoneNumberRegex, 'Invalid US phone number format')
    .required('Phone number is required'),
});

export const SupervisingDetails: FC = () => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [useSameProfile, setUseSameProfile] = useState<boolean>(false);
  const [showVerificationSuccessPopup, setShowVerificationSuccessPopup] =
    useState<boolean>(false);

  const { formData, clearFormData } = useFormData();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      contactEmail: '',
      phone: '',
    },
  });
  useEffect(() => {
    if (!formData?.email && !showVerificationSuccessPopup) {
      void navigate({
        to: '/auth/register',
      });
    }
  }, [formData, navigate]);

  const handleUseSameProfileChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    setUseSameProfile(event.target.checked);
    if (event.target.checked) {
      setValue('name', formData?.businessDetails?.name as string);
      setValue('contactEmail', formData?.businessDetails?.email as string);
      setValue('phone', formData?.businessDetails?.contact as string);
    } else {
      setValue('name', '');
      setValue('contactEmail', '');
      setValue('phone', '');
    }
  };

  const onSubmit = async (data: FormData): Promise<void> => {
    const hasPartnerDetails =
      (data.lawFirmPartnerName && data.lawFirmPartnerName.length > 0) ||
      (data.lawFirmPartnerEmail?.length ?? 0) > 0 ||
      (data.lawFirmPartnerPhone && data.lawFirmPartnerPhone.length > 0);

    // Strip phone formatting before submission
    const cleanedPhone = stripPhoneFormatting(data.phone);
    const cleanedPartnerPhone = data.lawFirmPartnerPhone
      ? stripPhoneFormatting(data.lawFirmPartnerPhone)
      : '';

    const subRoleDetails = {
      name: data.name,
      email: data.contactEmail,
      contact: cleanedPhone,
    };
    const partnerDetails = {
      name: data.lawFirmPartnerName || '',
      email: data.lawFirmPartnerEmail || '',
      contact: cleanedPartnerPhone,
    };
    try {
      setIsLoading(true);

      if (!formData.email) {
        throw new Error('Email is required to continue');
      }

      await addSupervisingDetails({
        email: formData.email,
        subRoleDetails,
        ...(hasPartnerDetails
          ? {
              partnerDetails,
            }
          : {}),
      });
      setIsLoading(false);
      setShowVerificationSuccessPopup(true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setAlertMessage(error.message);
        setShowAlert(true);
        setIsLoading(false);
      } else {
        setAlertMessage('Something went wrong!');
        setShowAlert(true);
        setIsLoading(false);
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
          overflow: 'auto',
          ...authWrapperFlexStyles(),
        }}
      >
        <Box
          sx={{
            width: '100%',
            ...authWrapperStyles(2, 'center'),
          }}
        >
          <Typography variant="h2">You're Almost There!</Typography>
          <Typography sx={{ color: 'text.secondary' }}>
            Enter required details to continue.
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
          <Typography variant="h5" sx={{ mb: 2, textTransform: 'capitalize' }}>
            {formData?.subRole?.replace(new RegExp('_', 'g'), ' ') ||
              'Supervising Attorney'}{' '}
            Details
          </Typography>
          <Box>
            <InputLabel htmlFor="name">
              {' '}
              <Typography component="span" sx={{ color: 'error.main' }}>
                *
              </Typography>{' '}
              Name
            </InputLabel>
            <TextField
              fullWidth
              id="name"
              type="text"
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
              placeholder="Enter Name"
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
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              checked={useSameProfile}
              // @ts-expect-error conflict between mui and native types
              onChange={handleUseSameProfileChange}
              control={<Checkbox />}
              label={<>Use same profile information for this sub-role.</>}
              sx={{
                alignItems: 'flex-start',
                '& .MuiCheckbox-root': {
                  ml: '-10px',
                  mt: '-10px',
                },
                '& .MuiTypography-link ': {
                  fontSize: 12,
                },
              }}
            />
          </Box>
        </Box>
      </Box>
      <Box sx={{ width: '100%', ...authWrapperStyles(3, null) }}>
        <Button
          fullWidth
          loading={isLoading}
          variant="contained"
          color="primary"
          type="submit"
        >
          {isLoading ? 'Loading...' : 'Submit'}
        </Button>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Link to="/auth/register/role-selection">
            <Typography component="span" variant="link">
              Back
            </Typography>
          </Link>
        </Box>
      </Box>
      <ToastAlert
        showAlert={showAlert}
        onClose={() => setShowAlert(false)}
        message={alertMessage}
        icon={<XCircleIcon weight="fill" />}
        severity="error"
      />

      {showVerificationSuccessPopup && (
        <PopUp
          title="Registration Successful!"
          description="Your registration process is complete. Log in to continue further."
          buttonText="Let’s Log In"
          isOpen={showVerificationSuccessPopup}
          type="SUCCESS"
          onClick={() => {
            void navigate({
              to: '/auth/login',
            });
            void trackEvent('Sign Up Completed', { email: formData?.email });
            setTimeout(() => {
              clearFormData();
            }, 1000);
          }}
        />
      )}
    </Box>
  );
};
