import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from '@tanstack/react-router';

import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';
import { PlusIcon } from '@phosphor-icons/react';
import CaseList from './components/CaseList';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import { useAuth } from '@/context/auth/useAuth';

const breadcrumbItems: Array<BreadcrumbItem> = [
  {
    title: 'Case Management',
  },
];

const CaseManagement: React.FC = () => {
  const navigate = useNavigate();
  const { basicUserDetails } = useAuth();
  const role = basicUserDetails?.role || 'legal_user';

  return (
    <>
      <Box mb={3}>
        <Breadcrumbs items={breadcrumbItems} />
        <Box
          sx={{
            mt: 1.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h4">Case Management</Typography>
          {role === 'legal_user' && (
            <Box>
              <Button
                size="large"
                variant="contained"
                startIcon={<PlusIcon />}
                onClick={() => {
                  void navigate({
                    to: '/case-management/add-case',
                  });
                  void trackEvent(`Create case button clicked`);
                }}
              >
                Add New Case
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      <CaseList />
    </>
  );
};

export default CaseManagement;
