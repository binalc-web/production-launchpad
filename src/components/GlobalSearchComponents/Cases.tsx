import type { FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Box, Chip, Typography } from '@mui/material';
import { getCaseType } from '@/utils/caseType';

export interface SearchCasesProps {
  caseItem: {
    caseId: string;
    title: string;
    caseType: string;
    status: string;
  };
  handleClose: () => void;
}

const SearchCases: FC<SearchCasesProps> = ({ caseItem, handleClose }) => {
  const navigate = useNavigate();

  const value = caseItem.status.toLowerCase();

  function formatCategoryKey(key: string): string {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
      .join(' ');
  }

  const color =
    value === 'open' ? '#3957D7' : value === 'closed' ? '#D7263D' : '#CE8324';
  const backgroundColor =
    value === 'open' ? '#F1F5FD' : value === 'closed' ? '#FEF2F2' : '#FBF7EB';

  const borderColor =
    value === 'open' ? '#C5D6F8' : value === 'closed' ? '#FCCFD1' : '#F0D498';

  return (
    <Box
      onClick={() => {
        void navigate({
          to: `/case-management/view/${caseItem.caseId}`,
        });
        handleClose();
      }}
      key={caseItem.caseId}
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
      <Box display="flex" flexDirection="column">
        <Typography
          fontSize={16}
          color="natural.700"
          noWrap
          sx={{
            maxWidth: 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {caseItem.caseId} - {caseItem.title}
        </Typography>
        <Typography fontSize={14} color="natural.500">
          {formatCategoryKey(caseItem.caseType)}
        </Typography>
      </Box>

      <Chip
        sx={{
          backgroundColor: { backgroundColor },
          color: { color },
          p: 2,
          border: `1px solid ${borderColor}`,
          fontWeight: 500,
          fontSize: '0.875rem',
          height: 16,
        }}
        label={getCaseType(caseItem.status.toString())}
      />
    </Box>
  );
};

export default SearchCases;
