import { markNotificationAsRead } from '@/api/notificationsManagement/mark-as-read';
import { NOTIFICATION_TYPE, type notification } from '@/types/notification';
import { Avatar, Box, Typography } from '@mui/material';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import moment from 'moment';
interface NotificationTileProps {
  notification: notification;
  handleClose: () => void;
  refetch: () => void;
}

const NotificationTile: React.FC<NotificationTileProps> = ({
  notification,
  handleClose,
  refetch,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-list'] });
    },
  });

  return (
    <Box
      onClick={() => {
        markAsReadMutation.mutate(notification._id);
        handleClose();
        void navigate({ to: `/case-management/task/${notification.actionId}` });
        refetch();
      }}
      display="flex"
      flexDirection="row"
      gap={1.2}
      p={1}
      mt={0.8}
      sx={{
        borderRadius: 1, // keeps base rounded (optional but recommended)
        backgroundColor: notification.isRead ? '#fff' : '#F1F5FD',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: notification.isRead ? '#f0f0f0' : '#DEE7FB',
          cursor: 'pointer',
          '& .MuiTypography-root': {
            color: 'text.primary',
            border: '1px',
            '& .MuiTypography-root': {
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        },
      }}
    >
      {notification.type == NOTIFICATION_TYPE.INFORMATION ? (
        <Avatar
          src={`${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${notification.actionPerformedBy?.avatar}`}
          sx={{ width: 32, height: 32 }}
        >
          <Typography fontSize={11}>
            {' '}
            {notification.actionPerformedBy?.firstName?.[0]}{' '}
            {notification.actionPerformedBy?.lastName?.[0]}
          </Typography>
        </Avatar>
      ) : (
        <Avatar sx={{ width: 32, height: 32, backgroundColor: '#FEE5E5' }}>
          <WarningCircleIcon size={20} color="#B61A32" />
        </Avatar>
      )}

      <Box display="flex" flexDirection="column">
        <Typography fontSize={14} color="neutral.700">
          {notification.type == NOTIFICATION_TYPE.INFORMATION
            ? `${notification.actionPerformedBy.firstName} ${notification.actionPerformedBy.lastName} ${notification.message}`
            : notification.message}
        </Typography>

        <Typography fontSize={12} color="neutral.500">
          {moment(notification.createdAt).fromNow()}
        </Typography>
      </Box>
    </Box>
  );
};

export default NotificationTile;
