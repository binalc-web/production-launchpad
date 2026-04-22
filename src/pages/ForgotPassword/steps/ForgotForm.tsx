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
import {
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { authWrapperStyles } from '@/utils/commonStyles';
import { resendVerificationCode } from '@/api/auth/register';
import ToastAlert from '@/components/ToastAlert';

type FormData = {
  email: string;
};

type ForgotFormProps = {
  setStep: (step: number) => void;
  setUserData: (userData: { email: string }) => void;
};

const schema = yup.object().shape({
  email: yup
    .string()
    .email('Invalid email format')
    .required('Email is required'),
});

export const ForgotForm: React.FC<ForgotFormProps> = ({
  setStep,
  setUserData,
}) => {
  const [showAlert, setShowAlert] = useState(false);
  const [showOtpSentAlert, setShowOtpSentAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: FormData): Promise<boolean> => {
    try {
      await resendVerificationCode({
        email: data.email,
        isForForgetPassword: true,
      });
      setStep(2);
      setUserData({ email: data.email });
      setShowOtpSentAlert(true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
        setShowAlert(true);
      } else {
        setErrorMessage('Something went wrong!');
        setShowAlert(true);
      }
    }
    return Promise.resolve(true);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Box
        sx={{
          ...authWrapperStyles(0, 'center'),
        }}
      >
        <Typography variant="h2">Forgot Password?</Typography>
        <Typography sx={{ mt: 1.25, color: 'text.secondary' }}>
          No worries, we’ll send you the reset instructions.
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

        <Box sx={{ mt: 3.5 }}>
          <Button fullWidth variant="contained" color="primary" type="submit">
            Reset Password
          </Button>
        </Box>
        <Box sx={{ mt: 3.5, textAlign: 'center' }}>
          <Typography
            sx={{
              color: (theme) => theme.palette.neutral[600],
            }}
          >
            <Link to="/auth/login">
              <Typography component="span" variant="link">
                Back To Log In
              </Typography>
            </Link>
          </Typography>
        </Box>
      </Box>

      <ToastAlert
        showAlert={showAlert}
        onClose={() => setShowAlert(false)}
        message={errorMessage}
        icon={<XCircleIcon weight="fill" />}
        severity="error"
      />

      <ToastAlert
        showAlert={showOtpSentAlert}
        onClose={() => setShowOtpSentAlert(false)}
        message="OTP sent successfully!"
        body="Check your email for the verification code."
        icon={<CheckCircleIcon weight="fill" />}
        severity="success"
      />
    </Box>
  );
};
