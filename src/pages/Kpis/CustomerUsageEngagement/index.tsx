import type { FC } from 'react';
import { Grid } from '@mui/material';
import StatsCardWithTabs from '@/components/StatsCardWithTabs';
import {
  customerUsageEngagementData,
  customerUsageEngagementTabData,
} from '../data';
import StatsCard from '@/components/StatsCard';
import AvgTimeForRecordRequest from './AvgTimeForRecordRequest';

const CustomerUsageEngagement: FC = () => {
  return (
    <Grid container spacing={2} sx={{ mt: 3 }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCardWithTabs {...customerUsageEngagementTabData.activeUsers} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...customerUsageEngagementData.loginsPerUser} />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <StatsCard {...customerUsageEngagementData.recordRequestPerUser} />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <StatsCard {...customerUsageEngagementData.averageSessionDuration} />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <StatsCard {...customerUsageEngagementData.featureAdoptionRate} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <AvgTimeForRecordRequest />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCardWithTabs
          {...customerUsageEngagementTabData.chronologiesGenerated}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...customerUsageEngagementData.timeToFirstRequest} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCardWithTabs {...customerUsageEngagementTabData.recordRequest} />
      </Grid>
    </Grid>
  );
};

export default CustomerUsageEngagement;
