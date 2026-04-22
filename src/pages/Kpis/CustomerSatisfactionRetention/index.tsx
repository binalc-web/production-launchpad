import type { FC } from 'react';
import { Grid } from '@mui/material';
import { customerSatisfactionRetentionData } from '../data';
import StatsCard from '@/components/StatsCard';

const CustomerSatisfactionRetention: FC = () => {
  return (
    <Grid container spacing={2} sx={{ mt: 3 }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard
          {...customerSatisfactionRetentionData.customerRetentionRate}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...customerSatisfactionRetentionData.churnRate} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...customerSatisfactionRetentionData.resolutionTime} />
      </Grid>
    </Grid>
  );
};

export default CustomerSatisfactionRetention;
