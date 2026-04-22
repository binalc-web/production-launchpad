import { type FC, useState, useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import { getBillingChronologyDetails } from '@/api/chronologies/details';
import type { ChronologyType } from '@/pages/BillingChronology/types/BillingChronologyDetailsType';
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineSeparator,
} from '@mui/lab';
import AppCustomLoader from '@/components/AppCustomLoader';
import { Box, Button, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from '@tanstack/react-router';
import {
  CaretRightIcon,
  HospitalIcon,
  WalletIcon,
} from '@phosphor-icons/react';
import moment from 'moment';
import { GreyDot } from '@/pages/PatientDashboard/PatientInfo';

const BillingTimeline: FC<{ chronologyID: string }> = ({ chronologyID }) => {
  const ITEMS_PER_PAGE = 5;
  const [allEvents, setAllEvents] = useState<Array<ChronologyType>>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const theme = useTheme();
  const navigate = useNavigate();

  // Initial data load query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['billing-chronology-details-initial', chronologyID],
    queryFn: () =>
      getBillingChronologyDetails({
        id: chronologyID,
        page: 1,
        limit: ITEMS_PER_PAGE,
      }),
  });

  // Load more data query (separate from initial load)
  const loadMoreEvents = async (pageNumber: number): Promise<void> => {
    try {
      setIsLoadingMore(true);
      const moreData = await getBillingChronologyDetails({
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
    <>
      <Box
        sx={{
          ml: 8,
          mt: 1.25,
          gap: 0.25,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Box
          component="svg"
          width="16px"
          height="16px"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <Box
            component="path"
            d="M15.625 11.125C15.6264 11.3543 15.5567 11.5785 15.4255 11.7666C15.2943 11.9547 15.1081 12.0976 14.8923 12.1755L11.2656 13.5156L9.92968 17.1452C9.85057 17.3601 9.70743 17.5456 9.51959 17.6766C9.33174 17.8076 9.10823 17.8779 8.87921 17.8779C8.65019 17.8779 8.42667 17.8076 8.23883 17.6766C8.05099 17.5456 7.90785 17.3601 7.82874 17.1452L6.48437 13.5156L2.85483 12.1797C2.63991 12.1006 2.45442 11.9574 2.3234 11.7696C2.19238 11.5818 2.12213 11.3582 2.12213 11.1292C2.12213 10.9002 2.19238 10.6767 2.3234 10.4888C2.45442 10.301 2.63991 10.1579 2.85483 10.0787L6.48437 8.73437L7.8203 5.10484C7.89942 4.88992 8.04255 4.70443 8.23039 4.57341C8.41824 4.44239 8.64175 4.37214 8.87077 4.37214C9.0998 4.37214 9.32331 4.44239 9.51115 4.57341C9.69899 4.70443 9.84213 4.88992 9.92124 5.10484L11.2656 8.73437L14.8951 10.0703C15.111 10.1489 15.2972 10.2926 15.4279 10.4815C15.5586 10.6704 15.6275 10.8953 15.625 11.125ZM11.6875 4.375H12.8125V5.5C12.8125 5.64918 12.8718 5.79226 12.9772 5.89775C13.0827 6.00324 13.2258 6.0625 13.375 6.0625C13.5242 6.0625 13.6672 6.00324 13.7727 5.89775C13.8782 5.79226 13.9375 5.64918 13.9375 5.5V4.375H15.0625C15.2117 4.375 15.3547 4.31574 15.4602 4.21025C15.5657 4.10476 15.625 3.96168 15.625 3.8125C15.625 3.66332 15.5657 3.52024 15.4602 3.41475C15.3547 3.30926 15.2117 3.25 15.0625 3.25H13.9375V2.125C13.9375 1.97582 13.8782 1.83274 13.7727 1.72725C13.6672 1.62176 13.5242 1.5625 13.375 1.5625C13.2258 1.5625 13.0827 1.62176 12.9772 1.72725C12.8718 1.83274 12.8125 1.97582 12.8125 2.125V3.25H11.6875C11.5383 3.25 11.3952 3.30926 11.2897 3.41475C11.1843 3.52024 11.125 3.66332 11.125 3.8125C11.125 3.96168 11.1843 4.10476 11.2897 4.21025C11.3952 4.31574 11.5383 4.375 11.6875 4.375ZM17.875 6.625H17.3125V6.0625C17.3125 5.91332 17.2532 5.77024 17.1477 5.66475C17.0422 5.55926 16.8992 5.5 16.75 5.5C16.6008 5.5 16.4577 5.55926 16.3522 5.66475C16.2468 5.77024 16.1875 5.91332 16.1875 6.0625V6.625H15.625C15.4758 6.625 15.3327 6.68426 15.2272 6.78975C15.1218 6.89524 15.0625 7.03832 15.0625 7.1875C15.0625 7.33668 15.1218 7.47976 15.2272 7.58525C15.3327 7.69074 15.4758 7.75 15.625 7.75H16.1875V8.3125C16.1875 8.46168 16.2468 8.60476 16.3522 8.71025C16.4577 8.81574 16.6008 8.875 16.75 8.875C16.8992 8.875 17.0422 8.81574 17.1477 8.71025C17.2532 8.60476 17.3125 8.46168 17.3125 8.3125V7.75H17.875C18.0242 7.75 18.1672 7.69074 18.2727 7.58525C18.3782 7.47976 18.4375 7.33668 18.4375 7.1875C18.4375 7.03832 18.3782 6.89524 18.2727 6.78975C18.1672 6.68426 18.0242 6.625 17.875 6.625Z"
            fill="#8B95A5"
          />
        </Box>

        <Typography
          sx={{
            mt: 0.25,
            fontSize: 12,
            color: 'neutral.400',
          }}
        >
          AI-generated Summary
        </Typography>
      </Box>
      <Timeline
        sx={{
          '& .MuiTimelineSeparator-root': {
            '& .MuiTimelineDot-root': {
              mt: '27px',
              mb: 0,
            },
            '& .MuiTimelineConnector-root': {
              position: 'relative',
              top: '10px',
            },
          },
        }}
      >
        {isLoading ? (
          <AppCustomLoader height={200} />
        ) : isError ? (
          <Typography variant="body1" color="error">
            {error?.message}
          </Typography>
        ) : (
          allEvents?.map((item, index) => {
            const isLast = index === allEvents?.length - 1;

            return (
              <TimelineItem
                sx={{
                  minHeight: 110,
                  cursor: 'pointer',
                  '&:before': {
                    display: 'none',
                  },
                }}
                onClick={() =>
                  navigate({
                    to: `/billing-chronology/billing-event/${chronologyID}/${item._id}`,
                  })
                }
              >
                <TimelineSeparator>
                  <TimelineDot
                    sx={{
                      boxShadow: 'none',
                      bgcolor: 'transparent',
                      '& path': {
                        fill: theme.palette.success.dark,
                      },
                    }}
                  >
                    <Box
                      component="svg"
                      width="24px"
                      height="24px"
                      viewBox="0 0 24 24"
                    >
                      <Box
                        component="path"
                        d="M12 2.25C10.0716 2.25 8.18657 2.82183 6.58319 3.89317C4.97982 4.96451 3.73013 6.48726 2.99218 8.26884C2.25422 10.0504 2.06114 12.0108 2.43735 13.9021C2.81355 15.7934 3.74215 17.5307 5.10571 18.8943C6.46928 20.2579 8.20656 21.1865 10.0979 21.5627C11.9892 21.9389 13.9496 21.7458 15.7312 21.0078C17.5127 20.2699 19.0355 19.0202 20.1068 17.4168C21.1782 15.8134 21.75 13.9284 21.75 12C21.7473 9.41498 20.7192 6.93661 18.8913 5.10872C17.0634 3.28084 14.585 2.25273 12 2.25ZM12 20.25C10.3683 20.25 8.77326 19.7661 7.41655 18.8596C6.05984 17.9531 5.00242 16.6646 4.378 15.1571C3.75358 13.6496 3.5902 11.9908 3.90853 10.3905C4.22685 8.79016 5.01259 7.32015 6.16637 6.16637C7.32016 5.01259 8.79017 4.22685 10.3905 3.90852C11.9909 3.59019 13.6497 3.75357 15.1571 4.37799C16.6646 5.00242 17.9531 6.05984 18.8596 7.41655C19.7661 8.77325 20.25 10.3683 20.25 12C20.2475 14.1873 19.3775 16.2843 17.8309 17.8309C16.2843 19.3775 14.1873 20.2475 12 20.25ZM17.25 12C17.25 13.0384 16.9421 14.0534 16.3652 14.9167C15.7883 15.7801 14.9684 16.453 14.0091 16.8504C13.0498 17.2477 11.9942 17.3517 10.9758 17.1491C9.95738 16.9466 9.02192 16.4465 8.28769 15.7123C7.55347 14.9781 7.05345 14.0426 6.85088 13.0242C6.64831 12.0058 6.75228 10.9502 7.14964 9.99091C7.547 9.0316 8.2199 8.21166 9.08326 7.63478C9.94662 7.05791 10.9617 6.75 12 6.75C13.3919 6.75149 14.7264 7.30509 15.7107 8.28933C16.6949 9.27358 17.2485 10.6081 17.25 12Z"
                      />
                    </Box>
                  </TimelineDot>
                  {!isLast && (
                    <TimelineConnector
                      sx={{ bgcolor: theme.palette.divider }}
                    />
                  )}
                </TimelineSeparator>
                <TimelineContent component="div" sx={{ py: 0 }}>
                  <Box
                    sx={{
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '12px',
                      justifyContent: 'space-between',
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Box
                      sx={{
                        gap: 2,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: '8px',
                          bgcolor: 'neutral.50',
                          textAlign: 'center',
                        }}
                      >
                        <Typography fontWeight={600}>
                          ${item.amount_billed?.toFixed(2)}
                        </Typography>
                      </Box>
                      <Box>
                        <Box
                          sx={{
                            gap: 1,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Typography fontSize={14} fontWeight={500}>
                            {moment(item.date, 'MM-DD-YYYY, hh:mm A').format(
                              'MM-DD-YYYY'
                            )}{' '}
                            ({item.title})
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            mt: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              overflow: 'hidden',
                            }}
                          >
                            <HospitalIcon />
                            <Typography
                              fontSize={14}
                              noWrap
                              maxWidth={160}
                              sx={{ color: 'neutral.500' }}
                            >
                              {item.location || 'Not Specified'}
                            </Typography>
                          </Box>
                          {GreyDot}
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              overflow: 'hidden',
                            }}
                          >
                            <WalletIcon />
                            <Typography
                              fontSize={14}
                              noWrap
                              maxWidth={180}
                              sx={{ color: 'neutral.500' }}
                            >
                              {item.insurance_paid > 0 && item.patient_paid > 0
                                ? 'Insurance & Out-of-Pocket Payments'
                                : item.insurance_paid > 0 &&
                                    item.patient_paid === 0
                                  ? 'Insurance Payment'
                                  : item.insurance_paid === 0 &&
                                      item.patient_paid > 0
                                    ? 'Out-of-Pocket Payment'
                                    : 'No Payment'}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        mt: 1,
                        '& svg': {
                          color: 'neutral.500',
                        },
                      }}
                    >
                      <CaretRightIcon size={24} />
                    </Box>
                  </Box>
                </TimelineContent>
              </TimelineItem>
            );
          })
        )}
      </Timeline>
      {isLoadingMore ? <AppCustomLoader height={150} /> : null}
      {!isLoadingMore && hasMore && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Button
            variant="outlined"
            color="primary"
            onClick={handlePageChange}
            disabled={isLoadingMore}
            sx={{ minWidth: 200 }}
          >
            {isLoadingMore ? 'Loading...' : 'See More'}
          </Button>
        </Box>
      )}
    </>
  );
};

export default BillingTimeline;
