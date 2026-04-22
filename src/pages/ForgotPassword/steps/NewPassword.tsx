import { useState } from 'react';

import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import {
  Box,
  Button,
  InputAdornment,
  InputLabel,
  TextField,
  Typography,
} from '@mui/material';

import { Link, useNavigate } from '@tanstack/react-router';
import { authWrapperStyles } from '@/utils/commonStyles';
import {
  EyeIcon,
  EyeSlashIcon,
  LockIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import { resetPassword } from '@/api/auth/forgot-password';

import { PopUp } from '@/components/Popup';
import ToastAlert from '@/components/ToastAlert';
import { passwordRegex } from '@/utils/regex';

type FormData = {
  password: string;
  confirmPassword: string;
};

const schema = yup.object().shape({
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
});

type NewPasswordProps = {
  userData: { email: string };
};

export const NewPassword: React.FC<NewPasswordProps> = ({ userData }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [showAlert, setShowAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [showVerificationSuccessPopup, setShowVerificationSuccessPopup] =
    useState(false);

  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: FormData): Promise<void> => {
    try {
      await resetPassword({
        email: userData.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });

      setShowVerificationSuccessPopup(true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
        setShowAlert(true);
      } else {
        setErrorMessage('Something went wrong!');
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
        <Typography variant="h2">Set New Password</Typography>
        <Typography sx={{ mt: 1.25, color: 'text.secondary' }}>
          Must be at least 8 characters, with upper & lowercase, a symbol or a
          number.
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
          <InputLabel htmlFor="password">Password</InputLabel>
          <TextField
            fullWidth
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter Password"
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

        <Box sx={{ mt: 2 }}>
          <InputLabel htmlFor="confirmPassword">Confirm Password</InputLabel>
          <TextField
            fullWidth
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="*****"
            {...register('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon size={24} />
                  </InputAdornment>
                ),
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

        <Box sx={{ mt: 5 }}>
          <Button fullWidth variant="contained" color="primary" type="submit">
            Reset Password
          </Button>
        </Box>
        <Box sx={{ mt: 5, textAlign: 'center' }}>
          <Typography
            sx={{
              color: (theme) => theme.palette.neutral[600],
            }}
          >
            <Link to="/auth/login">
              <Typography component="span" variant="link">
                Back to Login
              </Typography>
            </Link>
          </Typography>
        </Box>
      </Box>

      <ToastAlert
        showAlert={showAlert}
        onClose={() => setShowAlert(false)}
        message="Something Went Wrong!"
        body={errorMessage}
        icon={<XCircleIcon weight="fill" />}
        severity="error"
      />
      {showVerificationSuccessPopup && (
        <PopUp
          maxWidth="lg"
          type="PASSWORD_UPDATE"
          isOpen={showVerificationSuccessPopup}
          title="Password Updated Successfully!"
          description="Your password has been updated. Let’s log in again."
          buttonText="Back To Log In"
          onClick={() => {
            void navigate({
              to: '/auth/login',
            });
          }}
        />
      )}
    </Box>
  );
};
