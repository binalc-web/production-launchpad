import { useState, type FC } from 'react';

import { Box, Typography } from '@mui/material';
import { authWrapperStyles } from '@/utils/commonStyles';
import type { AxiosResponse } from 'axios';
import { resendLoginVerificationCode, verifyLogin } from '@/api/auth/login';
import { PopUp } from '@/components/Popup';
import OTPForm from '@/components/OTPForm';
import { useAuth } from '@/context//auth/useAuth';
import { useAuthRedirect } from '../../../hooks/useAuthRedirect';
import { identifyUser, trackEvent } from '@/utils/mixPanel/mixpanel';

interface OTPVerificationProps {
  email: string;
  rememberMe: boolean;
}

export interface BasicUserDetails {
  firstName: string;
  lastName: string;
  email: string;
  userId: string;
  role: string;
  subRole: string;
  avatar?: string;
  organizationId?: string;
  isOrganizationAdmin?: boolean;
  organizationName?: string;
}

export const OTPVerification: FC<OTPVerificationProps> = ({
  email,
  rememberMe,
}) => {
  const [showVerificationSuccessPopup, setShowVerificationSuccessPopup] =
    useState<boolean>(false);
  const { login } = useAuth();
  const { redirectToSavedOrDefault } = useAuthRedirect();

  const [tokens, setTokens] = useState({
    accessToken: '',
    refreshToken: '',
  });

  const [basicUserDetails, setBasicUserDetails] =
    useState<BasicUserDetails | null>(null);

  const handleVerificationSuccess = (response: AxiosResponse): void => {
    const { accessToken, refreshToken } = response.data;
    void identifyUser(response.data.user.userId);
    void trackEvent('$session_start', {
      email: response.data.user.email,
      userId: response.data.user.userId,
      role: response.data.user.role,
      subRole: response.data.user.subRole,
      firstName: response.data.user.firstName,
      organizationId: response.data.user.organizationId,
    });
    setBasicUserDetails(response.data.user);
    setTokens({ accessToken, refreshToken });
    setShowVerificationSuccessPopup(true);
  };

  const handleLoginSuccess = (): void => {
    setShowVerificationSuccessPopup(false);
    void new Promise((resolve) => {
      login(
        tokens.accessToken,
        rememberMe,
        basicUserDetails!,
        tokens.refreshToken
      );
      resolve(true);
    }).then(() => {
      redirectToSavedOrDefault();
    });
  };

  return (
    <Box>
      <Box
        sx={{
          ...authWrapperStyles(0, 'center'),
        }}
      >
        <Typography variant="h2">Two-Factor Authentication</Typography>
        <Typography sx={{ mt: 1.25, color: 'text.secondary' }}>
          A code has been sent to your email address.
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
          apiToCall={verifyLogin}
          resendAPI={resendLoginVerificationCode}
          customData={{ email }}
          resendPrefixText="Didn't receive the code?"
          buttonStyles={{ ...authWrapperStyles(5, null) }}
          onVerificationSuccess={handleVerificationSuccess}
          resendStyles={{ marginTop: 5, textAlign: 'center' }}
        />
      </Box>

      {showVerificationSuccessPopup && (
        <PopUp
          title="Verification Successful!"
          description="Your account has been successfully verified. You can now access all features."
          buttonText="Go To Dashboard"
          onClick={handleLoginSuccess}
          isOpen={showVerificationSuccessPopup}
          type="SUCCESS"
        />
      )}
    </Box>
  );
};
