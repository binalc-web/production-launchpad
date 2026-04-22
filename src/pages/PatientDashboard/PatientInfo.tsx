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

import { SealCheckIcon } from '@phosphor-icons/react';

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

const PatientInfo: FC = () => {
  return (
    <Card sx={{ mt: 2 }}>
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
              sx={{
                width: 56,
                height: 56,
              }}
            >
              ES
            </Avatar>
            <Box>
              <Box
                sx={{
                  gap: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h5">Emma Smith</Typography>
                <Chip
                  sx={{
                    py: 1.5,
                    height: 18,
                    border: 0,
                    borderRadius: 0.75,
                    bgcolor: 'success.dark',
                    '& .MuiChip-label': {
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      color: 'common.white',
                    },
                  }}
                  label={
                    <Box
                      sx={{
                        gap: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <SealCheckIcon size={16} />
                      Clear Verified
                    </Box>
                  }
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
                <Typography variant="link">emma_smith@email.com</Typography>
                {GreyDot}
                <Typography variant="link">+1 (555) 345-6789</Typography>
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
              Case Type:{' '}
              <Typography component="span">Personal Injury</Typography>
            </Typography>
            <Typography mt={0.75} fontWeight={500}>
              Case Start Date:{' '}
              <Typography
                component="span"
                sx={{
                  textTransform: 'capitalize',
                }}
              >
                07-22-2021
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
              Last Request:{'  '}
              <Typography component="span">03-01-2025</Typography>
            </Typography>

            <Typography mt={0.75} fontWeight={500} textTransform="capitalize">
              Record Type:{'  '}
              <Typography
                component="span"
                sx={{
                  textTransform: 'capitalize',
                }}
              >
                Medical, Billing, Pharmacy
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
              Record Provider:{'  '}
              <Typography component="span">Other</Typography>
            </Typography>

            <Typography mt={0.75} fontWeight={500} textTransform="capitalize">
              Facilities:{'  '}
              <Tooltip title="Hospital 1, Hospital 2" placement="top">
                <Typography
                  component="span"
                  variant="link"
                  sx={{
                    color: 'info.dark',
                    textTransform: 'capitalize',
                  }}
                >
                  2 Facilities
                </Typography>
              </Tooltip>
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PatientInfo;
