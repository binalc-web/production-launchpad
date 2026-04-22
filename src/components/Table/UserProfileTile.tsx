import { Avatar, Box, Typography } from '@mui/material';
import { stringAvatar } from '@/utils/stringAvatar';

type UserProfileProps = {
  fullName: string;
  email?: string;
  imageUrl?: string;
};

const UserProfileTile: React.FC<UserProfileProps> = ({
  fullName,
  email,
  imageUrl,
}) => {
  return (
    <Box display="flex" alignItems="center" gap={1}>
      {imageUrl ? (
        <Avatar
          sx={{
            width: 32,
            height: 32,
          }}
          src={import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION + imageUrl}
          alt={fullName}
        />
      ) : (
        <Avatar
          {...stringAvatar(fullName)}
          sx={{
            width: 32,
            height: 32,
            p: 0.5,
          }}
        />
      )}
      <Box>
        <Typography variant="subtitle2">{fullName}</Typography>
        {email && (
          <Typography variant="caption" color="text.secondary">
            {email}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default UserProfileTile;
