import { useEffect, type FC, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Box, Button, Grid, Typography } from '@mui/material';
import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';
import {
  CheckIcon,
  ExportIcon,
  FileTextIcon,
  LineSegmentsIcon,
  XIcon,
} from '@phosphor-icons/react';
import InfoCard from './InfoCard';
import BillingSummary from './BillingSummary';
import BillingTimelineChart from './BillingTimelineChart';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import { getBillingCaseDetails } from '@/api/chronologies/caseDetails';
import { useQuery } from '@tanstack/react-query';
import AppCustomLoader from '@/components/AppCustomLoader';
import { exportBillingChronology } from '@/api/chronologies/export';
import ToastAlert from '@/components/ToastAlert';

const breadcrumbItems: Array<BreadcrumbItem> = [
  {
    title: 'Billing Chronology',
    url: '/billing-chronology',
  },
  {
    title: 'Chronology Timeline',
  },
];

const BillingTimeline: FC = () => {
  const [showAlert, setShowAlert] = useState<{
    showAlert: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    showAlert: false,
    type: 'success',
    message: '',
  });
  const { id: chronologyID } = useParams({
    from: '/_app/billing-chronology/timeline/$id',
  });

  const navigate = useNavigate();

  const {
    data: caseDetails,
    isLoading: caseDetailsLoading,
    isError: isCaseDetailsError,
    error: caseDetailsError,
  } = useQuery({
    queryKey: ['billing-chronology-case-details', chronologyID],
    queryFn: () =>
      getBillingCaseDetails({
        id: chronologyID,
      }),
  });

  /**
   * Track the event when the component mounts
   */
  useEffect(() => {
    void trackEvent('Billing Timeline Page Viewed', {
      chronologyID,
    });
  }, [chronologyID]);

  const handleExport = (): void => {
    void exportBillingChronology({
      id: chronologyID,
    })
      .then((response) => {
        if (response?.success === true) {
          setShowAlert({
            showAlert: true,
            type: 'success',
            message: 'Billing chronology has been sent to your email',
          });
        } else {
          setShowAlert({
            showAlert: true,
            type: 'error',
            message: 'Failed to export billing chronology',
          });
        }

        setTimeout(() => {
          setShowAlert({
            showAlert: false,
            type: 'success',
            message: '',
          });
        }, 3000);
      })
      .catch(() => {
        setShowAlert({
          showAlert: true,
          type: 'error',
          message: 'Failed to export billing chronology',
        });

        setTimeout(() => {
          setShowAlert({
            showAlert: false,
            type: 'error',
            message: '',
          });
        }, 3000);
      });
  };

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
          <Typography variant="h4">Billing Chronology Detail View</Typography>
          <Box
            sx={{
              gap: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Button
              size="large"
              variant="contained"
              startIcon={<FileTextIcon />}
              sx={{
                fontWeight: 600,
                color: (theme) => `${theme.palette.text.primary} !important`,
                bgcolor: (theme) => `${theme.palette.common.white} !important`,
              }}
              onClick={() => {
                void navigate({
                  to: `/medical-records/case/${caseDetails?.[0]?._id}`,
                });
              }}
            >
              View Record
            </Button>
            <Button
              disabled={!caseDetails?.[0]?.billingOrMedicalId}
              size="large"
              color="secondary"
              variant="contained"
              onClick={() =>
                navigate({
                  to: `/medical-chronology/timeline/${caseDetails?.[0]?.billingOrMedicalId}`,
                })
              }
              startIcon={<LineSegmentsIcon />}
            >
              View Chronology
            </Button>
            <Button
              size="large"
              color="primary"
              variant="contained"
              startIcon={<ExportIcon />}
              onClick={handleExport}
            >
              Export Billing Data
            </Button>
          </Box>
        </Box>

        {caseDetailsLoading ? (
          <AppCustomLoader height={120} />
        ) : isCaseDetailsError ? (
          <Typography variant="h6" color="error" textAlign="center">
            {caseDetailsError?.message}
          </Typography>
        ) : caseDetails && caseDetails?.length > 0 ? (
          <InfoCard
            firstName={caseDetails[0].patient?.firstName}
            avatar={caseDetails[0].patient?.avatar || ''}
            lastName={caseDetails[0].patient?.lastName}
            email={caseDetails[0].patient?.email}
            contact={caseDetails[0].patient?.contact}
            caseId={caseDetails[0]?.case?.caseId.toString() || 'NA'}
            caseType={caseDetails[0]?.case?.caseType || 'NA'}
            invoiceNumber={caseDetails[0]?.invoice_number || 'NA'}
            code={caseDetails[0]?.code || 'NA'}
            createdAt={caseDetails[0]?.createdAt || ''}
          />
        ) : (
          <Typography variant="h6" textAlign="center">
            No Data Found!
          </Typography>
        )}

        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid
            size={{
              xs: 12,
              lg: 4,
            }}
          >
            <BillingSummary chronologyID={chronologyID} />
          </Grid>
          <Grid
            size={{
              xs: 12,
              lg: 8,
            }}
          >
            <BillingTimelineChart chronologyID={chronologyID} />
          </Grid>
        </Grid>
      </Box>

      <ToastAlert
        placement="right"
        severity={showAlert.type}
        showAlert={showAlert.showAlert}
        onClose={() =>
          setShowAlert({ showAlert: false, type: 'success', message: '' })
        }
        message={showAlert.message}
        icon={
          showAlert.type === 'success' ? (
            <CheckIcon weight="bold" />
          ) : (
            <XIcon weight="bold" />
          )
        }
      />
    </>
  );
};

export default BillingTimeline;
