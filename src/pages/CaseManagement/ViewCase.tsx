import { useEffect, useState, type FC } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';

import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Grid,
  Tooltip,
} from '@mui/material';
import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';

import {
  type AddCaseDataType,
  getCaseById,
} from '@/api/caseManagement/addCase';
import {
  AlignLeftIcon,
  ChartPieIcon,
  CheckIcon,
  FileArrowUpIcon,
  FileTextIcon,
  InfoIcon,
  PencilIcon,
  XIcon,
} from '@phosphor-icons/react';
import CaseProgress from './components/view/CaseProgress';
import PatientInfo from './components/view/PatientInfo';
import Documents from '@/components/FileViewer/Documents';
import Tasks from './components/view/Tasks';
import FileViewer from '@/components/FileViewer';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import { exportCaseReport } from '@/api/caseManagement/exportCase';
import ToastAlert from '@/components/ToastAlert';
import { useAuth } from '@/context/auth/useAuth';
import SelectDocumentsPage from './components/SelectDocumentsPage';

const breadcrumbItems: Array<BreadcrumbItem> = [
  {
    title: 'Case Management',
    url: '/case-management',
  },
  {
    title: 'Case Details',
  },
];

const ViewCase: FC = () => {
  const parameters = useParams({ from: '/_app/case-management/view/$id' });

  const { basicUserDetails } = useAuth();
  const role = basicUserDetails?.role || 'legal_user';
  const navigate = useNavigate();

  const [openPreview, setOpenPreview] = useState<boolean>(false);
  const [openSelectDocuments, setOpenSelectDocuments] =
    useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<
    AddCaseDataType['files'][0] | null
  >(null);

  const [showAlert, setShowAlert] = useState<{
    showAlert: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    showAlert: false,
    type: 'success',
    message: '',
  });

  const { isLoading, isError, data, refetch, isRefetching } = useQuery({
    queryKey: ['case', parameters.id],
    queryFn: () => getCaseById(parameters.id),
    retry: 2,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    void trackEvent(`View case page loaded`, {
      caseId: parameters.id,
    });
  }, [parameters.id]);

  const handleExport = (): void => {
    void exportCaseReport(parameters.id.toString())
      .then((response) => {
        if (response?.success === true) {
          setShowAlert({
            showAlert: true,
            type: 'success',
            message: 'Case details report generation request successfully.',
          });
        } else {
          setShowAlert({
            showAlert: true,
            type: 'error',
            message: 'Failed to export case report',
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

  if (isLoading || isRefetching) {
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

  if (openSelectDocuments) {
    return (
      <SelectDocumentsPage
        files={data?.data?.files ?? []}
        caseId={parameters.id}
        caseDbId={data?.data?._id ?? ''}
        onCancel={() => setOpenSelectDocuments(false)}
        onGoToChronologyListing={() => navigate({ to: '/master-chronology' })}
      />
    );
  }

  return (
    <Box>
      <Breadcrumbs items={breadcrumbItems} />
      <Box
        sx={{
          gap: 2,
          mt: 1.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Tooltip
          title={`${data?.data?.caseId || 'Case Name'} / ${data?.data?.title || 'Case Title'} - Detail View`}
          placement="bottom-start"
          arrow
          slotProps={{
            tooltip: {
              sx: {
                maxWidth: 480,
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: 13,
                lineHeight: 1.6,
                backgroundColor: '#1e2a3a',
                color: '#ffffff',
                boxShadow: '0px 4px 16px rgba(0,0,0,0.3)',
              },
            },
            arrow: {
              sx: { color: '#1e2a3a' },
            },
          }}
        >
          <Typography
            variant="h4"
            noWrap
            sx={{ maxWidth: 500, cursor: 'default' }}
          >
            {data?.data?.caseId || 'Case Name'} /{' '}
            {data?.data?.title || 'Case Title'} - Detail View
          </Typography>
        </Tooltip>
        <Box
          sx={{
            gap: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {role === 'legal_user' && (
            <Button
              size="large"
              variant="contained"
              startIcon={<AlignLeftIcon />}
              onClick={() => {
                setOpenSelectDocuments(true);
              }}
              sx={{
                fontWeight: 600,
                color: (theme) => `${theme.palette.text.primary} !important`,
                bgcolor: (theme) => `${theme.palette.common.white} !important`,
                gap: 0.5,
              }}
            >
              Generate Master Chronology
              <Tooltip
                title="Generates a consolidated timeline of medical and billing records for this case, organized into structured events with summaries and charges."
                placement="bottom"
                arrow
                slotProps={{
                  tooltip: {
                    sx: {
                      width: '500px',
                      minHeight: 48,
                      padding: '12px 16px',
                      borderRadius: '8px',
                      fontSize: 13,
                      lineHeight: 1.6,
                      backgroundColor: '#1e2a3a',
                      color: '#ffffff',
                      boxShadow: '0px 4px 16px rgba(0,0,0,0.3)',
                    },
                  },
                  arrow: {
                    sx: {
                      color: '#1e2a3a',
                    },
                  },
                }}
              >
                <Box
                  component="span"
                  sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}
                  onClick={(event_) => event_.stopPropagation()}
                >
                  <InfoIcon size={24} />
                </Box>
              </Tooltip>
            </Button>
          )}

          {role === 'legal_user' && (
            <Button
              size="large"
              variant="contained"
              startIcon={<ChartPieIcon />}
              onClick={handleExport}
              sx={{
                fontWeight: 600,
                color: (theme) => `${theme.palette.text.primary} !important`,
                bgcolor: (theme) => `${theme.palette.common.white} !important`,
              }}
            >
              Case Report
            </Button>
          )}

          {role === 'legal_user' && (
            <Button
              size="large"
              variant="contained"
              startIcon={<PencilIcon />}
              onClick={() => {
                void navigate({
                  to: `/case-management/edit/${data?.data?.caseId}`,
                });
              }}
              sx={{
                fontWeight: 600,
                color: (theme) => `${theme.palette.text.primary} !important`,
                bgcolor: (theme) => `${theme.palette.common.white} !important`,
              }}
            >
              Edit Case
            </Button>
          )}
          <Button
            size="large"
            variant="contained"
            startIcon={
              role === 'legal_user' ? <FileTextIcon /> : <FileArrowUpIcon />
            }
            onClick={() => {
              if (role === 'legal_user') {
                void navigate({
                  to: `/medical-records/case/${data?.data?._id}`,
                });
              } else {
                void navigate({
                  to: `/medical-records/request`,
                  search: { id: data?.data?.caseId, caseId: data?.data?._id },
                });
              }
            }}
          >
            {role === 'legal_user' ? 'View Record' : 'Request Records'}
          </Button>
        </Box>
      </Box>
      <Box
        sx={{
          mt: 3,
        }}
      >
        <CaseProgress
          role={role}
          caseId={data?.data?.caseId}
          refetch={refetch}
          status={data?.data?.timelineStatus || ''}
        />
        <PatientInfo data={data?.data} />
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid
            size={{
              xs: 12,
              lg: 6,
            }}
          >
            <Documents
              selectedFile={selectedFile}
              caseData={data.data}
              files={data?.data?.files || []}
              setOpenPreview={setOpenPreview}
              setSelectedFile={setSelectedFile}
              refetch={refetch as () => void}
            />
            <FileViewer
              open={openPreview}
              setOpen={setOpenPreview}
              selectedFile={selectedFile}
              files={data?.data?.files || []}
              setSelectedFile={setSelectedFile}
            />
          </Grid>

          <Grid
            size={{
              xs: 12,
              lg: 6,
            }}
          >
            <Tasks caseId={data?.data?._id || ''} />
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
    </Box>
  );
};

export default ViewCase;
