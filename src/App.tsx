import { CssBaseline, GlobalStyles } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';

import { theme } from './theme';
import { type createRouter, RouterProvider } from '@tanstack/react-router';
import type { FunctionComponent } from './types/common';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { lazy, Suspense, useEffect, useState } from 'react';

/**
 * Global QueryClient instance for React Query
 * Handles all data fetching and caching throughout the application
 */
const queryClient = new QueryClient();

/**
 * Props for the App component
 * @interface AppProps
 * @property {ReturnType<typeof createRouter>} router - TanStack router instance
 */
type AppProps = { router: ReturnType<typeof createRouter> };

/**
 * Determines whether to hide development tools in production environments
 * Hides devtools in stage and production environments for security and performance
 */
const shouldHideDevtools =
  import.meta.env.VITE_ENVIRONMENT === 'stage' ||
  import.meta.env.VITE_ENVIRONMENT === 'prod' ||
  import.meta.env.VITE_ENVIRONMENT === 'uat';

/**
 * Lazy-loaded production version of React Query Devtools
 * Only loaded when explicitly toggled to reduce bundle size in production
 */
const ReactQueryDevtoolsProduction = lazy(() =>
  import('@tanstack/react-query-devtools/production').then((d) => ({
    default: d.ReactQueryDevtools,
  }))
);

/**
 * Main application component
 * @component
 * @description Root component that sets up the application environment including:
 * - Theme provider for consistent styling
 * - Query client provider for data fetching
 * - Router provider for navigation
 * - Development tools for debugging (conditionally rendered)
 *
 * @param {object} props - Component props
 * @param {ReturnType<typeof createRouter>} props.router - TanStack router instance
 * @returns {FunctionComponent} Rendered application
 */
const App = ({ router }: AppProps): FunctionComponent => {
  const [showDevtools, setShowDevtools] = useState<boolean>(false);

  useEffect(() => {
    if (shouldHideDevtools) {
      setShowDevtools(false);
    }

    // @ts-expect-error window does not contain toggleDevtools
    window.toggleDevtools = (): void => {
      if (!shouldHideDevtools) {
        setShowDevtools((old) => !old);
      }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles
          styles={{
            body: { backgroundColor: theme.palette.background.default },
          }}
        />
        {/* code for auth provider */}
        <RouterProvider router={router} />
        {!shouldHideDevtools && <ReactQueryDevtools initialIsOpen={false} />}
        {showDevtools && (
          <Suspense fallback={null}>
            <ReactQueryDevtoolsProduction buttonPosition="bottom-right" />
          </Suspense>
        )}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
