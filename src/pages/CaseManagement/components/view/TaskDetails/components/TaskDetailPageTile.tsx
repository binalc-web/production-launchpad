import { Box, Typography } from '@mui/material';
import type { FC, ReactNode } from 'react';

type TaskDetailPageTileProps = {
  title: string;
  component: ReactNode;
};

const TaskDetailPageTile: FC<TaskDetailPageTileProps> = ({
  title,
  component,
}) => {
  return (
    <Box display="flex" flexDirection="column" gap={0.8}>
      <Typography fontSize={12} color="neutral.400">
        {title}
      </Typography>
      {component}
    </Box>
  );
};

export default TaskDetailPageTile;
