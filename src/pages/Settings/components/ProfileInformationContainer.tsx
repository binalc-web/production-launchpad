import { useEffect, type FC } from 'react';
import { Box, Button, Divider, Paper, Typography } from '@mui/material';
import { PencilSimpleIcon } from '@phosphor-icons/react';
import UserInformationSection from './UserInformationSection';
import UserInformationTile from './UserInformationTile';
import type { User } from '../types/User';
import { getUserDetails } from '@/api/users/getUserDetails';
import { useAuth } from '@/context/auth/useAuth';
import { useQuery } from '@tanstack/react-query';
import AppCustomLoader from '@/components/AppCustomLoader';
import { useNavigate } from '@tanstack/react-router';
import { roles } from '@/pages/Register/steps/data';
import { formatPhoneNumber } from '@/utils/phoneUtilities';
import profile from '@assets/profile.png';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import { STATE_OPTIONS } from '../constants/options';

const ProfileInformationContainer: FC = () => {
  const { basicUserDetails } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    void trackEvent('Profile Overview Page Viewed', {
      userId: basicUserDetails?.userId,
    });
  });

  const {
    data: userInformation,
    isLoading,
  }: {
    data: User | undefined;
    isLoading: boolean;
  } = useQuery({
    queryKey: ['userDetails'],
    queryFn: async () => {
      const data = await getUserDetails(basicUserDetails?.userId || '');
      return data;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  function getSubRoleTitle(role: string, subRole: string): string | undefined {
    const mainRole = roles.find((r) => r.role === role);
    return mainRole?.subRoles?.find((sr) => sr.role === subRole)?.title;
  }
  const capitalizeFirstLetter = (string: string): string => {
    return string ? string.charAt(0).toUpperCase() + string.slice(1) : '';
  };

  return isLoading ? (
    <Box
      display="flex"
      gap={1.6}
      height="55vh"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
    >
      <AppCustomLoader height={150} />
    </Box>
  ) : (
    <Box
      component={Paper}
      sx={{
        mt: 2,
      }}
    >
      <Box
        py={1.6}
        mx={2.4}
        display="flex"
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Typography color="natural.700" fontSize={20} fontWeight={600}>
          Profile Overview
        </Typography>
        <Button
          onClick={() => {
            void trackEvent('Edit Profile button clicked', {
              userId: basicUserDetails?.userId,
            });
            void navigate({
              to: '/settings/profile-overview/edit',
            });
          }}
          startIcon={<PencilSimpleIcon />}
          variant="contained"
          color="secondary"
          sx={{ backgroundColor: 'secondary.main' }}
        >
          Edit Profile
        </Button>
      </Box>

      <Divider />

      <UserInformationSection title="Basic Details">
        <Box
          width={96}
          height={96}
          component="img"
          border="1px solid #ccc"
          sx={{
            img: {
              objectFit: 'cover',
            },
          }}
          borderRadius={1.6}
          src={
            userInformation?.avatar
              ? `${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${userInformation?.avatar}`
              : profile
          }
        />
        <Box display="flex" flexWrap="wrap" flexGrow={1}>
          <UserInformationTile
            keyOfInformation="Name"
            value={`${userInformation?.firstName} ${userInformation?.lastName}`}
          />
          <UserInformationTile
            keyOfInformation="Email"
            value={userInformation?.email || ''}
          />
          <UserInformationTile
            keyOfInformation="Phone"
            value={
              userInformation?.contact
                ? formatPhoneNumber(userInformation?.contact)
                : '-'
            }
          />
        </Box>
        <Box display="flex" flexWrap="wrap" flexGrow={1}>
          <UserInformationTile
            keyOfInformation="Address"
            value={
              userInformation?.addressDetails?.streetName
                ? `${userInformation?.addressDetails?.streetName}, ${capitalizeFirstLetter(userInformation?.addressDetails?.city)}, ${capitalizeFirstLetter(STATE_OPTIONS.find((s) => s.value === userInformation?.addressDetails?.state)?.label || '')}, U.S.A., ${userInformation?.addressDetails?.zipCode} `
                : '-'
            }
          />
        </Box>
      </UserInformationSection>
      <Divider />

      <UserInformationSection title="Role & Sub-Role Details">
        <Box display="flex" flexWrap="wrap" flexGrow={1}>
          <UserInformationTile
            keyOfInformation="Role"
            value={
              roles.find((r) => r.role === userInformation?.role)?.title ?? ''
            }
          />
          <UserInformationTile
            keyOfInformation="Sub-Role"
            value={
              getSubRoleTitle(
                userInformation?.role as string,
                userInformation?.subRole as string
              ) ?? '-'
            }
          />
        </Box>
      </UserInformationSection>

      <Divider />

      {basicUserDetails?.role === 'legal_user' && (
        <>
          <UserInformationSection title="Business Details">
            <Box display="flex" flexWrap="wrap" flexGrow={1}>
              <UserInformationTile
                keyOfInformation="Name"
                value={userInformation?.businessDetails?.name ?? '-'}
              />
              <UserInformationTile
                keyOfInformation="Email"
                value={userInformation?.businessDetails?.email ?? '-'}
              />
              <UserInformationTile
                keyOfInformation="Phone"
                value={
                  userInformation?.businessDetails?.contact
                    ? formatPhoneNumber(
                        userInformation?.businessDetails?.contact
                      )
                    : '-'
                }
              />
            </Box>
          </UserInformationSection>
          <Divider />
        </>
      )}

      {basicUserDetails?.role === 'legal_user' && (
        <>
          <UserInformationSection title="Supervising Attorney Details">
            <Box display="flex" flexWrap="wrap" flexGrow={1}>
              <UserInformationTile
                keyOfInformation="Name"
                value={userInformation?.subRoleDetails?.name ?? '-'}
              />
              <UserInformationTile
                keyOfInformation="Email"
                value={userInformation?.subRoleDetails?.email ?? '-'}
              />
              <UserInformationTile
                keyOfInformation="Phone"
                value={
                  userInformation?.subRoleDetails?.contact
                    ? formatPhoneNumber(
                        userInformation?.subRoleDetails?.contact
                      )
                    : '-'
                }
              />
            </Box>
          </UserInformationSection>
          <Divider />
        </>
      )}
    </Box>
  );
};

export default ProfileInformationContainer;
