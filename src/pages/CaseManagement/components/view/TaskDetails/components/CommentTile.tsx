import { Avatar, Box, Typography } from '@mui/material';
import type { FC } from 'react';
import type { Assignee } from '../../taskform';
import moment from 'moment';

type CommentTileProps = {
  commentDateAndTime: Date;
  commentedByUser: Assignee;
  comment: string;
};

const CommentTile: FC<CommentTileProps> = ({
  comment,
  commentedByUser,
  commentDateAndTime,
}) => {
  return (
    <Box display="flex" alignItems="start" gap={1} py={1.6}>
      <Avatar
        src={`${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${commentedByUser.avatar}`}
        sx={{ width: 32, height: 32, mt: 0.5 }}
      >
        <Typography fontSize={11}>
          {`${commentedByUser.firstName[0]} ${commentedByUser.lastName[0]}`}
        </Typography>
      </Avatar>

      <Box display="flex" flexDirection="column" gap={0.2}>
        <Typography fontSize={14} fontWeight={600} color="natural.700">
          {`${commentedByUser.firstName} ${commentedByUser.lastName}`}
        </Typography>

        <Typography fontSize={12} color="natural.400">
          {moment(commentDateAndTime).format('DD MMMM [at] hh:mm a')}
        </Typography>

        <Typography fontSize={14} color="natural.700" mt={0.8}>
          {comment}
        </Typography>
      </Box>
    </Box>
  );
};

export default CommentTile;
