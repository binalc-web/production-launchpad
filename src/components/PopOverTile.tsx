import { Box, Typography, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';

interface PopOverTileProps {
  sx?: SxProps<Theme>;
  title: string;
  icon: ReactNode;
  onClick: () => void;
  marginTop?: number;
  marginBottom?: number;
}

const PopOverTile: React.FC<PopOverTileProps> = ({
  sx,
  title,
  icon,
  onClick,
  marginTop,
  marginBottom,
}) => {
  return (
    <Box
      display="flex"
      flexDirection="row"
      alignContent="center"
      gap={1}
      px={2.2}
      py={1}
      mt={marginTop ? marginTop : 0}
      mb={marginBottom ? marginBottom : 0}
      component="button"
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        backgroundColor: 'transparent',
        border: 'none',
        width: '100%',
        '& svg': {
          fill: (theme) => theme.palette.text.secondary,
        },
        '&:hover': {
          backgroundColor: '#f0f0f0',
          '& .MuiTypography-root': {
            color: 'text.primary',
          },
          '& svg': {
            fill: (theme) => theme.palette.text.primary,
          },
        },
        ...sx,
      }}
    >
      {/* <SignOut size={24} /> */}
      {icon}
      <Typography>{title}</Typography>
    </Box>
  );
};

export default PopOverTile;
