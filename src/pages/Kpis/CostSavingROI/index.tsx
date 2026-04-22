import type { FC } from 'react';
import { Grid } from '@mui/material';
import { costSavingROIData } from '../data';
import StatsCard from '@/components/StatsCard';

const costSavingROI: FC = () => {
  return (
    <Grid container spacing={2} sx={{ mt: 3 }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...costSavingROIData.increaseInCaseCapacity} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <StatsCard {...costSavingROIData.legalCaseResolutionTimeReduction} />
      </Grid>
    </Grid>
  );
};

export default costSavingROI;
