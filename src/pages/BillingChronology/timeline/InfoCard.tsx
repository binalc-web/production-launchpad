import type { FC } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Divider,
  Typography,
} from '@mui/material';
import { GreyDot } from '@/pages/PatientDashboard/PatientInfo';
import { formatPhoneNumber } from '@/utils/phoneUtilities';

interface InfoCardProps {
  firstName: string;
  lastName: string;
  avatar?: string;
  email: string;
  contact: string;
  caseId: string;
  caseType: string;
  invoiceNumber: string;
  code: string;
  createdAt: string;
}

const InfoCard: FC<InfoCardProps> = ({
  firstName,
  lastName,
  avatar,
  email,
  contact,
  caseId,
  caseType,
}) => {
  return (
    <Card sx={{ mt: 2 }}>
      <CardContent sx={{ pb: '0 !important' }}>
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
                avatar
                  ? `${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${avatar}`
                  : undefined
              }
              sx={{
                width: 56,
                height: 56,
              }}
            >
              {firstName[0] + lastName[0]}
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
                  {firstName + ' ' + lastName}
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
                  component="a"
                  href={`mailto:${email}`}
                >
                  {email}
                </Typography>
                {GreyDot}
                <Typography
                  variant="link"
                  component="a"
                  href={`tel:${contact}`}
                >
                  {formatPhoneNumber(contact)}
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
              <Typography component="span">{caseId || 'NA'}</Typography>
            </Typography>
            <Typography mt={0.75} fontWeight={500}>
              Case Type:{' '}
              <Typography
                component="span"
                sx={{
                  textTransform: 'capitalize',
                }}
              >
                {caseType?.replace('_', ' ')}
              </Typography>
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default InfoCard;
