import { useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState, type FC } from 'react';

import { Box, Button, Typography } from '@mui/material';
import Lottie from 'lottie-react';

import { completeProfile } from '@/api/auth/patient-invite';
import { postClearMeCode } from '@/api/clearme';
import loaderAnimation from '@/assets/animations/waitingAnimation.json';
import { useAuth } from '@/context/auth/useAuth';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import { HeadsetIcon } from '@phosphor-icons/react';

const ErrorSvg = (): FC => (
  <Box
    component="svg"
    width="180px"
    height="180px"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <Box
      component="path"
      opacity="0.2"
      d="M35.6028 10.055L57.4678 48.0225C59.0003 50.6975 57.0203 54 53.8653 54H10.1353C6.98025 54 5.00025 50.6975 6.53275 48.0225L28.3977 10.055C29.9727 7.315 34.0278 7.315 35.6028 10.055Z"
      fill="#8B95A5"
    />
    <Box
      component="path"
      d="M35.6028 10.055L57.4678 48.0225C59.0003 50.6975 57.0203 54 53.8653 54H10.1353C6.98025 54 5.00025 50.6975 6.53275 48.0225L28.3977 10.055C29.9727 7.315 34.0278 7.315 35.6028 10.055Z"
      stroke="#8B95A5"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <Box
      component="path"
      d="M32 36V26"
      stroke="#8B95A5"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <Box
      component="path"
      d="M32 48C33.6569 48 35 46.6569 35 45C35 43.3431 33.6569 42 32 42C30.3431 42 29 43.3431 29 45C29 46.6569 30.3431 48 32 48Z"
      fill="#8B95A5"
    />
  </Box>
);

const ClearMEVerification: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { basicUserDetails } = useAuth();

  const [isError, setIsError] = useState(false);

  const patientEmail = localStorage.getItem('tempPatientEmail');
  const patientDetails = JSON.parse(
    localStorage.getItem('tempPatientDetails') || '{}'
  );

  const hasCalledAPI = useRef(false);

  // Parse the URL search parameters to get the code
  const searchParameters = new URLSearchParams(location.search as string);
  const code = searchParameters.get('code');

  useEffect(() => {
    if (hasCalledAPI.current) return;
    const timeoutId = setTimeout(() => {
      if (code && patientEmail) {
        hasCalledAPI.current = true;
        void postClearMeCode({
          code,
          email: patientEmail,
        })
          .then((response) => {
            if (response?.success) {
              void trackEvent('Patient Completed ClearMe Verification', {
                email: patientEmail,
              });

              localStorage.removeItem('tempPatientEmail');
              if (localStorage.getItem('isFromRequestRecord') === 'true') {
                const storedCaseId = localStorage.getItem('caseId');

                const storedId = localStorage.getItem('id');

                void navigate({
                  to: `/medical-records/request`,
                  search: {
                    id: storedId,
                    caseId: storedCaseId,
                    ehr: 'clearme',
                  },
                });

                localStorage.removeItem('isFromRequestRecord');
                localStorage.removeItem('caseId');
              } else {
                void completeProfile({
                  email: patientEmail,
                  ...patientDetails,
                })
                  .then(() => {
                    localStorage.removeItem('tempPatientDetails');
                    void navigate({ to: '/auth/login', replace: true });
                  })
                  .catch(() => {
                    setIsError(true);
                  });
              }
            } else {
              void trackEvent('Patient ClearMe Verification Failed', {
                email: patientEmail,
              });
              setIsError(true);
            }
          })
          .catch(() => {
            void trackEvent('Patient ClearMe Verification Failed', {
              email: patientEmail,
            });
            setIsError(true);
          });
      }
    }, 1000);
    return (): void => clearTimeout(timeoutId);
  }, [code]);

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          mt: isError ? 0 : -10,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <Box height={300}>
          {isError ? (
            <ErrorSvg />
          ) : (
            <Lottie
              animationData={loaderAnimation}
              loop
              autoplay
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </Box>
        <Typography mt={isError ? -14 : -8} fontSize={32} fontWeight={700}>
          {isError ? 'Something Went Wrong!' : 'Verifying Your Details...'}
        </Typography>

        {isError ? (
          <Typography mt={0.75} color="text.secondary">
            Please, go back to register and try again.
          </Typography>
        ) : null}

        {isError ? (
          <Box
            sx={{
              mt: 4,
              gap: 2,
              display: 'flex',
            }}
          >
            <Button
              variant="contained"
              startIcon={<HeadsetIcon />}
              onClick={() =>
                window.open(
                  `https://forms.zohopublic.com/solvereininc/form/SupportTickets/formperma/0M23aq0Q9HEmgkug2nn4CRsHMzv3QpBuMjFJTdng81s?Name_First=${basicUserDetails?.firstName}&Name_Last=${basicUserDetails?.lastName}&Email=${basicUserDetails?.email}`,
                  '_blank'
                )
              }
            >
              Contact Support
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => navigate({ to: '/auth/patient-register' })}
            >
              Back to Register
            </Button>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

export default ClearMEVerification;
