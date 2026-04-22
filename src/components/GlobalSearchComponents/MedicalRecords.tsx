import type { FC } from 'react';
import { Avatar, Box, Chip, Typography } from '@mui/material';
import { useNavigate } from '@tanstack/react-router';

export interface MedicalRecordsProps {
  caseItem: {
    caseNumber: string;
    patientDetails: {
      firstName: string;
      lastName: string;
      email: string;
      avatar: string;
    };
    provider: string;
    _id: string;
  };
  handleClose: () => void;
}

const MedicalRecords: FC<MedicalRecordsProps> = ({ caseItem, handleClose }) => {
  const navigate = useNavigate();

  const color = caseItem?.provider === 'other' ? '#0E9388' : '#00A92A';
  const backgroundColor =
    caseItem?.provider === 'other' ? '#F0FDFA' : '#EEFFF1';

  const borderColor = caseItem?.provider === 'other' ? '#9AF5E4' : '#B2FFC4';

  return (
    <Box
      gap={2}
      onClick={() => {
        void navigate({
          to: `/medical-records/view/${caseItem?._id}`,
        });
        handleClose();
      }}
      key={caseItem?._id}
      display="flex"
      flexDirection="row"
      sx={{
        cursor: 'pointer',

        '&:not(:last-child)': {
          borderBottom: '1px solid',
          borderColor: 'divider',
        },
      }}
      py={1.6}
      justifyContent="space-between"
      alignContent="center"
    >
      <Box display="flex" alignItems="center" gap={3}>
        <Typography
          fontSize={16}
          color="natural.700"
          noWrap
          sx={{
            mt: 1,
            maxWidth: 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {caseItem.caseNumber}
        </Typography>
        <Box
          sx={{
            gap: 1,
            mt: 1.25,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              gap: 1.5,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Avatar
              src={
                caseItem?.patientDetails?.avatar
                  ? caseItem?.patientDetails?.avatar
                  : undefined
              }
              sx={{
                width: 32,
                height: 32,
                fontSize: 14,
              }}
            >
              {caseItem?.patientDetails?.firstName?.[0]}
              {caseItem?.patientDetails?.lastName?.[0]}
            </Avatar>
            <Box>
              <Typography noWrap>
                {caseItem?.patientDetails?.firstName}{' '}
                {caseItem?.patientDetails?.lastName}
              </Typography>
              <Typography noWrap sx={{ fontSize: 14, color: 'neutral.500' }}>
                {caseItem?.patientDetails?.email}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Chip
        sx={{
          mt: 1,
          backgroundColor: { backgroundColor },
          color: { color },
          p: 2,
          border: `1px solid ${borderColor}`,
          fontWeight: 500,
          fontSize: '0.875rem',
          height: 16,
          textTransform:
            caseItem?.provider?.toLowerCase() === 'other'
              ? 'capitalize'
              : 'uppercase',
        }}
        label={caseItem.provider}
      />
    </Box>
  );
};

export default MedicalRecords;
