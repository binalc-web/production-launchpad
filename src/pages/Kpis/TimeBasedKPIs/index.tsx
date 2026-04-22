import type { FC } from 'react';
import { Grid } from '@mui/material';
import {
  timeBasedKPIsData,
  operationalEfficiencyData,
  customerSatisfactionRetentionData,
} from '../data';
import StatsCard from '@/components/StatsCard';

const TimeSavingKPIs: FC = () => {
  return (
    <Grid container spacing={2} sx={{ mt: 3 }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...timeBasedKPIsData.avgSessionDuration} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...operationalEfficiencyData.turnaroundTimeCompliance} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...operationalEfficiencyData.avgReqProcessingTime} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...customerSatisfactionRetentionData.resolutionTime} />
      </Grid>
    </Grid>
  );
};

export default TimeSavingKPIs;
