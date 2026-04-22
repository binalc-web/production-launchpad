import type { FC } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { Box, Button, Typography } from '@mui/material';

import ErrorImage from '../assets/404.svg';

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
          Page Not Found!
        </Typography>
        <Typography variant="h2" sx={{ mt: 3, color: 'neutral.500' }}>
          Sorry, we couldn’t find the page you’re looking for.
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
