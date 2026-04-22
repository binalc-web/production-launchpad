import { Box, Typography } from '@mui/material';
import { FileXIcon } from '@phosphor-icons/react';
import type { FC } from 'react';

type ErrorComponentType = {
  isErrorInTask: boolean;
};

const ErrorComponent: FC<ErrorComponentType> = ({ isErrorInTask }) => (
  <Box
    display="flex"
    flexDirection="column"
    justifyContent="center"
    alignContent="center"
    alignItems="center"
    height="100%"
  >
    <FileXIcon size={40} />
    <Typography
      fontSize={18}
      fontWeight={600}
      mt={1.6}
      variant="h5"
      color="neutral.700"
    >
      {`Unable to load ${isErrorInTask ? 'task details' : 'comment'}`}
    </Typography>
    <Typography
      fontSize={16}
      color="neutral.500"
      mt={0.8}
      width={350}
      textAlign="center"
    >
      {`We couldn’t load the ${isErrorInTask ? 'task details' : 'comments'} right now. Please refresh the page to try again.`}
    </Typography>
  </Box>
);

export default ErrorComponent;
