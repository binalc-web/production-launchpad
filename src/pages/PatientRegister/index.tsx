import { type FC, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormHelperText,
  InputAdornment,
  InputLabel,
  TextField,
  Typography,
} from '@mui/material';
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import { authWrapperFlexStyles, authWrapperStyles } from '@/utils/commonStyles';
import { passwordRegex } from '@/utils/regex';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { verifyLink } from '@/api/auth/verify-link';
import { useInvitationFormData } from '@/context/invite/useInvitationFormData';

export type InvitationFormData = {
  email: string;
  password: string;
  confirmPassword: string;
  termsAgreed: boolean;
  subRole?: string;
  organizationId?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string | null;
  dateOfBirth?: Date;
};

const schema = yup.object().shape({
  email: yup
    .string()
    .email('Invalid email format')
    .required('Email is required'),
  password: yup
    .string()
    .min(
      8,
      'Password must be at least 8 characters, with upper & lowercase, a symbol or a number.'
    )
    .matches(
      passwordRegex,
      'Password must be at least 8 characters, with upper & lowercase, a number, and a special character.'
    )
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match.')
    .required('Confirm Password is required'),
  termsAgreed: yup
    .boolean()
    .oneOf([true], 'You must agree to the terms and conditions')
    .required('You must agree to the terms and conditions'),
});

type FormData = {
  email: string;
  password: string;
  confirmPassword: string;
  termsAgreed: boolean;
};

const PatientRegister: FC = () => {
  const { search } = useLocation();

  const { invitationFormData, setInvitationFormData } = useInvitationFormData();

  // Parse the URL search parameters to get the email
  const searchParameters = new URLSearchParams(search as string);
  const navigate = useNavigate();

  const token = searchParameters.get('token') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: invitationFormData.email ?? '',
      password: invitationFormData.password ?? '',
      confirmPassword: invitationFormData.confirmPassword ?? '',
      termsAgreed: invitationFormData.termsAgreed || false,
    },
  });

  const onSubmit = (data: FormData): void => {
    setInvitationFormData({ ...data });
    void navigate({ to: '/auth/patient-register/basic-details' });
  };

  useEffect(() => {
    const verify = async (): Promise<void> => {
      try {
        const response = await verifyLink({
          token,
        });
        setInvitationFormData({
          ...invitationFormData,
          firstName: response.data.firstName,
          lastName: response.data.lastName,
        });
        setValue('email', response.data.email, {
          shouldValidate: true,
          shouldDirty: true,
        });
      } catch (error: unknown) {
        console.error('Verification failed:', error);
        void navigate({ to: '/not-authorized' });
      }
    };

    if (token) {
      void verify();
    }
  }, [navigate, setValue, token]);

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
        <Box sx={{ mt: 2 }}>
          <InputLabel htmlFor="email">
            <Typography component="span" sx={{ color: 'error.main' }}>
              *
            </Typography>{' '}
            Email
          </InputLabel>
          <TextField
            disabled
            fullWidth
            id="email"
            type="email"
            placeholder="Enter your email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
        </Box>

        <Box sx={{ mt: 2 }}>
          <InputLabel htmlFor="password">
            <Typography component="span" sx={{ color: 'error.main' }}>
              *
            </Typography>{' '}
            Password
          </InputLabel>
          <TextField
            fullWidth
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
            InputProps={{
              endAdornment: (
                <InputAdornment
                  position="end"
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon size={20} />
                  ) : (
                    <EyeIcon size={20} />
                  )}
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ mt: 2 }}>
          <InputLabel htmlFor="confirmPassword">
            <Typography component="span" sx={{ color: 'error.main' }}>
              *
            </Typography>{' '}
            Confirm Password{' '}
          </InputLabel>
          <TextField
            fullWidth
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Enter your password again"
            {...register('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            InputProps={{
              endAdornment: (
                <InputAdornment
                  position="end"
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon size={20} />
                  ) : (
                    <EyeIcon size={20} />
                  )}
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box
          sx={{
            mt: 2,
          }}
        >
          <FormControlLabel
            control={<Checkbox {...register('termsAgreed')} />}
            label={
              <>
                By signing up, I agree to all the{' '}
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
              </>
            }
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
          {errors.termsAgreed && (
            <FormHelperText error>{errors.termsAgreed.message}</FormHelperText>
          )}
        </Box>

        <Box sx={{ mt: 3 }}>
          <Button fullWidth variant="contained" color="primary" type="submit">
            Next
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default PatientRegister;
