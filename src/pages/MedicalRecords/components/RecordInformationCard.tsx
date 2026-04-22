import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Typography,
} from '@mui/material';
import type { FC } from 'react';
import { GreyDot } from '@/pages/CaseManagement/components/view/PatientInfo';
import { getRecordStatus } from '@/utils/recordStatus';
import { getRecordColors } from '../ViewRecord';
import moment from 'moment';

type RecordInformationCardProps = {
  name: string;
  email: string;
  phone: string;
  caseId: string;
  caseType: string;
  requestId: string;
  recordRetrievalDate: string;
  status: string;
  avatarSrc?: string;
  avatarAlt?: string;
};

const RecordInformationCard: FC<RecordInformationCardProps> = ({
  name,
  email,
  phone,
  caseId,
  caseType,
  requestId,
  recordRetrievalDate,
  status,
  avatarSrc,
  avatarAlt,
}) => {
  return (
    <Card sx={{ mt: 1 }}>
      <CardContent>
        <Box
          sx={{
            gap: 2,
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
              src={
                avatarSrc
                  ? import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION +
                    avatarSrc
                  : undefined
              }
              sx={{
                width: 56,
                height: 56,
              }}
            >
              {avatarAlt}
            </Avatar>

            <Box>
              <Box
                sx={{
                  gap: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h5">{name}</Typography>
                <Chip
                  sx={{
                    py: 1.5,
                    height: 18,
                    border: `1px solid`,
                    ...getRecordColors(status),
                    '& .MuiChip-label': {
                      fontWeight: 500,
                      fontSize: '0.75rem',
                    },
                  }}
                  label={getRecordStatus(status)}
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
                  variant="link"
                  component="a"
                  href={`mailto:${email}`}
                >
                  {email}
                </Typography>
                {GreyDot}
                <Typography component="a" href={`tel:${phone}`} variant="link">
                  {phone}
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
              Case ID: <Typography component="span">{caseId}</Typography>
            </Typography>
            <Typography mt={0.75} fontWeight={500}>
              Case Type:{' '}
              <Typography
                component="span"
                sx={{
                  textTransform: 'capitalize',
                }}
              >
                {caseType}
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
              Request ID: <Typography component="span">{requestId}</Typography>
            </Typography>
            <Typography mt={0.75} fontWeight={500}>
              Record Retreival Date:{' '}
              <Typography
                component="span"
                sx={{
                  textTransform: 'capitalize',
                }}
              >
                {moment(recordRetrievalDate).format('MM-DD-YYYY')}
              </Typography>
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RecordInformationCard;
