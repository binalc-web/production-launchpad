import type { FC } from 'react';
import { Grid } from '@mui/material';
import { timeSavingKPIsData, operationalEfficiencyData } from '../data';
import StatsCard from '@/components/StatsCard';

const TimeSavingKPIs: FC = () => {
  return (
    <Grid container spacing={2} sx={{ mt: 3 }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...timeSavingKPIsData.reductionInRecordRetrievalTime} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...operationalEfficiencyData.avgReqProcessingTime} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...timeSavingKPIsData.timeToFirstRequest} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...timeSavingKPIsData.reductionInFollowUpsNeeded} />
      </Grid>
    </Grid>
  );
};

export default TimeSavingKPIs;
