import { useEffect, type FC } from 'react';
import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';
import { Box, Button, Typography } from '@mui/material';
import { FolderUserIcon, LineSegmentsIcon } from '@phosphor-icons/react';
import RecordInformationCard from './components/RecordInformationCard';
import MedicalDocuments from './MedicalDocuments';
import { useNavigate, useParams } from '@tanstack/react-router';

import AppCustomLoader from '@/components/AppCustomLoader';
import { useQuery } from '@tanstack/react-query';
import { getMedicalRecordDetails } from '@/api/medicalRecords/recordDetails';
import { formatPhoneNumber } from '@/utils/phoneUtilities';
import { trackEvent } from '@/utils/mixPanel/mixpanel';

const breadcrumbItems: Array<BreadcrumbItem> = [
  {
    title: 'Medical Records',
    url: '/medical-records',
  },
  {
    title: 'Record Details',
  },
];

// eslint-disable-next-line
export const getRecordColors = (
  status: string
): { color: string; backgroundColor: string; borderColor: string } => {
  return {
    color:
      status === 'completed'
        ? '#3957D7'
        : status === 'failed'
          ? '#D7263D'
          : '#CE8324',
    backgroundColor:
      status === 'completed'
        ? '#F1F5FD'
        : status === 'failed'
          ? '#FEF2F2'
          : '#FBF7EB',

    borderColor:
      status === 'completed'
        ? '#C5D6F8'
        : status === 'failed'
          ? '#FCCFD1'
          : '#F0D498',
  };
};

const ViewRecord: FC = () => {
  const { id } = useParams({
    from: '/_app/medical-records/view/$id',
  });

  const {
    data: recordDetails,
    isLoading,
    error,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['record-details', id],
    queryFn: () => getMedicalRecordDetails(id),
  });

  const navigate = useNavigate();

  const filesToDisplay = recordDetails?.documents?.map((item) => {
    const file = recordDetails?.files?.find((file) => file._id === item.fileId);

    return {
      _id: item.fileId,
      fileName: `${item.category} - ${item.author}`,
      key: file?.key || '',
      mimeType: file?.convertedFileMimeType || file?.mimeType || '',
      createdAt: file?.createdAt || '',
      s3Location: file?.s3Location || '',
      id: item.fileId,
      fileSize: file?.fileSize || 0,
      documentProcessStages: file?.documentProcessStages || '',
      name: file?.name || `${item.category} - ${item.author}`,
      newFileName: file?.newFileName || `${item.category} - ${item.author}`,
      location: file?.s3Location || '',
      size: file?.fileSize?.toString() || '0',
    };
  });

  useEffect(() => {
    void trackEvent('Medical Records Details Page Viewed', {
      id,
    });
  }, [id]);

  return (
    <Box>
      <Breadcrumbs items={breadcrumbItems} />
      <Box
        sx={{
          mt: 1.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h4">Medical Record Detail View</Typography>
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
            startIcon={<FolderUserIcon />}
            sx={{
              fontWeight: 600,
              color: (theme) => `${theme.palette.text.primary} !important`,
              bgcolor: (theme) => `${theme.palette.common.white} !important`,
            }}
            onClick={() => {
              void navigate({
                to: `/case-management/view/${
                  typeof recordDetails?.caseId === 'string'
                    ? recordDetails?.caseId
                    : recordDetails?.caseId?.caseId
                }`,
              });
            }}
          >
            View Case
          </Button>
          <Button
            size="large"
            disabled={!recordDetails?.billingOrMedicalId}
            variant="contained"
            startIcon={<LineSegmentsIcon />}
            onClick={() => {
              void navigate({
                to: `/medical-chronology/timeline/${recordDetails?.billingOrMedicalId}`,
              });
            }}
          >
            View Chronology
          </Button>
        </Box>
      </Box>
      <Box
        sx={{
          mt: 3,
          flexDirection: 'column',
          display: 'flex',
          gap: 2,
        }}
      >
        {isLoading || isRefetching ? (
          <AppCustomLoader height={200} />
        ) : isError ? (
          <Typography variant="body1">{error.message}</Typography>
        ) : recordDetails ? (
          <>
            <RecordInformationCard
              name={
                recordDetails?.patientId?.firstName ||
                recordDetails?.patientId?.lastName
                  ? `${recordDetails?.patientId?.firstName || ''} ${recordDetails?.patientId?.lastName || ''}`.trim()
                  : 'NA'
              }
              email={recordDetails?.patientId?.email || 'NA'}
              phone={
                formatPhoneNumber(recordDetails?.patientId?.contact) || 'NA'
              }
              caseId={
                typeof recordDetails.caseId === 'string'
                  ? recordDetails.caseId
                  : recordDetails.caseId?.caseId || 'NA'
              }
              caseType={
                recordDetails.caseType || recordDetails.recordType || 'NA'
              }
              requestId={recordDetails._id || 'NA'}
              recordRetrievalDate={recordDetails.createdAt || 'NA'}
              status={recordDetails.status || 'NA'}
              avatarSrc={recordDetails?.patientId?.avatar}
              avatarAlt={`${recordDetails?.patientId?.firstName[0] || 'N'}${recordDetails?.patientId?.lastName[0] || 'A'}`}
            />

            <MedicalDocuments refetch={refetch} files={filesToDisplay || []} />
          </>
        ) : (
          <Typography textAlign="center" color="error" fontWeight={500}>
            No data found!
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ViewRecord;
