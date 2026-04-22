import type { FC } from 'react';
import { Link } from '@tanstack/react-router';
import { Box, Typography } from '@mui/material';
import { authWrapperStyles } from '@/utils/commonStyles';
import { resendVerificationCode, verifyEmail } from '@/api/auth/register';
import OTPForm from '@/components/OTPForm';

type OTPVerificationProps = {
  setStep: (step: number) => void;
  userData: { email: string };
};

export const OTPVerification: FC<OTPVerificationProps> = ({
  setStep,
  userData,
}) => {
  const handleVerificationSuccess = (): void => {
    setStep(3);
  };

  return (
    <Box>
      <Box
        sx={{
          ...authWrapperStyles(0, 'center'),
        }}
      >
        <Typography variant="h2">Password Reset</Typography>
        <Typography sx={{ mt: 1.25, color: 'text.secondary' }}>
          We've sent a code to your email address.
        </Typography>
      </Box>

      <Box
        sx={{
          ...authWrapperStyles(3, null),
          '& .MuiInputBase-root': {
            bgcolor: 'common.white',
          },
        }}
      >
        <OTPForm
          isForgotPass
          buttonText="Continue"
          apiToCall={verifyEmail}
          resendAPI={resendVerificationCode}
          customData={{ email: userData.email }}
          resendPrefixText="Didn't receive an email?"
          buttonStyles={{ ...authWrapperStyles(5, null) }}
          onVerificationSuccess={handleVerificationSuccess}
          resendStyles={{ marginTop: 5, textAlign: 'center' }}
        />
      </Box>

      <Box sx={{ mt: 1, textAlign: 'center' }}>
        <Link to="/auth/login">
          <Typography component="span" variant="link">
            Back to Login
          </Typography>
        </Link>
      </Box>
    </Box>
  );
};
