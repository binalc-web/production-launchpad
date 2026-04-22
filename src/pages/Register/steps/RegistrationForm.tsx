import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';

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

import { EyeIcon, EyeSlashIcon, XCircleIcon } from '@phosphor-icons/react';
import { authWrapperStyles } from '@/utils/commonStyles';
import { nameRegex, passwordRegex } from '@/utils/regex';
import { useFormData } from '@/context/register/useFormData';
import { registerUser } from '@/api/auth/register';
import ToastAlert from '@/components/ToastAlert';
import { trackEvent } from '@/utils/mixPanel/mixpanel';

export type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAgreed: boolean;
  role?: string;
  subRole?: string;
  organizationId?: string;
  businessDetails?: {
    email: string;
    contact: string;
    name: string;
  };
};

const schema = yup.object().shape({
  firstName: yup
    .string()
    .required('First name is required')
    .min(3, 'First name must be at least 3 characters')
    .max(20, 'First name must be at most 20 characters')
    .matches(nameRegex, 'First name should only contain alphabets.'),
  lastName: yup
    .string()
    .required('Last name is required')
    .min(3, 'Last name must be at least 3 characters')
    .max(20, 'Last name must be at most 20 characters')
    .matches(nameRegex, 'Last name should only contain alphabets.'),
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
    .required('Confirm Password is required')
    .when('password', (password, schema) =>
      password
        ? schema.oneOf(
            [yup.ref('password')],
            'Confirm Password must match the Password'
          )
        : schema
    ),
  termsAgreed: yup
    .boolean()
    .oneOf([true], 'You must agree to the terms and conditions')
    .required('You must agree to the terms and conditions'),
});

export const RegistrationForm: React.FC = () => {
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState<boolean>(false);

  const navigate = useNavigate();
  const { formData, setFormData } = useFormData();

  useEffect(() => {
    void trackEvent(`Sign Up Page Loaded`);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      firstName: formData?.firstName || '',
      lastName: formData?.lastName || '',
      email: formData?.email || '',
      password: formData?.password || '',
      confirmPassword: formData?.confirmPassword || '',
      termsAgreed: formData?.termsAgreed || false,
    },
  });

  const onSubmit = async (data: FormData): Promise<boolean> => {
    // setStep(2);

    setFormData({ ...data });

    setTimeout(() => {
      void (async (): Promise<void> => {
        try {
          const response = await registerUser({
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            password: data.password,
            confirmPassword: data.confirmPassword,
            //  role,
            //subRole,
          });
          setIsLoading(false);

          const responseData = response.data as {
            data: { isVerified?: boolean };
            message: string;
          };
          if (responseData.data?.isVerified === true) {
            setShowAlert(true);
            setErrorAlert("The email you've entered already exists!");
            setTimeout(() => {
              setShowAlert(false);
              void navigate({
                to: '/auth/login',
              });
            }, 3000);
          } else {
            setFormData({
              ...data,
            });
            void navigate({
              to: '/auth/register/otp-validation',
            });
          }
        } catch (error: unknown) {
          setIsLoading(false);
          if (error instanceof Error) {
            setErrorAlert(error.message);
            setShowAlert(true);
          } else {
            setErrorAlert('Something went wrong!');
            setShowAlert(true);
          }
        }
      })();
    }, 100);

    // await navigate({
    //   to: '/auth/register/otp-validation',
    //   replace: true,
    //   //state: data,
    // });
    return Promise.resolve(true);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Box
        sx={{
          ...authWrapperStyles(0, 'center'),
        }}
      >
        <Typography variant="h2">Get Started!</Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          Let’s create your account now.
        </Typography>
      </Box>
      <Box
        sx={{
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
        <Box
          sx={{
            gap: 2,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Box sx={{ width: '100%' }}>
            <InputLabel htmlFor="firstName">First Name</InputLabel>
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
          <Box sx={{ width: '100%' }}>
            <InputLabel htmlFor="lastName">Last Name</InputLabel>
            <TextField
              fullWidth
              id="lastName"
              type="text"
              placeholder="Your Last Name"
              {...register('lastName')}
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
            />
          </Box>
        </Box>
        <Box sx={{ mt: 2 }}>
          <InputLabel htmlFor="email">Email</InputLabel>
          <TextField
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
          <InputLabel htmlFor="password">Password</InputLabel>
          <TextField
            fullWidth
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
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
        </Box>

        <Box sx={{ mt: 2 }}>
          <InputLabel htmlFor="confirmPassword">Confirm Password</InputLabel>
          <TextField
            fullWidth
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Enter your password again"
            {...register('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment
                    position="end"
                    sx={{
                      cursor: 'pointer',
                    }}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeIcon size={20} />
                    ) : (
                      <EyeSlashIcon size={20} />
                    )}
                  </InputAdornment>
                ),
              },
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
        <Box sx={{ mt: 2 }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            type="submit"
            loading={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Sign Up'}
          </Button>
        </Box>
        <ToastAlert
          showAlert={errorAlert !== null}
          onClose={() => setErrorAlert(null)}
          message="Something went wrong!"
          body={errorAlert ? errorAlert : ''}
          severity="error"
          icon={<XCircleIcon weight="fill" />}
        />
        <ToastAlert
          showAlert={showAlert}
          onClose={() => setShowAlert(false)}
          message="The email you've entered already exists!"
          severity="error"
          icon={<XCircleIcon weight="fill" />}
          body={
            <Typography
              component={Link}
              to="/auth/login"
              variant="link"
              state={{
                ...location.state,
              }}
              sx={{
                color: 'common.white',
                textDecoration: 'underline !important',
              }}
            >
              Click here to Login.
            </Typography>
          }
        />
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography
            sx={{
              color: (theme) => theme.palette.neutral[600],
            }}
          >
            Already have an account?{' '}
            <Link to="/auth/login">
              <Typography
                component="span"
                variant="link"
                sx={{
                  color: 'info.dark',
                }}
              >
                Log In
              </Typography>
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
