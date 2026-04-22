import type { FC } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import AssigneeTaskList from '../CaseManagement/components/view/TaskDetails/components/AssigneeTaskList';
import PendingTasks from '../LegalDashboard/PendingTasks';
import { getCasesTasksData } from '@/api/dashboard';
import AppCustomLoader from '@/components/AppCustomLoader';
import { useQuery } from '@tanstack/react-query';

const ThirdPartyDashboard: FC = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getCasesTasksData,
  });

  return (
    <Box mb={3}>
      {isLoading ? (
        <AppCustomLoader height="20vh" />
      ) : isError ? (
        <Typography fontWeight={600} color="error" mt={2}>
          {error.message}
        </Typography>
      ) : (
        <Grid container spacing={2.25}>
          <Grid size={{ xs: 12, md: 6 }}>
            <PendingTasks data={data?.data?.pendingTask} />
          </Grid>
        </Grid>
      )}
      <AssigneeTaskList isToDoTabVisible={false} isShowTitle />
    </Box>
  );
};

export default ThirdPartyDashboard;
