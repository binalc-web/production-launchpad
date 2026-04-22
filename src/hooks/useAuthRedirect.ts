import { useEffect } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useAuth } from '../context/auth/useAuth';
import { routeAccess } from '../config/routes';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import { match } from 'path-to-regexp';

type RedirectOptions = {
  saveCurrentPath?: boolean;
  checkAuth?: boolean;
  checkAuthorization?: boolean;
};

type AuthRedirectReturn = {
  isAuthenticated: boolean;
  redirectToLogin: () => void;
  redirectToSavedOrDefault: () => void;
  redirectToUnauthorized: () => void;
  handleAuthPageRedirect: () => void;
  saveRedirectPath: () => void;
};

/**
 * Hook that centralizes all authentication and authorization related redirects
 * @param options Configuration options for the redirect behavior
 * @returns Object with utility methods for manual redirects
 */
export const useAuthRedirect = (
  options: RedirectOptions = {}
): AuthRedirectReturn => {
  const {
    saveCurrentPath = true,
    checkAuth = true,
    checkAuthorization = true,
  } = options;

  const { accessToken, refreshToken, basicUserDetails } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = Boolean(accessToken || refreshToken);
  const currentPath = location.href;
  const pathnameWithoutQuery = location.pathname;

  const saveRedirectPath = (): void => {
    if (
      saveCurrentPath &&
      !currentPath.includes('not-authorized') &&
      !currentPath.includes('auth') &&
      currentPath !== '/' &&
      !localStorage.getItem('redirectPath')
    ) {
      localStorage.setItem('redirectPath', currentPath);
    }
  };

  const redirectToSavedOrDefault = (): void => {
    const redirectPath = localStorage.getItem('redirectPath');
    if (
      redirectPath &&
      redirectPath !== '/' &&
      !redirectPath.includes('auth') &&
      !redirectPath.includes('clearme')
    ) {
      void navigate({
        to: redirectPath,
        replace: true,
      });
      setTimeout(() => {
        localStorage.removeItem('redirectPath');
      }, 3000);
    } else {
      void navigate({
        to: '/dashboard',
        replace: true,
      });
    }
  };

  const isAuthorizedForRoute = (): boolean => {
    if (!basicUserDetails?.role) return false;

    const userRole = basicUserDetails.role;
    const userAccess = routeAccess[userRole];

    if (!userAccess) return false;
    if (userAccess === 'all') return true;

    return userAccess.some((routePattern) => {
      const matcher = match(routePattern, { decode: decodeURIComponent });
      return matcher(pathnameWithoutQuery) !== false;
    });
  };

  const redirectToLogin = (): void => {
    saveRedirectPath();
    void trackEvent('$session_end');
    void navigate({ to: '/auth/login', replace: true });
  };

  const redirectToUnauthorized = (): void => {
    saveRedirectPath();
    void navigate({ to: '/not-authorized', replace: true });
  };

  useEffect(() => {
    if (currentPath.startsWith('/auth/')) {
      return;
    }

    if (checkAuth && !isAuthenticated) {
      redirectToLogin();
      return;
    }

    if (
      checkAuthorization &&
      isAuthenticated &&
      !currentPath.includes('/auth') &&
      !isAuthorizedForRoute()
    ) {
      redirectToUnauthorized();
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, isAuthenticated, basicUserDetails?.role]);

  const handleAuthPageRedirect = (): void => {
    if (isAuthenticated) {
      redirectToSavedOrDefault();
    }
  };

  return {
    isAuthenticated,
    redirectToLogin,
    redirectToSavedOrDefault,
    redirectToUnauthorized,
    handleAuthPageRedirect,
    saveRedirectPath,
  };
};
