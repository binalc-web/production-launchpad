import { Alert, AlertTitle, IconButton, Slide } from '@mui/material';
import { XIcon } from '@phosphor-icons/react';

export interface ToastAlertProps {
  message: string;
  showAlert: boolean;
  onClose: () => void;
  icon: React.ReactNode;
  body?: React.ReactNode | string;
  placement?: 'right' | 'left';
  severity: 'error' | 'success' | 'info' | 'warning';
}

const ToastAlert: React.FC<ToastAlertProps> = ({
  message,
  body,
  showAlert,
  onClose,
  icon,
  placement,
  severity,
}) => {
  return (
    <Slide
      in={showAlert}
      direction={'up'}
      children={
        <Alert
          severity={severity}
          icon={icon}
          action={
            <IconButton
              variant="soft"
              size="small"
              onClick={onClose}
              sx={{
                mt: -1,
                color: 'common.white',
                '&:hover, &:focus': {
                  color: 'common.white',
                  bgcolor: 'transparent',
                },
              }}
            >
              <XIcon weight="bold" />
            </IconButton>
          }
          sx={{
            py: 1.25,
            position: 'fixed',
            bottom: 16,
            ...(placement === 'right' ? { right: 16 } : { left: 16 }),
            minWidth: 518,
            borderRadius: 1.25,
            zIndex: 1000,
            bgcolor: severity === 'error' ? 'error.dark' : 'success.dark',
            color: 'common.white',
            '& .MuiAlert-icon': {
              color: 'common.white',
            },
          }}
        >
          <AlertTitle>{`${message ? message : severity === 'error' ? 'Something went wrong' : ''}`}</AlertTitle>
          {body}
        </Alert>
      }
    />
  );
};

export default ToastAlert;
