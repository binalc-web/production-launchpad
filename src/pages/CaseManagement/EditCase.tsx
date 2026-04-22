import { useEffect, type FC } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';

import { Box, Typography, CircularProgress } from '@mui/material';

import AddCase from './AddCase';
import { getCaseById } from '@/api/caseManagement/addCase';
import { trackEvent } from '@/utils/mixPanel/mixpanel';

const EditCase: FC = () => {
  const parameters = useParams({ from: '/_app/case-management/edit/$id' });

  const { isLoading, isError, data, refetch } = useQuery({
    queryKey: ['case', parameters.id],
    queryFn: () => getCaseById(parameters.id),
    retry: 2,
  });

  useEffect(() => { 
    void trackEvent(`Edit case page loaded`, {
      caseId: parameters.id,
    });
  }, [parameters.id]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" color="error">
          Failed to load cases. Please try again later.
        </Typography>
      </Box>
    );
  }

  if (!data?.data) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" color="error">
          No case found.
        </Typography>
      </Box>
    );
  }

  return (
    <AddCase
      refetch={refetch}
      id={parseInt(parameters.id)}
      caseData={data?.data}
    />
  );
};

export default EditCase;
