import type { FC } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Divider,
  Typography,
} from '@mui/material';
import { GreyDot } from '@/pages/CaseManagement/components/view/PatientInfo';

import type { ChronologyCaseObjectType } from '../types/MedicalChronologyDetailsType';
import moment from 'moment';
import AppCustomLoader from '@/components/AppCustomLoader';
import { formatPhoneNumber } from '@/utils/phoneUtilities';

type InfoCardProps = {
  data: {
    caseDetails: Array<ChronologyCaseObjectType> | undefined;
    caseDetailsLoading: boolean;
    isCaseDetailsError: boolean;
    caseDetailsError: Error | null;
  };
};

const InfoCard: FC<InfoCardProps> = ({ data }) => {
  const {
    caseDetails,
    caseDetailsLoading,
    isCaseDetailsError,
    caseDetailsError,
  } = data;

  return (
    <Card sx={{ mt: 1 }}>
      <CardContent sx={{ pb: '0 !important' }}>
        {caseDetailsLoading ? (
          <AppCustomLoader height={200} />
        ) : isCaseDetailsError ? (
          <Typography variant="h6" color="error" textAlign="center">
            {caseDetailsError?.message}
          </Typography>
        ) : caseDetails && caseDetails?.length > 0 ? (
          <>
            <Box
              sx={{
                gap: 2,
                pb: 2.75,
                display: 'flex',
                width: '100%',
                overflowX: 'scroll',
                whiteSpace: 'nowrap',
                alignItems: 'flex-start',

                '&::-webkit-scrollbar': {
                  height: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: '#ccc',
                  borderRadius: '3px',
                },

                scrollbarWidth: 'thin',
                scrollbarColor: '#ccc transparent',
              }}
            >
              <Box
                sx={{
                  gap: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Avatar
                  src={
                    caseDetails?.[0]?.patient?.avatar
                      ? `${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${caseDetails?.[0]?.patient?.avatar}`
                      : undefined
                  }
                  sx={{
                    width: 56,
                    height: 56,
                  }}
                >
                  {caseDetails?.[0]?.patient?.firstName &&
                  caseDetails?.[0]?.patient?.lastName
                    ? `${caseDetails?.[0]?.patient?.firstName
                        ?.charAt(0)
                        ?.toUpperCase()}${caseDetails?.[0]?.patient?.lastName
                        ?.charAt(0)
                        ?.toUpperCase()}`
                    : 'NA'}
                </Avatar>
                <Box>
                  <Box
                    sx={{
                      gap: 1,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="h5">
                      {caseDetails?.[0]?.patient?.firstName &&
                      caseDetails?.[0]?.patient?.lastName
                        ? `${caseDetails?.[0]?.patient?.firstName} ${caseDetails?.[0]?.patient?.lastName}`
                        : 'NA'}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      mt: 1.5,
                      gap: 1,
                      display: 'flex',
                      alignItems: 'center',
                      '& .MuiTypography-link': {
                        color: 'info.dark',
                      },
                    }}
                  >
                    <Typography
                      variant="link"
                      component={'a'}
                      href={`mailto:${caseDetails?.[0]?.patient?.email}`}
                    >
                      {caseDetails?.[0]?.patient?.email || 'NA'}
                    </Typography>
                    {GreyDot}
                    <Typography
                      variant="link"
                      component={'a'}
                      href={`tel:${caseDetails?.[0]?.patient?.contact}`}
                    >
                      {caseDetails?.[0]?.patient?.contact
                        ? `${formatPhoneNumber(caseDetails?.[0]?.patient?.contact)}`
                        : 'NA'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Divider flexItem orientation="vertical" />
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                gap={1}
                alignSelf="center"
                sx={{
                  px: 2,
                  '& .MuiTypography-root': {
                    fontSize: 14,
                  },
                }}
              >
                <Typography component="span" fontWeight={500}>
                  Case ID:{' '}
                  <Typography component="span">
                    {caseDetails?.[0].case?.caseId || 'NA'}
                  </Typography>
                </Typography>
                <Typography fontWeight={500}>
                  Case Type:{' '}
                  <Typography
                    component="span"
                    sx={{
                      textTransform: 'capitalize',
                    }}
                  >
                    {caseDetails?.[0].case?.caseType?.replace(/_/g, ' ') ||
                      'NA'}
                  </Typography>
                </Typography>
              </Box>
              <Divider flexItem orientation="vertical" />
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                gap={1}
                alignSelf="center"
                sx={{
                  px: 2,
                  '& .MuiTypography-root': {
                    fontSize: 14,
                  },
                }}
              >
                <Typography component="span" fontWeight={500}>
                  Record Retrieval Date:{' '}
                  <Typography component="span">
                    {moment(caseDetails?.[0].createdAt).format('MM-DD-YYYY') ||
                      'NA'}
                  </Typography>
                </Typography>
                <Typography mt={0.75} fontWeight={500}>
                  Chronology Generated Date:{' '}
                  <Typography
                    component="span"
                    sx={{
                      textTransform: 'capitalize',
                    }}
                  >
                    {moment(caseDetails?.[0].createdAt).format('MM-DD-YYYY') ||
                      'NA'}
                  </Typography>
                </Typography>
              </Box>
              <Divider flexItem orientation="vertical" />
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                sx={{
                  px: 2,
                  '& .MuiTypography-root': {
                    fontSize: 14,
                  },
                }}
              >
                <Typography component="span" fontWeight={500}>
                  Request ID:{' '}
                  <Typography component="span">
                    {caseDetails?.[0].medicalRecordId || 'NA'}
                  </Typography>
                </Typography>
              </Box>
            </Box>
          </>
        ) : (
          <Typography variant="h6" textAlign="center">
            No Data Found!
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default InfoCard;
