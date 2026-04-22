import type { FC } from 'react';
import { Avatar, Box, Typography } from '@mui/material';
import { useNavigate } from '@tanstack/react-router';

export interface MedicalChronologyProps {
  caseItem: {
    case: {
      caseId: string;
      caseNumber: string;
    };
    patient: {
      firstName: string;
      lastName: string;
      email: string;
      avatar: string;
    };
    _id: string;
  };
  handleClose: () => void;
}

const MedicalChronology: FC<MedicalChronologyProps> = ({
  caseItem,
  handleClose,
}) => {
  const navigate = useNavigate();

  return (
    <Box
      gap={2}
      onClick={() => {
        void navigate({
          to: `/medical-chronology/timeline/${caseItem?._id}`,
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
          {caseItem.case?.caseId}
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
                caseItem?.patient?.avatar
                  ? caseItem?.patient?.avatar
                  : undefined
              }
              sx={{
                width: 32,
                height: 32,
                fontSize: 14,
              }}
            >
              {caseItem?.patient?.firstName?.[0]}
              {caseItem?.patient?.lastName?.[0]}
            </Avatar>
            <Box>
              <Typography noWrap>
                {caseItem?.patient?.firstName} {caseItem?.patient?.lastName}
              </Typography>
              <Typography noWrap sx={{ fontSize: 14, color: 'neutral.500' }}>
                {caseItem?.patient?.email}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Typography
        sx={{
          mt: 2,
          color: 'info.dark',
        }}
      >
        {caseItem?._id}
      </Typography>
    </Box>
  );
};

export default MedicalChronology;
