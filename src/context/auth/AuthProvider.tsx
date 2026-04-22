import { useState } from 'react';
import { AuthContext, setGlobalLogout } from './authContext';
import type { BasicUserDetails } from '@/pages/Login/steps/OTPVerification';

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode => {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
  );

  const [refreshToken, setRefreshToken] = useState<string | null>(
    localStorage.getItem('refreshToken') ||
      sessionStorage.getItem('refreshToken')
  );

  const [basicUserDetails, setBasicUserDetails] =
    useState<BasicUserDetails | null>(
      localStorage.getItem('user')
        ? (JSON.parse(localStorage.getItem('user')!) as BasicUserDetails)
        : null
    );

  const updateBasicDetails = (
    firstName: string,
    lastName: string,
    email: string,
    role: string,
    avatar?: string
  ): void => {
    const detailToUpdate = {
      userId: basicUserDetails?.userId || '',
      firstName,
      lastName,
      email,
      role,
      avatar,
      subRole: basicUserDetails?.subRole || '',
    };
    localStorage.setItem('user', JSON.stringify(detailToUpdate));

    setBasicUserDetails(detailToUpdate);
  };

  const login = (
    accessToken: string,
    rememberMe: boolean,
    basicUserDetails: BasicUserDetails,
    refreshToken?: string
  ): void => {
    setBasicUserDetails({
      ...basicUserDetails,
    });
    localStorage.setItem(
      'user',
      JSON.stringify({
        ...basicUserDetails,
      })
    );
    if (rememberMe) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken!);
      setAccessToken(accessToken);
      setRefreshToken(refreshToken!);
    } else {
      sessionStorage.setItem('accessToken', accessToken);
      setAccessToken(accessToken);
    }
  };

  const logout = (): void => {
    sessionStorage.removeItem('accessToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('redirectPath');
    setAccessToken(null);
    setRefreshToken(null);
    setBasicUserDetails(null);
  };

  setGlobalLogout(logout);

  const isAuthenticated = !!accessToken;

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        refreshToken,
        isAuthenticated,
        login,
        logout,
        basicUserDetails,
        updateBasicDetails,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
