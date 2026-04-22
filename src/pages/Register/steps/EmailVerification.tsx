import { useEffect, useState, type FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Box, Typography } from '@mui/material';
import { authWrapperStyles } from '@/utils/commonStyles';
import { resendVerificationCode, verifyEmail } from '@/api/auth/register';
import { PopUp } from '@/components/Popup';
import OTPForm from '@/components/OTPForm';
import { useFormData } from '@/context/register/useFormData';
import { trackEvent } from '@/utils/mixPanel/mixpanel';

export const EmailVerification: FC = () => {
  const navigate = useNavigate();

  const { formData } = useFormData();

  const email = formData?.email;
  const [showVerificationSuccessPopup, setShowVerificationSuccessPopup] =
    useState<boolean>(false);

  const handleVerificationSuccess = (): void => {
    setShowVerificationSuccessPopup(true);
  };

  useEffect(() => {
    if (!email) {
      void navigate({
        to: '/auth/register',
      });
    }
  }, [email, navigate]);

  useEffect(() => {
    // Track the event when the component mounts
    void trackEvent('Sign Up Started', { email });
  }, [email]);

  const handleSubmit = (): void => {
    void navigate({
      to: '/auth/register/business-details',
    });
  };

  return (
    <Box>
      <Box
        sx={{
          ...authWrapperStyles(0, 'center'),
        }}
      >
        <Typography variant="h2">Email Verification</Typography>
        <Typography sx={{ mt: 1.25, color: 'text.secondary' }}>
          We've sent a verification code to your email.
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
          buttonText="Verify"
          apiToCall={verifyEmail}
          resendAPI={resendVerificationCode}
          customData={{ email: email! }}
          resendPrefixText="Didn't receive the email?"
          buttonStyles={{ ...authWrapperStyles(5, null) }}
          onVerificationSuccess={handleVerificationSuccess}
          resendStyles={{ marginTop: 5, textAlign: 'center' }}
        />
      </Box>

      {showVerificationSuccessPopup && (
        <PopUp
          title="Verification Successful!"
          description="Your email has been verified."
          buttonText="Proceed To Next Step"
          onClick={handleSubmit}
          isOpen={showVerificationSuccessPopup}
          type="SUCCESS"
        />
      )}
    </Box>
  );
};
