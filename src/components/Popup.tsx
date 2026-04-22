import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  type Breakpoint,
} from '@mui/material';
import Lottie from 'lottie-react';
import { type ReactNode, useState } from 'react';
import cancelCaseAnimation from '../assets/animations/cancelCase.json';
import deleteCaseAnimation from '../assets/animations/deleteCase.json';
import deleteRecordAnimation from '../assets/animations/deleteRecord.json';
import generateChronologyAnimation from '../assets/animations/generateChronologyAnimation.json';
import deleteTaskAnimation from '../assets/animations/deleteTask.json';
import addCaseAnimation from '../assets/animations/newCaseAnimation.json';
import passwordUpdateAnimation from '../assets/animations/passwordUpdateAnimation.json';
import requestRecordAnimation from '../assets/animations/requestRecordAnimation.json';
import sendInvitation from '../assets/animations/sendInvitation.json';
import successAnimation from '../assets/animations/successAnimation.json';
import securityShieldAnimation from '../assets/animations/securityShield.json';
import unsavedChanges from '../assets/animations/unsavedChanges.json';

import { XIcon } from '@phosphor-icons/react';

interface PopUpProps {
  title: string;
  description: string;
  buttonText?: string;
  onClick?: () => void;
  type:
    | 'SUCCESS'
    | 'INVITE_PATIENT'
    | 'PASSWORD_UPDATE'
    | 'ADDCASE'
    | 'OTHER'
    | 'DELETE'
    | 'CANCELCASE'
    | 'DELETETASK'
    | 'REQUEST_RECORD'
    | 'DELETE_RECORD'
    | 'SECURITY_SHIELD'
    | 'GENERATE_CHRONOLOGY'
    | 'UNSAVED_CHANGES';
  isOpen: boolean;
  maxWidth?: Breakpoint;
  onCancel?: () => void;
  onClose?: () => void;
  cancelText?: string;
  content?: ReactNode;
  contentToRenderAtBottom?: ReactNode;
  closable?: boolean;
  disabledPrimaryButton?: boolean;
}

interface AnimationsObject {
  [key: string]:
    | typeof successAnimation
    | typeof passwordUpdateAnimation
    | typeof addCaseAnimation
    | typeof deleteCaseAnimation
    | typeof cancelCaseAnimation
    | typeof deleteTaskAnimation
    | typeof requestRecordAnimation
    | typeof sendInvitation
    | typeof deleteRecordAnimation
    | typeof securityShieldAnimation
    | typeof generateChronologyAnimation
    | typeof unsavedChanges;
}

const animationsObject: AnimationsObject = {
  SUCCESS: successAnimation,
  INVITE_PATIENT: sendInvitation,
  PASSWORD_UPDATE: passwordUpdateAnimation,
  ADDCASE: addCaseAnimation,
  OTHER: successAnimation,
  DELETE: deleteCaseAnimation,
  CANCELCASE: cancelCaseAnimation,
  DELETETASK: deleteTaskAnimation,
  REQUEST_RECORD: requestRecordAnimation,
  DELETE_RECORD: deleteRecordAnimation,
  SECURITY_SHIELD: securityShieldAnimation,
  GENERATE_CHRONOLOGY: generateChronologyAnimation,
  UNSAVED_CHANGES: unsavedChanges,
};

export const PopUp: React.FC<PopUpProps> = ({
  title,
  description,
  buttonText,
  onClick,
  isOpen,
  type,
  maxWidth,
  onCancel,
  onClose,
  cancelText,
  content,
  closable = false,
  disabledPrimaryButton,
  contentToRenderAtBottom,
}) => {
  const [open, setOpen] = useState(isOpen);
  const handleOnClick = (): void => {
    setOpen(false);
    if (onClick) onClick();
  };

  return (
    <Dialog
      sx={{
        '& .MuiPaper-root': {
          borderRadius: '24px',
        },
      }}
      open={open}
      maxWidth={maxWidth || 'xs'}
    >
      <DialogContent
        sx={{
          m: 5,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Box height={141} width={141} display="flex" alignSelf="center">
          <Lottie
            animationData={animationsObject[type] || successAnimation}
            loop
            autoplay
          />
        </Box>
        <Typography fontSize={26} fontWeight="semibold" textAlign="center">
          {title}
        </Typography>
        {closable && (
          <IconButton
            variant="soft"
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
            }}
          >
            <XIcon size={32} />
          </IconButton>
        )}

        <Typography fontSize={16} fontWeight="regular" textAlign="center">
          {description}
        </Typography>
        {content}
        <Box
          sx={{
            ...(onCancel
              ? {
                  gap: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }
              : {}),
          }}
        >
          {buttonText && (
            <Button
              disabled={disabledPrimaryButton}
              variant="contained"
              fullWidth
              onClick={handleOnClick}
            >
              {buttonText}
            </Button>
          )}
          {onCancel && (
            <Button
              variant="outlined"
              fullWidth
              onClick={onCancel}
              color="inherit"
              sx={{ color: 'neutral.700', borderColor: 'neutral.700' }}
            >
              {cancelText || 'Cancel'}
            </Button>
          )}
        </Box>
        {contentToRenderAtBottom}
      </DialogContent>
    </Dialog>
  );
};
