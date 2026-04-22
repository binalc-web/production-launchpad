import type { FC } from 'react';
import { Grid } from '@mui/material';
import {
  customerUsageEngagementData,
  productivityBasedKPIsData,
  operationalEfficiencyData,
  customerUsageEngagementTabData,
  productivityBasedKPIsTabsData,
} from '../data';
import StatsCardWithTabs from '@/components/StatsCardWithTabs';
import StatsCard from '@/components/StatsCard';
import PendingTasks from './PendingTasks';

const ProductivityBasedKPIs: FC = () => {
  return (
    <Grid container spacing={2} sx={{ mt: 3 }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCardWithTabs {...customerUsageEngagementTabData.activeUsers} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...customerUsageEngagementData.loginsPerUser} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <PendingTasks />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...operationalEfficiencyData.errorRate} />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCardWithTabs {...productivityBasedKPIsTabsData.activeCases} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...productivityBasedKPIsData.recordRequestPerUser} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...operationalEfficiencyData.duplicateRequestRate} />
      </Grid>
    </Grid>
  );
};

export default ProductivityBasedKPIs;
