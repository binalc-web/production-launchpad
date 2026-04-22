import { useState } from 'react';
import { Box } from '@mui/material';
import CollapsibleSidebar from '../components/CollapsibleSidebar';
import AppBarComponent from '../components/AppBar';
import { Outlet } from '@tanstack/react-router';
import { useAuth } from '../context/auth/useAuth';
import { useAuthRedirect } from '../hooks/useAuthRedirect';

const drawerWidth = 250;
const collapsedWidth = 90;

export const AppLayout: React.FC = () => {
  const [open, setOpen] = useState<boolean>(true);
  const { accessToken, refreshToken } = useAuth();

  useAuthRedirect();

  return accessToken || refreshToken ? (
    <Box display="flex" height="100vh">
      <CollapsibleSidebar
        open={open}
        setOpen={setOpen}
        drawerWidth={drawerWidth}
        collapsedWidth={collapsedWidth}
      />
      <Box
        sx={{
          transition: 'width 0.3s ease',
          width: `calc(100% - ${open ? drawerWidth : collapsedWidth}px)`,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <AppBarComponent
          open={open}
          drawerWidth={drawerWidth}
          collapsedWidth={collapsedWidth}
        />
        <Box
          component="main"
          maxWidth="100%"
          sx={{
            flex: 1,
            overflowY: 'auto',
            padding: 3,
            paddingTop: 13,
            backgroundColor: 'background.default',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  ) : null;
};
