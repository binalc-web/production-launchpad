import { Box, Popover } from '@mui/material';
import { useRef, useEffect } from 'react';

import GoogleTranslate from './GoogleTranslate';

interface LanguagePopOverProps {
  id: string | undefined;
  open: boolean;
  handleClose: () => void;
  anchorEl: HTMLElement | null;
}

const LanguagePopOver: React.FC<LanguagePopOverProps> = ({
  id,
  open,
  handleClose,
  anchorEl,
}) => {
  const translateContainerRef = useRef<HTMLDivElement | null>(null);
  const translateInstanceMounted = useRef(false);

  useEffect(() => {
    if (open && !translateInstanceMounted.current) {
      translateInstanceMounted.current = true;
    }
  }, [open]);

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
          sx: { width: 350, borderRadius: 1.25 },
        },
      }}
      keepMounted
    >
      <Box
        display="flex"
        flexDirection="column"
        p={3}
        ref={translateContainerRef}
      >
        <GoogleTranslate />
      </Box>
    </Popover>
  );
};

export default LanguagePopOver;
