import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../context/auth/useAuth';

import { Box, Divider, Popover, Typography, type Theme } from '@mui/material';
import { GearIcon, SignOutIcon, UserCircleIcon } from '@phosphor-icons/react';
import PopOverTile from './PopOverTile';
import { trackEvent } from '@/utils/mixPanel/mixpanel';

interface AppBarPopOverProps {
  id: string | undefined;
  open: boolean;
  handleClose: () => void;
  anchorEl: HTMLElement | null;
}

const AppBarPopOver: React.FC<AppBarPopOverProps> = ({
  id,
  open,
  handleClose,
  anchorEl,
}) => {
  const navigate = useNavigate();
  const { logout, basicUserDetails } = useAuth();
  return (
    <Popover
      id={id}
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      slotProps={{
        paper: {
          sx: { width: 250, borderRadius: 1.25 },
        },
      }}
    >
      <Box display="flex" flexDirection="column">
        <Box py={2} px={1.5}>
          <Typography variant="body2" fontWeight={500} fontSize={14}>
            {`${basicUserDetails?.firstName} ${basicUserDetails?.lastName}`}
          </Typography>
          <Typography variant="body2" fontSize={12}>
            {basicUserDetails?.email}
          </Typography>
        </Box>
        <Divider />

        <Box px={0.35}>
          <PopOverTile
            onClick={() => {
              handleClose();
              void navigate({ to: '/settings/profile-overview' });
            }}
            title="Profile Overview"
            marginTop={1}
            icon={<UserCircleIcon size={24} />}
          />

          <PopOverTile
            marginBottom={0.25}
            onClick={() => {
              handleClose();
              void navigate({ to: '/settings/account-settings' });
            }}
            title="Account Settings"
            icon={<GearIcon size={24} />}
          />

          <Divider sx={{ mx: 1 }} />

          <PopOverTile
            onClick={() => {
              void trackEvent('$session_end');
              logout();
              handleClose();
              void navigate({ to: '/auth/login' });
            }}
            title="Sign Out"
            icon={<SignOutIcon size={24} />}
            marginTop={0.5}
            marginBottom={1}
            sx={{
              '&:hover': {
                bgcolor: '#fef2f2',
                '& .MuiTypography-root': {
                  color: 'error.dark',
                },
                '& svg': {
                  fill: (theme: Theme) => theme.palette.error.dark,
                },
              },
            }}
          />
        </Box>
      </Box>
    </Popover>
  );
};

export default AppBarPopOver;
