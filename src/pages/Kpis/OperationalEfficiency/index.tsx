import type { FC } from 'react';
import { Grid } from '@mui/material';
import { operationalEfficiencyData } from '../data';
import StatsCard from '@/components/StatsCard';

const OperationalEfficiency: FC = () => {
  return (
    <Grid container spacing={2} sx={{ mt: 3 }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...operationalEfficiencyData.avgReqProcessingTime} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...operationalEfficiencyData.errorRate} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <StatsCard
          {...operationalEfficiencyData.successRateOfRecordRetrieval}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...operationalEfficiencyData.turnaroundTimeCompliance} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...operationalEfficiencyData.duplicateRequestRate} />
      </Grid>
    </Grid>
  );
};

export default OperationalEfficiency;
