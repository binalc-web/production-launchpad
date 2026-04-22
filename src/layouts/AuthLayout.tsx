import { useEffect } from 'react';
import { useLocation, useNavigate, Outlet, Link } from '@tanstack/react-router';

import { Box, Grid, Typography } from '@mui/material';

import logo from '@assets/logo.svg';
import dashboard from '@assets/dashboard.png';
import authRings from '@assets/auth-rings.png';
import { useAuthRedirect } from '../hooks/useAuthRedirect';

export const AuthLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { handleAuthPageRedirect } = useAuthRedirect({
    checkAuth: false,
    checkAuthorization: false,
  });

  handleAuthPageRedirect();

  useEffect(() => {
    if (location.pathname === '/auth' || location.pathname === '/auth/') {
      void navigate({
        to: '/auth/login',
      });
    }
  }, [location.pathname, navigate]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(90deg, #F2F7F9 0%, #C3D6DE 100%)',
      }}
    >
      <Grid container spacing={4}>
        <Grid size={{ lg: 5, xs: 12, xl: 4 }}>
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'column',
              justifyContent: 'space-between',
              // pl: { xs: 0, lg: '150px' },
            }}
          >
            <Box
              sx={{
                pt: 4,
                maxWidth: { xs: '100%', lg: 400, xl: 400 },
                textAlign: 'center',
              }}
            >
              <Box component="img" src={logo} alt="logo" width={180} />
            </Box>
            <Box
              sx={{
                mt: 'auto',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Outlet />
            </Box>
            <Box sx={{ mt: 'auto', mb: 4 }}>
              <Typography
                component={Link}
                to="/terms-of-use"
                variant="link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Use |{' '}
              </Typography>

              <Typography
                component={Link}
                to="/privacy-policy"
                variant="link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy |{' '}
              </Typography>

              <Typography
                component={Link}
                to="https://medicalease-assets-prod.s3.us-east-1.amazonaws.com/MedicalEaseConsentRevocation.pdf"
                variant="link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Revocation of Consent
              </Typography>
            </Box>
          </Box>
        </Grid>
        <Grid
          size={{ lg: 7, xs: 0, xl: 8 }}
          sx={{
            height: '100vh',
          }}
        >
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              overflow: 'visible',
            }}
          >
            <Box
              component="img"
              src={authRings}
              sx={{
                zIndex: 1,
                width: '100%',
                height: 'calc(100vh + 100px)',
                position: 'absolute',
              }}
            />
            <Box
              component="img"
              src={dashboard}
              sx={{
                zIndex: 2,
                width: '100%',
                height: 'auto',
                maxHeight: '100%',
                objectFit: 'cover',
                overflow: 'visible',
                mt: { xs: 0, xl: 8 },
                objectPosition: 'center',
              }}
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};
