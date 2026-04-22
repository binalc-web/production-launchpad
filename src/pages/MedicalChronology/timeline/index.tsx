import { type FC, useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';

import { Box, Button, Grid, Typography } from '@mui/material';
import {
  CurrencyCircleDollarIcon,
  FileTextIcon,
  FolderUserIcon,
} from '@phosphor-icons/react';

import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';

import InfoCard from './InfoCard';
import Calendar from './Calendar';
import TimelineChart from './TimelineChart';
import { getMedicalChronologyDetails } from '@/api/chronologies/details';
import { getMedicalCaseDetails } from '@/api/chronologies/caseDetails';
import AppCustomLoader from '@/components/AppCustomLoader';
import { useQuery } from '@tanstack/react-query';
import type { ChronologyType } from '../types/MedicalChronologyDetailsType';
import { trackEvent } from '@/utils/mixPanel/mixpanel';

const breadcrumbItems: Array<BreadcrumbItem> = [
  {
    title: 'Medical Chronology',
    url: '/medical-chronology',
  },
  {
    title: 'Chronology Timeline',
  },
];

const ChronologyTimeline: FC = () => {
  const { id: chronologyID } = useParams({
    from: '/_app/medical-chronology/timeline/$id',
  });

  const ITEMS_PER_PAGE = 5;
  const [allEvents, setAllEvents] = useState<Array<ChronologyType>>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const navigate = useNavigate();

  // Initial data load query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['chronology-details-initial', chronologyID],
    queryFn: () =>
      getMedicalChronologyDetails({
        id: chronologyID,
        page: 1,
        limit: ITEMS_PER_PAGE,
      }),
  });

  useEffect(() => {
    // Track the event when the component mounts
    void trackEvent('Medical Chronology Timeline Page Viewed', {
      chronologyID,
    });
  });

  const {
    data: caseDetails,
    isLoading: caseDetailsLoading,
    isError: isCaseDetailsError,
    error: caseDetailsError,
  } = useQuery({
    queryKey: ['chronology-details-case-details', chronologyID],
    queryFn: () =>
      getMedicalCaseDetails({
        id: chronologyID,
      }),
  });

  // Load more data query (separate from initial load)
  const loadMoreEvents = async (pageNumber: number): Promise<void> => {
    try {
      setIsLoadingMore(true);
      const moreData = await getMedicalChronologyDetails({
        id: chronologyID,
        page: pageNumber,
        limit: ITEMS_PER_PAGE,
      });

      if (moreData?.chronologies?.length) {
        // Append new events to existing list
        setAllEvents((previousEvents) => [
          ...previousEvents,
          ...moreData.chronologies,
        ]);

        // Check if we've reached the end of available data
        setHasMore(moreData.chronologies.length >= ITEMS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (loadError) {
      console.error('Error loading more events:', loadError);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Initialize allEvents with initial data
  useEffect(() => {
    if (data?.chronologies && !isLoading && allEvents.length === 0) {
      setAllEvents(data.chronologies);
      // Check if we've reached the end of available data
      setHasMore(data.chronologies.length >= ITEMS_PER_PAGE);
    }
  }, [data, isLoading, allEvents.length]);

  const handlePageChange = (): void => {
    const nextPage = Math.ceil(allEvents.length / ITEMS_PER_PAGE) + 1;
    void loadMoreEvents(nextPage);
  };

  return (
    <Box mb={3}>
      <Breadcrumbs items={breadcrumbItems} />

      {isLoading ? (
        <AppCustomLoader height={200} />
      ) : isError ? (
        <Typography variant="h6" color="error" textAlign="center">
          {error?.message}
        </Typography>
      ) : data && data?.chronologies?.length > 0 ? (
        <>
          <Box
            sx={{
              mt: 1.25,
              mb: 2.5,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              variant="h4"
              noWrap
              title={caseDetails?.[0]?.case?.title || 'Case Title'}
              sx={{
                maxWidth: 500,
              }}
            >
              {caseDetails?.[0]?.case?.title || 'Case Title'} - Chronology
              Timeline View
            </Typography>

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
                  bgcolor: (theme) =>
                    `${theme.palette.common.white} !important`,
                }}
                onClick={() =>
                  navigate({
                    to: `/case-management/view/${caseDetails?.[0]?.case?.caseId}`,
                  })
                }
              >
                View Case
              </Button>
              <Button
                size="large"
                color="secondary"
                variant="contained"
                startIcon={<FileTextIcon />}
                onClick={() => {
                  void navigate({
                    to: `/medical-records/case/${caseDetails?.[0].case?._id}`,
                  });
                }}
              >
                View Record
              </Button>
              <Button
                size="large"
                color="primary"
                variant="contained"
                disabled={!caseDetails?.[0]?.billingOrMedicalId}
                startIcon={<CurrencyCircleDollarIcon />}
                onClick={() =>
                  navigate({
                    to: `/billing-chronology/timeline/${caseDetails?.[0]?.billingOrMedicalId}`,
                  })
                }
              >
                View Billing
              </Button>
            </Box>
          </Box>

          <InfoCard
            data={{
              caseDetails,
              caseDetailsLoading,
              isCaseDetailsError,
              caseDetailsError,
            }}
          />

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid
              size={{
                xs: 12,
                lg: 3,
              }}
            >
              <Calendar />
            </Grid>
            <Grid
              size={{
                xs: 12,
                lg: 9,
              }}
            >
              <TimelineChart
                hasMore={hasMore}
                chronologyId={chronologyID}
                isLoadingMore={isLoadingMore}
                handlePageChange={handlePageChange}
                data={
                  allEvents.length > 0 ? allEvents : data?.chronologies || []
                }
              />
            </Grid>
          </Grid>
        </>
      ) : (
        <Typography variant="h6" textAlign="center">
          No Data Found!
        </Typography>
      )}
    </Box>
  );
};

export default ChronologyTimeline;
