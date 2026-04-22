import type { FC } from 'react';

import { Box, Typography } from '@mui/material';

import Breadcrumbs from '@/components/Breadcrumbs';
import PatientRecords from './PatientRecords';

const PatientDashboard: FC = () => {
  return (
    <>
      <Breadcrumbs items={[]} />
      <Box
        sx={{
          mt: 1.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h4">Welcome to MedicalEase!</Typography>
      </Box>
      <Box
        sx={{
          mt: 2,
        }}
      >
        <PatientRecords />
      </Box>
    </>
  );
};

export default PatientDashboard;
