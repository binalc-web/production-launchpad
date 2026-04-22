import type { FC } from 'react';
import { Grid } from '@mui/material';
import { productivityEfficiencyData, operationalEfficiencyData } from '../data';
import StatsCard from '@/components/StatsCard';

const ProductivityEfficiencyKPIs: FC = () => {
  return (
    <Grid container spacing={2} sx={{ mt: 3 }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...operationalEfficiencyData.duplicateRequestRate} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...productivityEfficiencyData.reductionInClientRequest} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <StatsCard
          {...operationalEfficiencyData.successRateOfRecordRetrieval}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...productivityEfficiencyData.recordsRetrieved} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...productivityEfficiencyData.userEngagementRate} />
      </Grid>
    </Grid>
  );
};

export default ProductivityEfficiencyKPIs;
