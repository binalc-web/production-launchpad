import { Box, Divider, IconButton, Popover, Typography } from '@mui/material';
import {
  ArrowClockwiseIcon,
  BellIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import NotificationTile from './NotificationTile';
import type { notification } from '@/types/notification';
import AppCustomLoader from './AppCustomLoader';

interface NotificationPopOverProps {
  id: string | undefined;
  open: boolean;
  handleClose: () => void;
  anchorEl: HTMLElement | null;
  notifications: Array<notification> | undefined;
  refetch: () => void;
  isLoading: boolean;
  isError: boolean;
}

const NotificationPopOver: React.FC<NotificationPopOverProps> = ({
  id,
  open,
  handleClose,
  anchorEl,
  notifications,
  refetch,
  isLoading,
  isError,
}) => {
  return (
    <Popover
      id={id}
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      slotProps={{
        paper: {
          sx: { width: 421, height: 429, borderRadius: 1.25 },
        },
      }}
    >
      {isLoading ? (
        <Box height="100%" alignContent="center">
          <AppCustomLoader height={150} />
        </Box>
      ) : (
        <Box display="flex" flexDirection="column">
          <Box
            display="flex"
            mx={1.6}
            my={1}
            flexDirection="row"
            justifyContent="space-between"
            alignContent="center"
          >
            <Typography fontSize={18} fontWeight={600}>
              Notifications
            </Typography>

            <IconButton variant="soft" onClick={refetch}>
              <ArrowClockwiseIcon size={18} />
            </IconButton>
          </Box>
          <Divider />
          {isError || !notifications || notifications.length <= 0 ? (
            <Box
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignContent="center"
              alignItems="center"
              height={300}
            >
              {isError ? <WarningIcon size={40} /> : <BellIcon size={40} />}
              <Typography
                fontSize={18}
                fontWeight={600}
                mt={1.6}
                variant="h5"
                color="neutral.700"
              >
                {isError
                  ? `Unable to load notification `
                  : 'No notifications yet'}
              </Typography>
              <Typography
                fontSize={16}
                color="neutral.500"
                mt={0.8}
                width={350}
                textAlign="center"
              >
                {isError
                  ? 'Please refresh the page to try again.'
                  : 'You’ll see updates here when there’s activity on your tasks.'}
              </Typography>
            </Box>
          ) : (
            <Box p={0.8}>
              {notifications?.map((notification) => {
                return (
                  <NotificationTile
                    notification={notification}
                    handleClose={handleClose}
                    refetch={refetch}
                  />
                );
              })}
            </Box>
          )}
        </Box>
      )}
    </Popover>
  );
};

export default NotificationPopOver;
