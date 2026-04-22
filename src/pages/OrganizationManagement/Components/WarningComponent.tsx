import { Box, Typography } from '@mui/material';
import { InfoIcon } from '@phosphor-icons/react';

export const WarningComponent: React.FC = () => {
  return (
    <Box
      display="flex"
      gap={1}
      justifyContent="center"
      alignItems="center"
      mt={1}
      bgcolor="#edeef1"
      flexDirection="row"
      p={1}
      sx={{
        borderColor: 'natural.300',
        borderRadius: 1,
      }}
    >
      <InfoIcon size={24} />

      <Typography variant="h2" fontSize={10} color="natural.700" >
        This action can not be undone. The user will receive an email with the
        rejection reason you provide.
      </Typography>
    </Box>
  );
};
