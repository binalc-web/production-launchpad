import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: ({ location }) => {
    const accessToken =
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!accessToken && !refreshToken) {
      // Save the current path for post-login redirect
      const currentPath = location.href;

      // Don't save paths we don't want to redirect back to
      if (
        currentPath !== '/' &&
        !currentPath.includes('/auth') &&
        !currentPath.includes('not-authorized')
      ) {
        localStorage.setItem('redirectPath', currentPath);
      }

      // Handle unauthenticated users
      return redirect({
        to: '/auth/login',
        replace: true,
      });
    }

    // For the root route specifically, always redirect to dashboard
    // This avoids authorization checks which would block patients
    if (location.pathname === '/') {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({
        to: '/dashboard',
        replace: true,
      });
    }

    // Handle authenticated users with saved redirectPath
    const redirectPath = localStorage.getItem('redirectPath');
    if (
      redirectPath &&
      redirectPath !== '/' &&
      !redirectPath.includes('/auth') &&
      !redirectPath.includes('clearme')
    ) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({
        to: redirectPath,
        replace: true,
      });
      // localStorage.removeItem('redirectPath');
    } else {
      // Clear any invalid redirect paths

      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({
        to: '/dashboard',
        replace: true,
      });
    }
  },
});
