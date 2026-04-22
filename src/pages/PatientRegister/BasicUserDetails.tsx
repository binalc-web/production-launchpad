import { type FC, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Box, Button, InputLabel, TextField, Typography } from '@mui/material';
import { authWrapperFlexStyles, authWrapperStyles } from '@/utils/commonStyles';
import { nameRegex } from '@/utils/regex';
import { Link, useNavigate } from '@tanstack/react-router';
import { completeProfile } from '@/api/auth/patient-invite'; // API call to complete profile
import { ClearMEURL } from '@/utils/clearme';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import ReactDatepicker from '@/components/ReactDatepicker';
import { PopUp } from '@/components/Popup';
import { useInvitationFormData } from '@/context/invite/useInvitationFormData';

const schema = yup.object().shape({
  firstName: yup
    .string()
    .required('First name is required')
    .min(3, 'First name must be at least 3 characters')
    .max(20, 'First name must be at most 20 characters')
    .matches(nameRegex, 'First name should only contain alphabets.'),
  middleName: yup
    .string()
    .nullable()
    .defined()
    .transform((value) => (value === '' ? null : value))
    .when([], {
      is: (value: string | null) => value !== null,
      then: (schema) =>
        schema
          .min(3, 'Middle name must be at least 3 characters')
          .max(20, 'Middle name must be at most 20 characters')
          .matches(nameRegex, 'Middle name should only contain alphabets.'),
    }),
  lastName: yup
    .string()
    .required('Last name is required')
    .min(3, 'Last name must be at least 3 characters')
    .max(20, 'Last name must be at most 20 characters')
    .matches(nameRegex, 'Last name should only contain alphabets.'),
  dateOfBirth: yup
    .date()
    .typeError('Invalid date of birth')
    .required('Date of birth is required'),
});

type FormData = {
  firstName: string;
  lastName: string;
  middleName: string | null;
  dateOfBirth: Date |null;
};

const BasicUserDetails: FC = () => {
  const navigate = useNavigate();

  const isRedirectingRef = useRef(false);

  const { invitationFormData, setInvitationFormData, clearInvitationFormData } =
    useInvitationFormData();

  const [showVerificationSuccessPopup, setShowVerificationSuccessPopup] =
    useState<boolean>(false);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      firstName: invitationFormData.firstName ?? '',
      lastName: invitationFormData.lastName ?? '',
      middleName: invitationFormData.middleName ?? '',
      dateOfBirth: null,
    },
  });

  useEffect(() => {
    setValue('firstName', invitationFormData.firstName ?? '', {
      shouldValidate: true,
      shouldDirty: true,
    });

    setValue('lastName', invitationFormData.lastName ?? '', {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [invitationFormData.firstName, invitationFormData.lastName, setValue]);

  useEffect(() => {
    if (isRedirectingRef.current) return;

    if (!invitationFormData?.email) {
      void navigate({
        to: '/not-authorized',
      });
    }
  }, [invitationFormData, navigate]);

  const onSubmit = (data: FormData): void => {
    setShowVerificationSuccessPopup(true);
    setInvitationFormData({ ...data });
  };

  const onProvidedConsent = (): void => {
    // Note: Added Patient Email temporary so that Clear me callback can store the clear me token to system
    const email = invitationFormData.email!;

    localStorage.setItem('tempPatientEmail', email);
    localStorage.setItem(
      'tempPatientDetails',
      JSON.stringify(invitationFormData)
    );
    void trackEvent('Patient Initiated ClearMe flow', {
      email: email,
    });
    void completeProfile({
      email: email,
      password: invitationFormData.password!,
      confirmPassword: invitationFormData.confirmPassword!,
      firstName: invitationFormData.firstName,
      lastName: invitationFormData.lastName,
      dateOfBirth: invitationFormData.dateOfBirth,
      ...(invitationFormData.middleName &&
        invitationFormData.middleName !== '' && {
          middleName: invitationFormData.middleName,
        }),
      ...(invitationFormData.subRole && {
        subRole: invitationFormData.subRole,
      }),
      ...(invitationFormData.organizationId && {
        organizationId: invitationFormData.organizationId,
      }),
    })
      .then(() => {
        isRedirectingRef.current = true;
        clearInvitationFormData();
        window.open(ClearMEURL, '_self');
      })
      .catch(() => {
        throw new Error('Profile completion failed');
      });
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        ...authWrapperFlexStyles(),
      }}
    >
      <Box sx={{ ...authWrapperStyles(0, 'center') }}>
        <Typography variant="h2">Welcome!</Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          Enter the details to continue
        </Typography>
      </Box>
      <Box
        sx={{
          ...authWrapperStyles(3, null),
          width: '100%',

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
        <Box sx={{ width: '100%' }}>
          <InputLabel htmlFor="firstName">
            <Typography
              component="span"
              sx={{ color: 'error.main', fontSize: 12 }}
            >
              *
            </Typography>{' '}
            First Name
          </InputLabel>
          <TextField
            fullWidth
            id="firstName"
            type="text"
            placeholder="Your First Name"
            {...register('firstName')}
            error={!!errors.firstName}
            helperText={errors.firstName?.message}
          />
        </Box>

        <Box sx={{ width: '100%', mt: 2 }}>
          <InputLabel htmlFor="middleName">Middle Name</InputLabel>
          <TextField
            fullWidth
            id="middleName"
            type="text"
            placeholder="Your Middle Name"
            {...register('middleName')}
            error={!!errors.middleName}
            helperText={errors.middleName?.message}
          />
        </Box>

        <Box sx={{ width: '100%', mt: 2 }}>
          <InputLabel htmlFor="lastName">
            <Typography
              component="span"
              sx={{ color: 'error.main', fontSize: 12 }}
            >
              *
            </Typography>{' '}
            Last Name
          </InputLabel>
          <TextField
            fullWidth
            id="lastName"
            type="text"
            placeholder="Your First Name"
            {...register('lastName')}
            error={!!errors.lastName}
            helperText={errors.lastName?.message}
          />
        </Box>

        <Box sx={{ mt: 2 }}>
          <InputLabel htmlFor="date">
            <Typography
              component="span"
              sx={{ color: 'error.main', fontSize: 12 }}
            >
              *
            </Typography>{' '}
            Date of Birth
          </InputLabel>
          <>
            <Controller
              control={control}
              name="dateOfBirth"
              render={({ field }) => (
                <ReactDatepicker
                  maxDate={new Date()}
                  onChange={field.onChange}
                  placeholderText="Select Date"
                  selected={field.value}
                  className={errors.dateOfBirth ? 'error' : ''}
                />
              )}
            />
            {errors.dateOfBirth && (
              <Typography
                variant="caption"
                color="error.main"
                sx={{ mt: 0.5, display: 'block' }}
              >
                {errors.dateOfBirth.message}
              </Typography>
            )}
          </>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Button fullWidth variant="contained" color="primary" type="submit">
            Continue to CLEAR Verification
          </Button>
        </Box>
      </Box>
      {showVerificationSuccessPopup && (
        <PopUp
          title="How Your Health Data Is Used"
          closable
          onClose={() => setShowVerificationSuccessPopup(false)}
          description=""
          buttonText="I Consent & Continue"
          content={
            <>
              <Typography fontSize={16}>
                MedicalEase helps you get your health records from other
                providers.{' '}
              </Typography>
              <Typography fontSize={16}>
                We do not send or share your health information back through the
                TEFCA network
              </Typography>
              <Typography fontSize={16}>
                To learn more about how your information is used & protected,
                please read our{' '}
                <Link
                  to="/terms-of-use"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Typography
                    component="span"
                    variant="link"
                    sx={{
                      color: 'info.dark',
                    }}
                  >
                    Terms of Use
                  </Typography>
                </Link>{' '}
                &{' '}
                <Link
                  to="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Typography
                    component="span"
                    variant="link"
                    sx={{
                      color: 'info.dark',
                    }}
                  >
                    Privacy Policy
                  </Typography>
                </Link>
              </Typography>
            </>
          }
          onClick={onProvidedConsent}
          isOpen={showVerificationSuccessPopup}
          type="SECURITY_SHIELD"
        />
      )}
    </Box>
  );
};

export default BasicUserDetails;
