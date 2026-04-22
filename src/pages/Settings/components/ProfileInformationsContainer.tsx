import type { FC } from 'react';
import { Avatar, Box, Button, Divider, Paper, Typography } from '@mui/material';
import { PencilSimpleIcon } from '@phosphor-icons/react';
import UserInformationSection from './UserInformationSection';
import { stringAvatar } from '@/utils/stringAvatar';
import UserInformationTile from './UserInformationTile';
import type { User } from '../types/User';
import { getUserDetails } from '@/api/users/getUserDetails';
import { useAuth } from '@/context/auth/useAuth';
import { useQuery } from '@tanstack/react-query';
import AppCustomLoader from '@/components/AppCustomLoader';

const ProfileInformationContainer: FC = () => {
  const { basicUserDetails } = useAuth();

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
        <Avatar
          {...stringAvatar(
            `${userInformation?.firstName} ${userInformation?.lastName}`
          )}
          src={
            userInformation?.avatar
              ? `${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${userInformation?.avatar}`
              : undefined
          }
          sx={{
            width: 96,
            height: 96,
            p: 2,
          }}
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
            value={userInformation?.contact ?? '-'}
          />
        </Box>
        <Box display="flex" flexWrap="wrap" flexGrow={1}>
          <UserInformationTile
            keyOfInformation="Address"
            value={
              userInformation?.addressDetails?.streetName
                ? `${userInformation?.addressDetails?.streetName}, ${userInformation?.addressDetails?.city}, ${userInformation?.addressDetails?.state} ${userInformation?.addressDetails?.country}, ${userInformation?.addressDetails?.zipCode} `
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
            value={userInformation?.role || ''}
          />
          <UserInformationTile
            keyOfInformation="Sub-Role"
            value={userInformation?.subRole || ''}
          />
        </Box>
      </UserInformationSection>

      <Divider />

      <UserInformationSection title="Business/ Law Firm Details">
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
            value={String(userInformation?.businessDetails?.contact ?? '-')}
          />
        </Box>
      </UserInformationSection>
      <Divider />

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
            value={String(userInformation?.subRoleDetails?.contact ?? '-')}
          />
        </Box>
      </UserInformationSection>
      <Divider />
    </Box>
  );
};

export default ProfileInformationContainer;
