import { Box } from '@mui/material';
import Lottie from 'lottie-react';
import loaderAnimation from '../assets/animations/loaderAnimation.json';

type AppCustomLoaderProps = {
  height: number | string;
};

const AppCustomLoader: React.FC<AppCustomLoaderProps> = ({ height }) => {
  return (
    <Box
      sx={{
        height: height,
      }}
    >
      <Lottie
        animationData={loaderAnimation}
        loop
        autoplay
        style={{ width: '100%', height: '100%' }}
      />
    </Box>
  );
};
export default AppCustomLoader;
