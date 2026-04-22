import { Box, Popover, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';

import type {
  CaseListKeysType,
  caseListResponse,
} from '../api/caseManagement/getAllCases';
import { getAllSearchResults } from '../api/global/search';
import { useEffect } from 'react';
import { searchCategories } from '../utils/searchCategories';
import AppCustomLoader from './AppCustomLoader';
import MedicalChronology from './GlobalSearchComponents/MedicalChronology';
import BillingChronology from './GlobalSearchComponents/BillingChronology';
import MedicalRecords from './GlobalSearchComponents/MedicalRecords';
import SearchCases from './GlobalSearchComponents/Cases';

interface SearchBarPopOverProps {
  id: string | undefined;
  open: boolean;
  handleClose: () => void;
  anchorEl: HTMLElement | null;
  searchTerms: string;
  category: string;
}

const SearchBarPopOver: React.FC<SearchBarPopOverProps> = ({
  id,
  open,
  handleClose,
  anchorEl,
  searchTerms,
  category,
}) => {
  const caseListKey = searchCategories
    ?.find((item) => item.value === category)
    ?.key?.toLowerCase();

  const {
    data: caseList,
    isLoading,
    refetch,
  }: {
    data: caseListResponse | undefined;
    isLoading: boolean;
    refetch: () => void;
  } = useQuery({
    queryKey: ['global_search'],
    queryFn: async () => {
      const data = await getAllSearchResults({
        category: caseListKey,
        searchKeyWordString: searchTerms,
        page: 1,
        limit: 1000,
      });
      return data;
    },
    staleTime: Infinity,
    enabled: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      refetch();
    }, 500);

    return (): void => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerms]);

  const SearchResultToRender = caseList?.[caseListKey as CaseListKeysType]?.map(
    (caseItem) => {
      if (caseListKey === 'cases') {
        return <SearchCases caseItem={caseItem} handleClose={handleClose} />;
      }
      if (caseListKey === 'medical_chronology') {
        if (caseItem.case && caseItem._id && caseItem.patient) {
          const transformedItem = {
            case: caseItem.case,
            patient: caseItem.patient,
            _id: caseItem._id,
          };
          return (
            <MedicalChronology
              caseItem={transformedItem}
              handleClose={handleClose}
            />
          );
        }
        return null;
      }
      if (caseListKey === 'billing-chronology') {
        if (caseItem.case && caseItem._id && caseItem.patient) {
          const transformedItem = {
            case: caseItem.case,
            patient: caseItem.patient,
            _id: caseItem._id,
          };
          return (
            <BillingChronology
              caseItem={transformedItem}
              handleClose={handleClose}
            />
          );
        }
        return null;
      }
      if (caseListKey === 'records') {
        if (caseItem._id && caseItem?.caseNumber && caseItem?.patientDetails) {
          const transformedItem = {
            caseNumber: caseItem.caseNumber,
            patientDetails: caseItem.patientDetails,
            provider: caseItem.provider || 'Self',
            _id: caseItem._id,
          };
          return (
            <MedicalRecords
              caseItem={transformedItem}
              handleClose={handleClose}
            />
          );
        }
        return null;
      }
      return <>No Data to Render</>;
    }
  );

  return (
    <Popover
      id={id}
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      slotProps={{
        paper: {
          sx: { width: 595, borderRadius: 1.25, mt: 1, ml: -5 },
        },
      }}
      disableAutoFocus
      disableEnforceFocus
      disableRestoreFocus
    >
      <Box display="flex" flexDirection="column" p={2} id="search-popover">
        <Typography fontWeight={500} fontSize={14} color="natural.400">
          Search Results
        </Typography>
        {isLoading ? (
          <AppCustomLoader height={150} />
        ) : caseList?.[caseListKey as CaseListKeysType]?.length === 0 ? (
          <>
            {' '}
            <Typography
              fontSize={19}
              textAlign="center"
              fontWeight={600}
              sx={{
                color: (theme) => theme.palette.neutral[400],
              }}
            >
              No Data Available
            </Typography>
          </>
        ) : (
          SearchResultToRender
        )}
      </Box>
    </Popover>
  );
};

export default SearchBarPopOver;
