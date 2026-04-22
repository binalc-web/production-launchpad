/* eslint-disable camelcase */
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  GlobalStyles,
  Grid,
  Menu,
  MenuItem,
  Select,
  Switch,
  Typography,
} from '@mui/material';
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';
import AppCustomLoader from '@/components/AppCustomLoader';
import {
  getAugmentedChronologyList,
  getMasterChronologyCaseDetails,
  getMasterChronologyReport,
  getMasterChronologyTimeline,
} from '@/api/chronologies/details';
import { formatPhoneNumber } from '@/utils/phoneUtilities';
import { GreyDot } from '@/pages/CaseManagement/components/view/PatientInfo';
import moment from 'moment';
import {
  CaretDownIcon,
  CheckIcon,
  ClockCounterClockwiseIcon,
  EnvelopeSimpleIcon,
  FloppyDiskIcon,
  InfoIcon,
  PencilIcon,
  XCircleIcon,
  XIcon,
} from '@phosphor-icons/react';
import type {
  ChronologyEntry,
  MasterChronologyYear,
} from '../types/MasterChronologyDetailsType';
import MasterChronologyTimelinePanel from './MasterChronologyTimelinePanel';
import MasterChronologyEventDetail from './MasterChronologyEventDetail';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { datepickerStyles } from '@/components/ReactDatepicker/styles';
import ToastAlert from '@/components/ToastAlert';
import {
  CHRONOLOGY_CATEGORY,
  type VersionStatus,
} from '@/api/chronologies/constants';
import { useMasterChronologyEdit } from '@/hooks/useMasterChronologyEdit';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { PopUp } from '@/components/Popup';

/**
 * Converts a snake_case string to Title Case.
 * e.g. "medical_malpractice" → "Medical Malpractice"
 */
const formatCaseType = (caseType: string): string =>
  caseType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

interface SelectedEvent {
  entry: ChronologyEntry;
  date: string;
  year: number;
  month: string;
}

const PAGE_SIZE = 10;

type TimelineStatusFilter = 'ALL' | ChronologyEntry['status'];

const STATUS_FILTER_LABELS: Record<TimelineStatusFilter, string> = {
  ALL: 'All Events',
  matched: 'Completed',
  missing_billing: 'Medical Only',
  missing_medical: 'Billing Only',
};

const STATUS_FILTER_OPTIONS: Array<TimelineStatusFilter> = [
  'ALL',
  'matched',
  'missing_billing',
  'missing_medical',
];

const MasterChronologyDetail: FC = () => {
  const { id } = useParams({
    from: '/_app/master-chronology/timeline/$id',
  });

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [statusFilter, setStatusFilter] = useState<TimelineStatusFilter>('ALL');
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [page, setPage] = useState(1);

  // ── Selected event (right panel) ─────────────────────────────────────────────
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(
    null
  );

  // ── Accumulated timeline data across pages ────────────────────────────────────
  const [accumulatedData, setAccumulatedData] = useState<
    Array<MasterChronologyYear>
  >([]);

  // ── All flat events (for edit hook) ──────────────────────────────────────────
  const allFlatEvents = useMemo(
    () =>
      accumulatedData.flatMap((year) =>
        year.months.flatMap((month) =>
          month.dates.flatMap((dateGroup) => dateGroup.chronologies)
        )
      ),
    [accumulatedData]
  );

  // ── Versioning ────────────────────────────────────────────────────────────────
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(
    undefined
  );
  const [showChanges, setShowChanges] = useState<boolean>(false);
  const [showCancelConfirmation, setShowCancelConfirmation] =
    useState<boolean>(false);

  // Toast state
  const [uiStatus, setUiStatus] = useState<{
    showAlert: boolean;
    alertType: 'success' | 'error';
    message: string;
  }>({
    showAlert: false,
    alertType: 'success',
    message: '',
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (uiStatus.showAlert) {
      timer = setTimeout(() => {
        setUiStatus({
          showAlert: false,
          alertType: 'success',
          message: '',
        });
      }, 3000);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    return () => clearTimeout(timer);
  }, [uiStatus.showAlert]);

  // ── Versions query ────────────────────────────────────────────────────────────
  const { data: versionsData, isLoading: isLoadingVersions } = useQuery({
    queryKey: ['augmented-versions', id, CHRONOLOGY_CATEGORY.MASTER],
    queryFn: () =>
      getAugmentedChronologyList({
        chronologyId: id,
        category: CHRONOLOGY_CATEGORY.MASTER,
      }),
  });

  useEffect(() => {
    if (versionsData) {
      setSelectedVersion(versionsData.length > 0 ? versionsData[0].version : 0);
    }
  }, [versionsData]);

  const versionStatus: VersionStatus =
    selectedVersion === versionsData?.[0]?.version
      ? 'latest'
      : selectedVersion === 0
        ? 'original'
        : 'older';

  const selectedVersionCreatedAt = versionsData?.find(
    (v) => v.version === selectedVersion
  )?.createdAt;

  const handleVersionChange = (event_: {
    target: { value: unknown };
  }): void => {
    setAccumulatedData([]);
    setPage(1);
    setSelectedEvent(null);
    setShowChanges(false);
    setSelectedVersion(event_.target.value as number);
  };

  // ── Edit mode ─────────────────────────────────────────────────────────────────
  const {
    isEditMode,
    editedSummaries,
    isSaving,
    editError,
    hasUnsavedChanges,
    handleEditToggle,
    handleCancelEdit,
    handleSummaryChange,
    handleSaveEdits,
    clearEditError,
    canEdit,
  } = useMasterChronologyEdit({
    chronologyId: id,
    allEvents: allFlatEvents,
    invalidationKeys: [['augmented-versions', id, CHRONOLOGY_CATEGORY.MASTER]],
    onSaveSuccess: () => {
      setAccumulatedData([]);
      setPage(1);
      setSelectedEvent(null);
      setSelectedVersion(undefined);
      setUiStatus((previous) => ({
        ...previous,
        showAlert: true,
        alertType: 'success',
        message: 'New chronology version saved successfully',
      }));
    },
  });

  const handleCancelWithConfirmation = (): void => {
    if (hasUnsavedChanges) {
      setShowCancelConfirmation(true);
    } else {
      handleCancelEdit();
    }
  };

  // Surface hook edit errors
  useEffect(() => {
    if (editError) {
      setUiStatus((previous) => ({
        ...previous,
        message: editError,
        showAlert: true,
        alertType: 'error',
      }));
      clearEditError();
    }
  }, [editError, clearEditError]);

  // ── Navigation Guard ──────────────────────────────────────────────────────────
  const {
    status: blockerStatus,
    proceed: blockerProceed,
    reset: blockerReset,
  } = useNavigationGuard({ shouldBlock: hasUnsavedChanges });

  const [startDate, endDate] = dateRange;

  const [isEmailSending, setIsEmailSending] = useState(false);

  const handleEmailChronology = useCallback(async (): Promise<void> => {
    if (!id) return;
    setIsEmailSending(true);
    try {
      const hasRange = Boolean(startDate && endDate);
      const startDateStringForEmail = hasRange
        ? moment(startDate as Date).format('YYYY-MM-DD')
        : undefined;
      const endDateStringForEmail = hasRange
        ? moment(endDate as Date).format('YYYY-MM-DD')
        : undefined;

      await getMasterChronologyReport({
        chronologyId: id,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        startDate: startDateStringForEmail,
        endDate: endDateStringForEmail,
        version: selectedVersion,
      });

      setUiStatus((previous) => ({
        ...previous,
        showAlert: true,
        alertType: 'success',
        message: 'Master chronology has been sent to your email.',
      }));
    } catch (error) {
      setUiStatus((previous) => ({
        ...previous,
        showAlert: true,
        alertType: 'error',
        message:
          (error as Error)?.message ?? 'Failed to send chronology email.',
      }));
    } finally {
      setIsEmailSending(false);
    }
  }, [endDate, id, startDate, statusFilter, selectedVersion]);

  // ── API: case details (patient info) ─────────────────────────────────────────
  const {
    data: caseData,
    isLoading: isCaseLoading,
    isError: isCaseError,
    error: caseError,
  } = useQuery({
    queryKey: ['master-chronology-case-details', id],
    queryFn: () => getMasterChronologyCaseDetails({ id }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const details = caseData?.chronologies?.[0];

  // ── API: timeline ─────────────────────────────────────────────────────────────
  const hasCompleteRange = Boolean(startDate && endDate);

  const startDateString = hasCompleteRange
    ? moment(startDate as Date).format('YYYY-MM-DD')
    : undefined;

  const endDateString = hasCompleteRange
    ? moment(endDate as Date).format('YYYY-MM-DD')
    : undefined;

  const statusParameter = statusFilter === 'ALL' ? undefined : statusFilter;

  const timelineQueryKey = useMemo(
    () => [
      'master-chronology-timeline',
      id,
      statusParameter ?? null,
      startDateString ?? null,
      endDateString ?? null,
      page,
      selectedVersion ?? null,
    ],
    [endDateString, id, page, startDateString, statusParameter, selectedVersion]
  );

  const {
    data: timelineData,
    isLoading: isTimelineLoading,
    isFetching: isTimelineFetching,
  } = useQuery({
    queryKey: timelineQueryKey,
    enabled: !!id && selectedVersion !== undefined,
    queryFn: async () => {
      const parameters: {
        chronologyId: string;
        page: number;
        limit: number;
        status?: string;
        startDate?: string;
        endDate?: string;
        version?: number;
        includePreviousSummary?: 'true' | 'false';
      } = {
        chronologyId: id,
        page,
        limit: PAGE_SIZE,
        version: selectedVersion,
        includePreviousSummary: 'true' as const,
      };

      if (statusParameter) parameters.status = statusParameter;
      if (startDateString) parameters.startDate = startDateString;
      if (endDateString) parameters.endDate = endDateString;

      const result = await getMasterChronologyTimeline(parameters);

      setAccumulatedData((previous) => {
        if (page === 1) return result.masterChronologies;

        const merged = [...previous];
        for (const newYear of result.masterChronologies) {
          const existingYear = merged.find((y) => y.year === newYear.year);
          if (!existingYear) {
            merged.push(newYear);
          } else {
            for (const newMonth of newYear.months) {
              const existingMonth = existingYear.months.find(
                (m) => m.month === newMonth.month
              );
              if (!existingMonth) {
                existingYear.months.push(newMonth);
              } else {
                for (const newDate of newMonth.dates) {
                  const exists = existingMonth.dates.some(
                    (d) => d.date === newDate.date
                  );
                  if (!exists) existingMonth.dates.push(newDate);
                }
              }
            }
          }
        }
        return merged;
      });

      return result;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const hasNextPage = timelineData?.pagination?.hasNextPage ?? false;

  // Default: select the first event when timeline data first loads
  useEffect(() => {
    if (selectedEvent !== null || accumulatedData.length === 0) return;
    for (const yearGroup of accumulatedData) {
      for (const monthGroup of yearGroup.months) {
        for (const dateGroup of monthGroup.dates) {
          if (dateGroup.chronologies?.length > 0) {
            setSelectedEvent({
              entry: dateGroup.chronologies[0],
              date: dateGroup.date,
              year: yearGroup.year,
              month: monthGroup.month,
            });
            return;
          }
        }
      }
    }
  }, [accumulatedData, selectedEvent]);

  // Reset accumulated data and page when date range changes
  const handleDateRangeChange = useCallback(
    (nextDates: [Date | null, Date | null] | null) => {
      const normalized: [Date | null, Date | null] =
        Array.isArray(nextDates) && nextDates.length >= 1
          ? [nextDates[0] ?? null, nextDates[1] ?? null]
          : [null, null];
      setDateRange(normalized);

      const [nextStart, nextEnd] = normalized;
      const hasRange = Boolean(nextStart && nextEnd);
      const isCleared = !nextStart && !nextEnd;

      if (hasRange || isCleared) {
        setAccumulatedData([]);
        setPage(1);
        setSelectedEvent(null);
      }
    },
    []
  );

  const handleLoadMore = (): void => {
    setPage((p) => p + 1);
  };

  const masterChronologyName = timelineData?.name ?? 'Master Chronology';

  const breadcrumbItems: Array<BreadcrumbItem> = [
    {
      title: 'Master Chronology',
      url: '/master-chronology',
    },
    {
      title: masterChronologyName,
    },
  ];

  return (
    <>
      <GlobalStyles
        styles={{
          '.master-chronology-datepicker-popper': {
            maxWidth: 'min(400px, calc(100vw - 24px))',
            zIndex: 1300,
          },
          '.master-chronology-datepicker-popper .react-datepicker': {
            width: '100%',
            maxWidth: '100%',
          },
        }}
      />

      {/* ── Toasts ── */}
      <ToastAlert
        placement="right"
        severity={uiStatus.alertType}
        showAlert={uiStatus.showAlert}
        onClose={() =>
          setUiStatus((previous) => ({ ...previous, showAlert: false }))
        }
        message={uiStatus.message}
        icon={
          uiStatus.alertType === 'success' ? (
            <CheckIcon weight="bold" />
          ) : (
            <XCircleIcon weight="bold" />
          )
        }
      />

      <Box mb={3}>
        <Breadcrumbs items={breadcrumbItems} />

        <Box
          sx={{
            mt: 1.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h4">{masterChronologyName}</Typography>

          <Button
            variant="outlined"
            sx={{
              background: 'white',
              color: 'black',
              fontWeight: 600,
              fontSize: 16,
            }}
            startIcon={<EnvelopeSimpleIcon />}
            size="small"
            onClick={handleEmailChronology}
            disabled={isEmailSending || isEditMode}
          >
            {isEmailSending ? 'Sending...' : 'Email chronology'}
          </Button>
        </Box>
      </Box>

      {/* ── Patient Info Card ── */}
      <Card sx={{ mt: 1 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          {isCaseLoading ? (
            <AppCustomLoader height={120} />
          ) : isCaseError ? (
            <Typography variant="h6" color="error" textAlign="center">
              {caseError?.message ?? 'Failed to load case details.'}
            </Typography>
          ) : details ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              {/* ── Patient info ── */}
              <Box
                sx={{
                  gap: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Avatar
                  src={
                    details.patient?.avatar
                      ? `${import.meta.env.VITE_AVATAR_CLOUD_FRONT_DISTRIBUTION}${details.patient.avatar}`
                      : undefined
                  }
                  sx={{ width: 48, height: 48 }}
                >
                  {details.patient?.firstName && details.patient?.lastName
                    ? `${details.patient.firstName.charAt(0).toUpperCase()}${details.patient.lastName.charAt(0).toUpperCase()}`
                    : 'NA'}
                </Avatar>

                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, fontSize: 15 }}
                  >
                    {details.patient?.firstName && details.patient?.lastName
                      ? `${details.patient.firstName} ${details.patient.lastName}`
                      : 'NA'}
                  </Typography>

                  <Box
                    sx={{
                      mt: 0.5,
                      gap: 1,
                      display: 'flex',
                      alignItems: 'center',
                      '& .MuiTypography-link': { color: 'info.dark' },
                    }}
                  >
                    <Typography
                      variant="link"
                      component="a"
                      href={`mailto:${details.patient?.email}`}
                      sx={{ fontSize: 13 }}
                    >
                      {details.patient?.email || 'NA'}
                    </Typography>
                    {GreyDot}
                    <Typography
                      variant="link"
                      component="a"
                      href={`tel:${details.patient?.contact}`}
                      sx={{ fontSize: 13 }}
                    >
                      {details.patient?.contact
                        ? formatPhoneNumber(details.patient.contact)
                        : 'NA'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider flexItem orientation="vertical" sx={{ mx: 1 }} />

              {/* ── Case ID & Type ── */}
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                gap={0.75}
                sx={{ flexShrink: 0 }}
              >
                <Typography component="span" sx={{ fontSize: 14 }}>
                  <Typography
                    component="span"
                    sx={{ fontSize: 14, fontWeight: 500 }}
                  >
                    Case ID:{' '}
                  </Typography>
                  {details.case?.caseId ?? 'NA'}
                </Typography>
                <Typography component="span" sx={{ fontSize: 14 }}>
                  <Typography
                    component="span"
                    sx={{ fontSize: 14, fontWeight: 500 }}
                  >
                    Case Type:{' '}
                  </Typography>
                  {details.case?.caseType
                    ? formatCaseType(details.case.caseType)
                    : 'NA'}
                </Typography>
              </Box>

              <Divider flexItem orientation="vertical" sx={{ mx: 1 }} />

              {/* ── Chronology Generated Date ── */}
              <Typography
                component="span"
                sx={{ fontSize: 14, alignSelf: 'flex-start' }}
              >
                <Typography
                  component="span"
                  sx={{ fontSize: 14, fontWeight: 500 }}
                >
                  Chronology Generated Date:{' '}
                </Typography>
                {details.createdAt
                  ? moment(details.createdAt, 'MM-DD-YYYY, hh:mm A').format(
                      'MM-DD-YYYY'
                    )
                  : 'NA'}
              </Typography>
            </Box>
          ) : (
            <Typography variant="h6" textAlign="center">
              No Data Found!
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* ── Timeline Split Panel ── */}
      <Box sx={{ mt: 2 }}>
        {page === 1 && (isTimelineLoading || isTimelineFetching) ? (
          <AppCustomLoader height={200} />
        ) : (
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              bgcolor: 'common.white',
              overflow: 'hidden',
            }}
          >
            {/* ── Header bar: Events label + version selector + Edit button ── */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography fontWeight={600} fontSize={15}>
                  Master Chronology Events
                </Typography>

                {/* Version selector (dropdown) */}
                {!isLoadingVersions && (
                  <Select
                    value={selectedVersion ?? ''}
                    onChange={handleVersionChange}
                    size="small"
                    disabled={isLoadingVersions || isEditMode}
                    renderValue={(value) => {
                      if (value === 0 || value === '') {
                        return (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.75,
                            }}
                          >
                            <ClockCounterClockwiseIcon size={15} />
                            <Typography fontSize={13}>
                              AI Generated (Original)
                            </Typography>
                          </Box>
                        );
                      }
                      const found = versionsData?.find(
                        (v) => v.version === value
                      );
                      return (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                          }}
                        >
                          <ClockCounterClockwiseIcon size={15} />
                          <Typography fontSize={13}>
                            {found
                              ? moment(found.createdAt).format(
                                  'DD MMM YYYY • h:mm A'
                                )
                              : String(value)}
                          </Typography>
                        </Box>
                      );
                    }}
                    sx={{
                      minWidth: 220,
                      '& .MuiSelect-select': { py: 0.75, px: 1.25 },
                    }}
                  >
                    {versionsData?.map((version) => (
                      <MenuItem key={version.versionId} value={version.version}>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <ClockCounterClockwiseIcon size={15} />
                          {moment(version.createdAt).format(
                            'DD MMM YYYY • h:mm A'
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                    <Divider />
                    <MenuItem value={0} key="original-version">
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <ClockCounterClockwiseIcon size={15} />
                        AI Generated (Original)
                      </Box>
                    </MenuItem>
                  </Select>
                )}
              </Box>

              {/* Edit / Cancel + Save buttons */}
              {isEditMode ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<XIcon />}
                    onClick={handleCancelWithConfirmation}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    sx={{
                      bgcolor: '#17C3B2',
                      '&:hover': { bgcolor: '#14b0a0' },
                    }}
                    startIcon={<FloppyDiskIcon />}
                    onClick={() => void handleSaveEdits()}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save As New Version'}
                  </Button>
                </Box>
              ) : (
                canEdit && (
                  <Button
                    variant="contained"
                    sx={{ bgcolor: '#17C3B2', '&:hover': { bgcolor: '#14b0a0' } }}
                    startIcon={<PencilIcon />}
                    disabled={
                      versionStatus === 'older' ||
                      (versionStatus === 'original' &&
                        (versionsData?.length ?? 0) > 0)
                    }
                    onClick={handleEditToggle}
                  >
                    Edit Chronology
                  </Button>
                )
              )}
            </Box>

            <Grid container spacing={0} sx={{ alignItems: 'stretch' }}>
              {/* Left: Date range + timeline (Year → Month → Day) */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box
                  sx={{
                    borderRight: { md: '1px solid' },
                    borderColor: '#E5E7EB !important',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: 'calc(100vh - 22rem)',
                  }}
                >
                  {/* Date range + status filter */}
                  <Box
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1.5,
                        alignItems: 'center',
                      }}
                    >
                      <Box
                        sx={{
                          flex: 1,
                          ...datepickerStyles,
                          '& .react-datepicker__calendar-icon': {
                            top: '50%',
                            transform: 'translateY(-50%)',
                            right: 8,
                            left: 'auto',
                            height: 24,
                            width: 24,
                            pointerEvents: 'auto',
                          },
                          '& input': {
                            height: 40,
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: startDate ? 'primary.main' : 'divider',
                            paddingLeft: '36px',
                            paddingRight: '40px !important',
                            fontSize: 14,
                            fontWeight: 400,
                            bgcolor: 'background.paper',
                            cursor: 'pointer',
                            outline: 'none',
                            boxSizing: 'border-box',
                          },
                          '& .react-datepicker-wrapper': {
                            display: 'block',
                            width: '100%',
                            boxSizing: 'border-box',
                          },
                        }}
                      >
                        <DatePicker
                          selectsRange
                          showIcon
                          icon={
                            startDate || endDate ? (
                              <XIcon
                                size={26}
                                style={{ paddingRight: 8, cursor: 'pointer' }}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleDateRangeChange([null, null]);
                                }}
                              />
                            ) : (
                              <CaretDownIcon
                                size={30}
                                style={{ paddingRight: 8 }}
                              />
                            )
                          }
                          startDate={startDate}
                          endDate={endDate}
                          onChange={(dates) => {
                            handleDateRangeChange(
                              Array.isArray(dates) ? dates : null
                            );
                          }}
                          minDate={
                            new Date(new Date().getFullYear() - 100, 0, 1)
                          }
                          maxDate={new Date()}
                          showYearDropdown
                          scrollableYearDropdown
                          yearDropdownItemNumber={100}
                          showMonthDropdown
                          monthsShown={1}
                          dateFormat="MM/dd/yyyy"
                          placeholderText="Start Date – End Date"
                          isClearable={false}
                          popperPlacement="bottom-start"
                          popperClassName="master-chronology-datepicker-popper"
                          disabled={isEditMode}
                        />
                      </Box>

                      <Box>
                        <Button
                          variant="outlined"
                          size="medium"
                          endIcon={<CaretDownIcon size={14} />}
                          onClick={(event) =>
                            setStatusMenuAnchor(event.currentTarget)
                          }
                          disabled={isEditMode}
                          sx={{
                            borderColor:
                              statusFilter === 'ALL'
                                ? 'divider'
                                : 'primary.main',
                            color:
                              statusFilter === 'ALL'
                                ? 'text.secondary'
                                : 'primary.main',
                            textTransform: 'none',
                            height: 40,
                            minWidth: 140,
                            fontWeight: 400,
                            bgcolor: 'background.paper',
                          }}
                        >
                          {STATUS_FILTER_LABELS[statusFilter]}
                        </Button>
                        <Menu
                          anchorEl={statusMenuAnchor}
                          open={Boolean(statusMenuAnchor)}
                          onClose={() => setStatusMenuAnchor(null)}
                          PaperProps={{
                            sx: { borderRadius: 2, minWidth: 180, mt: 0.5 },
                          }}
                        >
                          {STATUS_FILTER_OPTIONS.map((value) => (
                            <MenuItem
                              key={value}
                              selected={statusFilter === value}
                              onClick={() => {
                                setStatusFilter(value);
                                setAccumulatedData([]);
                                setPage(1);
                                setSelectedEvent(null);
                                setStatusMenuAnchor(null);
                              }}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {STATUS_FILTER_LABELS[value]}
                              </Typography>
                            </MenuItem>
                          ))}
                        </Menu>
                      </Box>
                    </Box>
                  </Box>

                  {/* Show changes toggle row */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 2,
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      flexShrink: 0,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Switch
                        checked={showChanges}
                        onChange={(event) =>
                          setShowChanges(event.target.checked)
                        }
                        disabled={isEditMode || versionStatus === 'original'}
                        size="small"
                      />
                      <Typography fontSize={14}>Show Changes</Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                      }}
                    >
                      <InfoIcon size={15} color="#677284" />
                      <Typography fontSize={13} color="text.secondary">
                        {`Viewing ${versionStatus === 'latest' ? 'Latest' : versionStatus === 'original' ? 'Original' : 'Older'} version`}
                      </Typography>
                    </Box>
                  </Box>

                  {isTimelineFetching && page === 1 ? (
                    <AppCustomLoader height={200} />
                  ) : accumulatedData.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', flex: 1 }}>
                      <Typography color="text.secondary">
                        No events found.
                      </Typography>
                    </Box>
                  ) : (
                    <MasterChronologyTimelinePanel
                      data={accumulatedData}
                      selectedEvent={selectedEvent}
                      onSelectEvent={setSelectedEvent}
                      hasNextPage={hasNextPage}
                      isLoadingMore={isTimelineFetching && page > 1}
                      onLoadMore={handleLoadMore}
                      embedded
                      isEditMode={isEditMode}
                      editedSummaries={editedSummaries}
                      onSummaryChange={handleSummaryChange}
                      showChanges={showChanges}
                      versionStatus={versionStatus}
                      versionCreatedAt={selectedVersionCreatedAt}
                    />
                  )}
                </Box>
              </Grid>

              {/* Right: Event Detail */}
              <Grid size={{ xs: 12, md: 8 }} sx={{ p: 2 }}>
                {selectedEvent ? (
                  <MasterChronologyEventDetail
                    entry={selectedEvent.entry}
                    date={selectedEvent.date}
                    files={timelineData?.files}
                  />
                ) : (
                  <Box
                    sx={{
                      p: 6,
                      textAlign: 'center',
                      minHeight: 300,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography color="text.secondary" fontSize={14}>
                      Select an event from the timeline to view details.
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>

      {/* Navigation blocker popup */}
      {blockerStatus === 'blocked' && (
        <PopUp
          type="UNSAVED_CHANGES"
          title={<Typography variant="h2">Discard unsaved changes?</Typography>}
          buttonText="Continue editing"
          isOpen={blockerStatus === 'blocked'}
          description="You have unsaved edits in the chronology summaries. If you leave now, all changes will be lost."
          onClick={() => {
            blockerReset();
          }}
          onCancel={() => {
            blockerProceed();
          }}
          cancelText="Discard changes"
        />
      )}
      {showCancelConfirmation && (
        <PopUp
          type="UNSAVED_CHANGES"
          title={<Typography variant="h2">Discard unsaved changes?</Typography>}
          buttonText="Continue editing"
          isOpen={showCancelConfirmation}
          description="You have unsaved edits in the chronology summaries. If you leave now, all changes will be lost."
          onClick={() => {
            setShowCancelConfirmation(false);
          }}
          onCancel={() => {
            handleCancelEdit();
            setShowCancelConfirmation(false);
          }}
          cancelText="Discard changes"
        />
      )}
    </>
  );
};

export default MasterChronologyDetail;
