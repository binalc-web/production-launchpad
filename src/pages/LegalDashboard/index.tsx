import { Box, Grid, Typography } from '@mui/material';
import CaseList from '../CaseManagement/components/CaseList';
import { useQuery } from '@tanstack/react-query';
import { getCasesTasksData } from '@/api/dashboard';
import AppCustomLoader from '@/components/AppCustomLoader';
import StatsCard from '@/components/StatsCard';
import { activeCaseByMonth } from './data';
import PendingTasks from './PendingTasks';
import RecordRequest from './RecordRequest';
import ChronologiesChart from './ChronologiesChart';
import CompletedTasks from './CompletedTasks';

const DashBoard: React.FC = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getCasesTasksData,
  });

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="90vh"
      >
        <AppCustomLoader height="20vh" />;
      </Box>
    );
  }

  if (isError) {
    return (
      <Typography fontWeight={600} color="error" mt={2}>
        {error.message}
      </Typography>
    );
  }

  const activeCasesResponse = data?.data?.activeCases;

  const dataPoints =
    activeCasesResponse?.activeCaseByMonth.flatMap(
      (item: Record<string, number | string>) => {
        return Object.values(item);
      }
    ) || [];

  const activeCasesData = {
    ...activeCaseByMonth,
    value: activeCasesResponse?.totalActiveCases || 0,
    trend:
      activeCasesResponse?.changeFromPreviousMonth !== 'N/A' &&
      activeCasesResponse?.changeFromPreviousMonth < 0
        ? 'down'
        : 'up',
    trendValue: activeCasesResponse?.changeFromPreviousMonth,
    trendColor:
      activeCasesResponse?.changeFromPreviousMonth !== 'N/A' &&
      activeCasesResponse?.changeFromPreviousMonth < 0
        ? 'error.dark'
        : 'success.dark',
    chart: {
      ...activeCaseByMonth.chart,
      series: [
        {
          data: dataPoints.length === 1 ? [dataPoints[0], 0] : dataPoints,
        },
      ],
    },
  };

  return (
    <>
      <Grid container spacing={2.25}>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatsCard {...activeCasesData} tooltipText="No. of active cases" />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <PendingTasks data={data?.data?.pendingTask} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <CompletedTasks data={data?.data?.pendingTask} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <RecordRequest />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ChronologiesChart />
        </Grid>
      </Grid>

      <Box mt={3}>
        <CaseList />
      </Box>
    </>
  );
};
export default DashBoard;
