import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import {
  Box,
  Button,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

import {
  EnvelopeSimpleIcon,
  LockIcon,
  EyeIcon,
  EyeSlashIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { authWrapperStyles } from '@/utils/commonStyles';
import { loginUser } from '@/api/auth/login';
import ToastAlert from '@/components/ToastAlert';

type FormData = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

type LoginFormProps = {
  setStep: (step: number) => void;
  setEmail: (email: string) => void;
  setRememberMe: (rememberMe: boolean) => void;
};

const schema = yup.object().shape({
  email: yup
    .string()
    .email('Invalid email format')
    .required('Email is required'),
  password: yup.string().required('Password is required'),
  rememberMe: yup.boolean(),
});

export const LoginForm: React.FC<LoginFormProps> = ({
  setStep,
  setEmail,
  setRememberMe,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: FormData): Promise<void> => {
    try {
      await loginUser(data);
      setEmail(data.email);
      setRememberMe(data.rememberMe ?? false);
      setStep(2);
    } catch (error: unknown) {
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
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Box
        sx={{
          ...authWrapperStyles(0, 'center'),
        }}
      >
        <Typography variant="h2">Welcome Back!</Typography>
        <Typography sx={{ mt: 1.25, color: 'text.secondary' }}>
          Your email & password to access your account.
        </Typography>
      </Box>
      <Box
        sx={{
          ...authWrapperStyles(4, null),
          '& .MuiInputBase-root': {
            bgcolor: 'common.white',
          },
          '& .MuiFormLabel-root ': {
            mb: 0,
            fontSize: 12,
          },
        }}
      >
        <Box>
          <InputLabel htmlFor="email">Email</InputLabel>
          <TextField
            fullWidth
            id="email"
            type="email"
            placeholder="Enter your email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <EnvelopeSimpleIcon size={20} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
        <Box sx={{ mt: 3 }}>
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
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon size={20} />
                  </InputAdornment>
                ),
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
        <Box
          sx={{
            mt: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <FormControlLabel
            control={<Switch {...register('rememberMe')} />}
            label="Remember Me"
          />

          <Link to="/auth/forgot-password">
            <Typography variant="link">Forgot Password?</Typography>
          </Link>
        </Box>
        <Box sx={{ mt: 5 }}>
          <Button fullWidth variant="contained" color="primary" type="submit">
            Log in
          </Button>
        </Box>
        <Box sx={{ mt: 5, textAlign: 'center' }}>
          <Typography
            sx={{
              color: (theme) => theme.palette.neutral[600],
            }}
          >
            Don't have an account?{' '}
            <Link to="/auth/register">
              <Typography
                component="span"
                variant="link"
                sx={{
                  color: 'info.dark',
                }}
              >
                Sign Up
              </Typography>
            </Link>
          </Typography>
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
