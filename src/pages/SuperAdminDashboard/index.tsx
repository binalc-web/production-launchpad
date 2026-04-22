import type { FC } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
} from '@mui/material';
import { UserCircleMinusIcon, UserCirclePlusIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { getSuperAdminUsersData } from '@/api/dashboard';
import AppCustomLoader from '@/components/AppCustomLoader';

export type SuperAdminUsersData = {
  activatedUserCount: number;
  deActivatedUserCount: number;
};

const SuperAdminDashboard: FC = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['super-admin-users'],
    queryFn: () => getSuperAdminUsersData(),
  });

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="90vh"
      >
        <AppCustomLoader height="20vh" />;
      </Box>
    );
  }

  if (isError) {
    return (
      <Typography fontWeight={600} color="error" mt={2}>
        {error.message}
      </Typography>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6, lg: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: 'success.dark',
                }}
              >
                <UserCirclePlusIcon />
              </Avatar>
              <Typography variant="h5">Active Users</Typography>
            </Box>
            <Typography variant="h3">
              {data?.activatedUserCount || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: 'error.dark',
                }}
              >
                <UserCircleMinusIcon />
              </Avatar>
              <Typography variant="h5">Inactive Users</Typography>
            </Box>
            <Typography variant="h3">
              {data?.deActivatedUserCount || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default SuperAdminDashboard;
