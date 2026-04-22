import type { FC } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Tooltip,
  Typography,
} from '@mui/material';

import { getCaseType } from '@/utils/caseType';
import { formatPhoneNumber } from '@/utils/phoneUtilities';

type PatientInfoType = {
  data: {
    patient: {
      avatar?: string | undefined;
      firstName: string;
      lastName: string;
      email: string;
      contact: string;
    };
    caseId: string;
    caseType: string;
    status: string;
    assignee: {
      firstName: string;
      lastName: string;
    };
    authorizingPersonType: string;
    authorizedAttorney: {
      firstName: string;
      lastName: string;
    };
    authorizedGuardian: {
      firstName: string;
      lastName: string;
    };
    thirdPartyUsers: Array<{
      _id: string;
      firstName: string;
      lastName: string;
      avatar?: string | undefined;
    }>;
  };
};

export const GreyDot = (
  <Box
    sx={{
      width: 4,
      height: 4,
      borderRadius: '50%',
      bgcolor: 'neutral.200',
    }}
  />
);

export const getColors = (
  status: string
): { color: string; backgroundColor: string; borderColor: string } => {
  return {
    color:
      status === 'open'
        ? '#3957D7'
        : status === 'closed'
          ? '#D7263D'
          : '#CE8324',
    backgroundColor:
      status === 'open'
        ? '#F1F5FD'
        : status === 'closed'
          ? '#FEF2F2'
          : '#FBF7EB',
    borderColor:
      status === 'open'
        ? '#C5D6F8'
        : status === 'closed'
          ? '#FCCFD1'
          : '#F0D498',
  };
};

const PatientInfo: FC<PatientInfoType> = ({ data }) => {
  return (
    <Card sx={{ mt: 1 }}>
      <CardContent sx={{ pb: '0 !important' }}>
        <Box
          sx={{
            gap: 2,
            pb: 2.75,
            display: 'flex',
            width: '100%',
            overflowX: 'scroll',
            whiteSpace: 'nowrap',

            '&::-webkit-scrollbar': {
              height: '6px', // smaller height for horizontal scrollbar
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#ccc', // light gray
              borderRadius: '3px',
            },

            // Firefox scrollbar styling
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
              src={`${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${data?.patient?.avatar}`}
              sx={{
                width: 56,
                height: 56,
              }}
            >
              {data?.patient?.firstName?.[0]}
              {data?.patient?.lastName?.[0]}
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
                  {data?.patient?.firstName} {data?.patient?.lastName}
                </Typography>
                <Chip
                  sx={{
                    py: 1.5,
                    height: 18,
                    border: `1px solid`,
                    ...getColors(data?.status),
                    '& .MuiChip-label': {
                      fontWeight: 500,
                      fontSize: '0.75rem',
                    },
                  }}
                  label={getCaseType(data?.status)}
                />
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
                  component="a"
                  variant="link"
                  fontSize={14}
                  fontWeight={400}
                  href={`mailto:${data?.patient?.email}`}
                >
                  {data?.patient?.email}
                </Typography>
                {GreyDot}
                <Typography
                  variant="link"
                  fontSize={14}
                  fontWeight={400}
                  component="a"
                  href={`tel:${data?.patient?.contact}`}
                >
                  {data?.patient?.contact
                    ? formatPhoneNumber(data.patient.contact)
                    : ''}
                </Typography>
              </Box>
            </Box>
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
              Case ID: <Typography component="span">{data?.caseId}</Typography>
            </Typography>
            <Typography mt={0.75} fontWeight={500}>
              Case Type:{' '}
              <Typography
                component="span"
                sx={{
                  textTransform: 'capitalize',
                }}
              >
                {data?.caseType?.replace(/_/g, ' ')}
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
              Assignee:{' '}
              <Typography component="span">
                {data?.assignee?.firstName} {data?.assignee?.lastName}
              </Typography>
            </Typography>

            <Typography mt={0.75} fontWeight={500} textTransform="capitalize">
              {data?.authorizingPersonType === 'self'
                ? 'Authorizing Person Type'
                : data?.authorizingPersonType === 'power_of_attorney'
                  ? 'Power of Attorney/Trustee'
                  : data?.authorizingPersonType}
              :{'  '}
              <Typography
                component="span"
                sx={{
                  textTransform: 'capitalize',
                }}
              >
                {data?.authorizingPersonType === 'power_of_attorney'
                  ? `${data?.authorizedAttorney?.firstName || ''} ${data?.authorizedAttorney?.lastName || ''}`
                  : data?.authorizingPersonType === 'guardian'
                    ? `${data?.authorizedGuardian?.firstName || ''} ${data?.authorizedGuardian?.lastName || ''}`
                    : 'Self'}
              </Typography>
            </Typography>
          </Box>
          <>
            <Divider flexItem orientation="vertical" />
            <Box
              sx={{
                px: 2,
              }}
            >
              <Typography fontSize={14} fontWeight={500}>
                Interested Third Parties:
              </Typography>
              <Box
                sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                {data?.thirdPartyUsers?.length ? (
                  <>
                    {' '}
                    {data?.thirdPartyUsers?.slice(0, 5)?.map((user, index) => (
                      <Tooltip
                        title={user.firstName + ' ' + user.lastName}
                        placement="top"
                      >
                        <Avatar
                          key={user._id}
                          src={`${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${user?.avatar}`}
                          sx={{
                            width: 32,
                            height: 32,
                            fontSize: 14,
                            cursor: 'pointer',
                            ml: index > 0 ? -2 : 0,
                            border: '1px solid white',
                          }}
                        >
                          {user.firstName[0]}
                          {user.lastName[0]}
                        </Avatar>
                      </Tooltip>
                    ))}
                    {data?.thirdPartyUsers?.length > 5 && (
                      <Avatar
                        sx={{
                          ml: -2,
                          width: 32,
                          height: 32,
                          fontSize: 14,
                          border: '1px solid white',
                        }}
                      >
                        +{data?.thirdPartyUsers?.length - 5}
                      </Avatar>
                    )}
                  </>
                ) : (
                  <Typography fontSize={14}>
                    No Third Parties Selected
                  </Typography>
                )}
              </Box>
            </Box>
          </>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PatientInfo;
