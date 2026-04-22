import { Box, Typography } from '@mui/material';

type UserInformationTileProps = {
  keyOfInformation: string;
  value: string;
};
const UserInformationTile: React.FC<UserInformationTileProps> = ({
  keyOfInformation,
  value,
}) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      gap={0.6}
      sx={{
        width: {
          xs: '100%',
          sm: '33.33%',
          xl: '25%',
        },
      }}
    >
      <Typography fontWeight={300} fontSize={14} color="natural.500">
        {keyOfInformation}
      </Typography>
      <Typography fontWeight={500} fontSize={14} color="natural.700">
        {value}
      </Typography>
    </Box>
  );
};

export default UserInformationTile;
