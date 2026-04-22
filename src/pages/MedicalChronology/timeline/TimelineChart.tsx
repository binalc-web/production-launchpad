import { type FC, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CheckIcon,
  InfoIcon,
  LineSegmentsIcon,
  XCircleIcon,
  ExportIcon,
} from '@phosphor-icons/react';
import EventTimeline from './EventTimeline';
import type {
  ChronologyType,
  MedicalChronologyTimelineType,
} from '../types/MedicalChronologyDetailsType';
import AppCustomLoader from '@/components/AppCustomLoader';
import ToastAlert from '@/components/ToastAlert';
import { getChronologySummaryReport } from '@/api/chronologies/export';
import { CHRONOLOGY_CATEGORY } from '@/api/chronologies/constants';
import MedicalTimelineMatrix from './MedicalTimelineMatrix';
import { useQuery } from '@tanstack/react-query';
import { getMedicalChronologyTimeline } from '@/api/chronologies/details';
import { mapCareSetting, mapToEventType } from './medicalTimelineMatrix.utilities';

const ALERT_AUTO_HIDE_MS = 2000;

type TimeLineChartType = {
  data: Array<ChronologyType>;
  hasMore: boolean;
  chronologyId: string;
  isLoadingMore: boolean;
  handlePageChange: () => void;
};

const TimelineChart: FC<TimeLineChartType> = (props) => {
  const { data, hasMore, chronologyId, isLoadingMore, handlePageChange } =
    props;

  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState<'5Y' | '2Y' | '1Y' | '6M' | '1M'>('5Y');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const rangeFilters: Array<'5Y' | '2Y' | '1Y' | '6M' | '1M'> = ['5Y', '2Y', '1Y', '6M', '1M'];
  useEffect(() => {
    let successTimeout: ReturnType<typeof setTimeout> | null = null;
    let errorTimeout: ReturnType<typeof setTimeout> | null = null;
    if (showSuccessAlert) {
      successTimeout = setTimeout(
        () => setShowSuccessAlert(false),
        ALERT_AUTO_HIDE_MS
      );
    }
    if (showErrorAlert) {
      errorTimeout = setTimeout(
        () => setShowErrorAlert(false),
        ALERT_AUTO_HIDE_MS
      );
    }
    return (): void => {
      if (successTimeout !== null) clearTimeout(successTimeout);
      if (errorTimeout !== null) clearTimeout(errorTimeout);
    };
  }, [showSuccessAlert, showErrorAlert]);

  const handleSummaryReport = (): void => {
    setIsSummaryLoading(true);
    void getChronologySummaryReport({
      chronologyId,
      category: CHRONOLOGY_CATEGORY.MEDICAL,
    })
      .then(() => {
        setShowSuccessAlert(true);
      })
      .catch((error: unknown) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Failed to get summary report'
        );
        setShowErrorAlert(true);
      })
      .finally(() => {
        setIsSummaryLoading(false);
      });
  };

  // Load medical chronology timeline data for the matrix view
  const { data: timelineResponse, isLoading: isTimelineLoading } = useQuery<MedicalChronologyTimelineType>({
    queryKey: ['medical-chronology-timeline', chronologyId, selectedRange],
    queryFn: () =>
      getMedicalChronologyTimeline({
        chronologyId,
        filter: selectedRange,
      }),
  });

  const legendCounts = useMemo(() => {
    const counts = {
      emergency: 0,
      inpatient: 0,
      outpatient: 0,
      dateOfInjury: 0,
    };
    const timelineEvents = timelineResponse?.events ?? [];

    timelineEvents.forEach((event) => {
      const careSetting = mapCareSetting(event);
      counts[careSetting] += 1;
      if (mapToEventType(event).id === 'date_of_injury') {
        counts.dateOfInjury += 1;
      }
    });

    return counts;
  }, [timelineResponse?.events]);

  const legendItems = [
    {
      label: 'Emergency / Urgent Care',
      color: '#F97316',
      count: legendCounts.emergency,
    },
    { label: 'Inpatient', color: '#3B82F6', count: legendCounts.inpatient },
    {
      label: 'Outpatient / Ambulatory',
      color: '#22C55E',
      count: legendCounts.outpatient,
    },
  ];

  return (
    <Card>
      <CardContent>
        <ToastAlert
          placement="right"
          severity="success"
          showAlert={showSuccessAlert}
          onClose={() => setShowSuccessAlert(false)}
          message="Chronology Summary Report has been sent to your email successfully"
          icon={<CheckIcon weight="bold" />}
        />
        <ToastAlert
          placement="right"
          severity="error"
          showAlert={showErrorAlert}
          onClose={() => setShowErrorAlert(false)}
          message={errorMessage || 'Something went wrong!'}
          icon={<XCircleIcon weight="bold" />}
        />
        <Box
          sx={{
            gap: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
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
              variant="rounded"
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'success.lightest',
                '& svg': {
                  color: 'success.dark',
                },
              }}
            >
              <LineSegmentsIcon />
            </Avatar>
            <Typography fontWeight={600}>
              Medical Chronology - Events Timeline
            </Typography>
            <Tooltip title="This timeline displays key medical events chronologically, helping you visualize treatment and key case dates.">
              <InfoIcon size={20} />
            </Tooltip>
          </Box>
          <Button
            variant="contained"
            color="primary"
            size="medium"
            startIcon={<ExportIcon size={20} />}
            onClick={handleSummaryReport}
            disabled={isSummaryLoading}
          >
            {isSummaryLoading ? 'Loading...' : 'Export Chronology'}
          </Button>
        </Box>
        <Box
          sx={{
            mt: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box
            sx={{
              px: 1,
              height: 40,
              gap: 0.25,
              display: 'flex',
              alignItems: 'center',
              borderRadius: '10px',
              bgcolor: '#F3F4F6',
            }}
          >
            {rangeFilters.map((range) => {
              const isActive = selectedRange === range;
              return (
                <Button
                  key={range}
                  size="small"
                  variant="text"
                  disableRipple
                  onClick={() => setSelectedRange(range)}
                  sx={{
                    minWidth: 32,
                    height: 32,
                    px: 1.5,
                    py: 2,
                    lineHeight: 1,
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#111827' : '#6B7280',
                    bgcolor: isActive ? '#FFFFFF' : 'transparent',
                    border: isActive
                      ? '1px solid #E5E7EB'
                      : '1px solid transparent',
                    boxShadow: isActive
                      ? '0px 1px 2px rgba(16, 24, 40, 0.08)'
                      : 'none',
                    '&:hover': {
                      bgcolor: isActive ? '#FFFFFF' : 'transparent',
                    },
                  }}
                >
                  {range}
                </Button>
              );
            })}
          </Box>

          <Box sx={{ gap: 1.25, display: 'flex', alignItems: 'center' }}>
            {legendItems.map((item) => (
              <Box
                key={item.label}
                sx={{ gap: 1, display: 'flex', alignItems: 'center' }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: item.color,
                    flexShrink: 0,
                  }}
                />
                <Typography sx={{ fontSize: 12, color: '#4B5563' }}>
                  {item.label} ({item.count})
                </Typography>
              </Box>
            ))}
            <Box sx={{ gap: 0.5, display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 12,
                  height: 2,
                  bgcolor: '#D7263D',
                  flexShrink: 0,
                }}
              />
              <Typography sx={{ fontSize: 12, color: '#4B5563' }}>
                Date of Injury ({legendCounts.dateOfInjury})
              </Typography>
            </Box>
          </Box>
        </Box>
        {isTimelineLoading ? (
          <AppCustomLoader height={240} />
        ) : (
          <MedicalTimelineMatrix
            data={timelineResponse?.events ?? []}
            selectedRange={selectedRange}
          />
        )}
        <Box mt={2}>
          <EventTimeline data={data} chronologyId={chronologyId} />
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
        </Box>
      </CardContent>
    </Card>
  );
};

export default TimelineChart;
