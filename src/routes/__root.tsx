import { CssBaseline, GlobalStyles, ThemeProvider } from '@mui/material';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { theme } from '../theme';

import '../index.css';
import type React from 'react';
import { AuthProvider } from '../context/auth/AuthProvider';

const shouldHideDevtools =
  import.meta.env.VITE_ENVIRONMENT === 'stage' ||
  import.meta.env.VITE_ENVIRONMENT === 'prod' ||
  import.meta.env.VITE_ENVIRONMENT === 'uat';

export const Route = createRootRoute({
  component: (): React.FC => {
    return (
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <CssBaseline />
          <GlobalStyles
            styles={{
              body: { backgroundColor: '#F6F7F9' },
            }}
          />
          <Outlet />
          {!shouldHideDevtools && <TanStackRouterDevtools />}
        </AuthProvider>
      </ThemeProvider>
    );
  },
});
