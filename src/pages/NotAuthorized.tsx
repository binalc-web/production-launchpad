import type { FC } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { Box, Button, Typography } from '@mui/material';

import ErrorImage from '../assets/401.svg';

const NotFound: FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <Box component="img" src={ErrorImage} alt="Error" />
        <Typography fontSize={48} fontWeight={700}>
          Restricted Access!{' '}
        </Typography>
        <Typography variant="h2" sx={{ mt: 3, color: 'neutral.500' }}>
          Your current access level doesn’t allow you to enter this area.
        </Typography>
        <Button
          variant="contained"
          sx={{ mt: 5 }}
          onClick={() => navigate({ to: '/' })}
        >
          Go back to Home
        </Button>
      </Box>
    </Box>
  );
};

export default NotFound;
