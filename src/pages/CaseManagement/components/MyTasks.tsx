import { Box, Typography } from '@mui/material';
import type { FC } from 'react';
import AssigneeTaskList from './view/TaskDetails/components/AssigneeTaskList';
import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';
import { useSearch } from '@tanstack/react-router';

const MyTasks: FC = () => {
  const { showToDo } = useSearch({
    from: '/_app/my-tasks',
  });

  const breadcrumbItems: Array<BreadcrumbItem> = [
    {
      title: 'My Tasks',
    },
  ];
  return (
    <Box mb={3}>
      <Breadcrumbs items={breadcrumbItems} />
      <Box
        sx={{
          mt: 1.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h4">My Tasks</Typography>
      </Box>
      <AssigneeTaskList isToDoTabVisible={showToDo ?? false} />
    </Box>
  );
};

export default MyTasks;
