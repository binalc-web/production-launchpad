/**
 * @module BillingChronology
 * @fileoverview Provides the detailed view of billing events for a specific timeline entry.
 * This component displays billing chronology event documents in a file viewer with navigation.
 */

import {
  Box,
  Button,
  Divider,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import {
  ArrowLeftIcon,
  CheckIcon,
  ClockCounterClockwiseIcon,
  ExportIcon,
  FloppyDiskIcon,
  PencilIcon,
  XCircleIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useParams, useRouter } from '@tanstack/react-router';
import { type FC, useEffect, useState } from 'react';
import FileViewer from '../../../components/FileViewer';

import {
  CHRONOLOGY_CATEGORY,
  type VersionStatus,
} from '@/api/chronologies/constants';
import {
  getAugmentedChronologyDetails,
  getAugmentedChronologyList,
} from '@/api/chronologies/details';
import { getChronologySummaryReport } from '@/api/chronologies/export';
import { useQuery } from '@tanstack/react-query';
import Breadcrumbs, {
  type BreadcrumbItem,
} from '../../../components/Breadcrumbs';
import BillingSummaryFormat from './BillingSummaryFormat';

import type { AddCaseDataType } from '@/api/caseManagement/addCase';
import AppCustomLoader from '@/components/AppCustomLoader';
import { PopUp } from '@/components/Popup';
import ToastAlert from '@/components/ToastAlert';
import { useChronologyEdit } from '@/hooks/useChronologyEdit';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import type { ChronologyType } from '@/pages/BillingChronology/types/BillingChronologyDetailsType';
import { extractErrorMessage } from '@/utils/chronologyEditPayload';
import moment from 'moment';
import EventTimelineAccordion from './EventTimelineAccordion';

const ITEMS_PER_PAGE = 5;

/**
 * EventTimelineDetail component that displays billing chronology events
 * @returns A component displaying a file viewer with billing chronology documents
 */
const EventTimelineDetail: FC = () => {
  const router = useRouter();
  const parameters = useParams({
    from: '/_app/billing-chronology/billing-event/$chronologyID/$id',
  });

  const breadcrumbItems: Array<BreadcrumbItem> = [
    {
      title: 'Billing Chronology',
      url: '/billing-chronology',
    },
    {
      title: 'Billing Timeline',
      url: `/billing-chronology/timeline/${parameters.chronologyID}`,
    },
    {
      title: 'Billing Events',
    },
  ];

  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(
    undefined
  );
  const [uiStatus, setUiStatus] = useState<{
    isSummaryLoading: boolean;
    showAlert: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    isSummaryLoading: false,
    showAlert: false,
    type: 'success',
    message: '',
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (uiStatus.showAlert) {
      timer = setTimeout(() => {
        setUiStatus((previous) => ({
          ...previous,
          showAlert: false,
          message: '',
        }));
      }, 3000);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    return () => {
      clearTimeout(timer);
    };
  }, [uiStatus.showAlert]);

  const [showCancelConfirmation, setShowCancelConfirmation] =
    useState<boolean>(false);

  // Versions query
  const { data: versionsData, isLoading: isLoadingVersions } = useQuery({
    queryKey: [
      'augmented-versions',
      parameters.chronologyID,
      'Billing Chronology',
    ],
    queryFn: () =>
      getAugmentedChronologyList({
        chronologyId: parameters.chronologyID,
        category: CHRONOLOGY_CATEGORY.BILLING,
      }),
  });

  useEffect(() => {
    if (versionsData) {
      setSelectedVersion(versionsData.length > 0 ? versionsData[0].version : 0);
    }
  }, [versionsData]);

  /**
   * Determines the status of the selected version.
   * @param selectedVersion The selected version number.
   * @param versionsData The list of available versions.
   * @returns The status of the selected version ('latest', 'original', or 'older').
   */
  const versionStatus: VersionStatus =
    selectedVersion === versionsData?.[0]?.version
      ? 'latest'
      : selectedVersion === 0
        ? 'original'
        : 'older';

  const selectedVersionCreatedAt = versionsData?.find(
    (v) => v.version === selectedVersion
  )?.createdAt;

  // Initial data load query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      'billing-chronology-details-initial',
      parameters.chronologyID,
      selectedVersion,
    ],
    queryFn: () =>
      getAugmentedChronologyDetails({
        chronologyId: parameters.chronologyID,
        category: CHRONOLOGY_CATEGORY.BILLING,
        version: selectedVersion,
        page: 1,
        limit: ITEMS_PER_PAGE,
        includePreviousSummary: 'true',
      }),
    enabled: selectedVersion !== undefined,
  });

  const [allEvents, setAllEvents] = useState<Array<ChronologyType>>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const hasFile = allEvents?.find((item) => item._id === parameters?.id);
  const [selectedFile, setSelectedFile] = useState<
    AddCaseDataType['files'][0] | null
  >(
    parameters.id && hasFile?.file?._id
      ? {
          id: hasFile.file._id,
          fileName: hasFile.title,
          name: hasFile.title,
          location: hasFile.location,
          newFileName: hasFile.title,
          key: hasFile.file._id,
          mimeType: 'application/pdf',
          createdAt: hasFile.date,
          fileSize: 0,
          documentProcessStages: '',
        }
      : null
  );

  // ── Edit mode (via reusable hook) ──────────────────────────────────────
  const {
    isEditMode,
    editedSummaries,
    isSaving,
    editError,
    hasValidationErrors,
    handleEditToggle,
    handleCancelEdit,
    handleSummaryChange,
    handleSaveEdits,
    clearEditError,
    hasUnsavedChanges,
    canEdit,
  } = useChronologyEdit({
    chronologyId: parameters.chronologyID,
    category: CHRONOLOGY_CATEGORY.BILLING,
    allEvents,
    invalidationKeys: [
      ['augmented-versions', parameters.chronologyID, 'Billing Chronology'],
    ],
    onSaveSuccess: () => {
      setSelectedVersion(undefined); // Let it re-derive from fresh versions list
      setAllEvents([]);
      setSelectedFile(null);
      setUiStatus((previous) => ({
        ...previous,
        showAlert: true,
        type: 'success',
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

  // ── Navigation Guard ──────────────────────────────────────────────────
  const {
    status: blockerStatus,
    proceed: blockerProceed,
    reset: blockerReset,
  } = useNavigationGuard({
    shouldBlock: hasUnsavedChanges,
  });

  // Surface hook edit errors via the shared alert system
  useEffect(() => {
    if (editError) {
      setUiStatus((previous) => ({
        ...previous,
        showAlert: true,
        type: 'error',
        message: editError,
      }));
      clearEditError();
    }
  }, [editError, clearEditError]);

  // Load more data query (separate from initial load)
  const loadMoreEvents = async (pageNumber: number): Promise<void> => {
    try {
      setIsLoadingMore(true);
      const moreData = await getAugmentedChronologyDetails({
        chronologyId: parameters.chronologyID,
        category: CHRONOLOGY_CATEGORY.BILLING,
        version: selectedVersion,
        page: pageNumber,
        limit: ITEMS_PER_PAGE,
        includePreviousSummary: 'true',
      });

      if (moreData?.chronologies?.length) {
        // Append new events to existing list
        setAllEvents((previousEvents) => [
          ...previousEvents,
          ...(moreData.chronologies as Array<ChronologyType>),
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
    if (data?.chronologies && !isLoading) {
      if (data.page === 1 || allEvents.length === 0) {
        setAllEvents(data.chronologies as Array<ChronologyType>);
        setHasMore(data.chronologies.length >= ITEMS_PER_PAGE);
      }

      // Auto-select the file for viewer when data loads if we have a matching document
      if (!selectedFile) {
        const events = data.chronologies as Array<ChronologyType>;
        const matchedFile = events.find((item) => item._id === parameters?.id);
        const targetFile = matchedFile ?? events[0];
        if (targetFile?.file?._id) {
          setSelectedFile({
            id: targetFile.file._id,
            fileName: `${moment(targetFile.date).format('MM-DD-YYYY')} (${targetFile.title})`,
            name: targetFile.title,
            location: targetFile.location,
            newFileName: moment(targetFile.date).format('MM-DD-YYYY'),
            key: targetFile.file._id,
            mimeType: 'application/pdf',
            createdAt: targetFile.date,
            fileSize: 0,
            documentProcessStages: '',
          });
        }
      }
    }
  }, [data, isLoading, allEvents.length, selectedFile, parameters?.id]);

  const handleVersionChange = (event_: {
    target: { value: unknown };
  }): void => {
    setAllEvents([]); // Reset events
    setSelectedVersion(event_.target.value as number);
  };

  const handlePageChange = (): void => {
    const nextPage = Math.ceil(allEvents.length / ITEMS_PER_PAGE) + 1;
    void loadMoreEvents(nextPage);
  };

  const handleSummaryReport = (): void => {
    setUiStatus((previous) => ({ ...previous, isSummaryLoading: true }));
    void getChronologySummaryReport({
      chronologyId: parameters.chronologyID,
      category: CHRONOLOGY_CATEGORY.BILLING,
      version: selectedVersion,
    })
      .then(() => {
        setUiStatus((previous) => ({
          ...previous,
          showAlert: true,
          type: 'success',
          message:
            'Chronology Summary Report has been sent to your email successfully.',
        }));
      })
      .catch((reportError: unknown) => {
        setUiStatus((previous) => ({
          ...previous,
          showAlert: true,
          type: 'error',
          message: extractErrorMessage(
            reportError,
            'Failed to get summary report'
          ),
        }));
      })
      .finally(() => {
        setUiStatus((previous) => ({ ...previous, isSummaryLoading: false }));
      });
  };

  return (
    <Box>
      <ToastAlert
        placement="right"
        severity={uiStatus.type}
        showAlert={uiStatus.showAlert}
        onClose={() =>
          setUiStatus({
            showAlert: false,
            isSummaryLoading: false,
            message: '',
            type: 'success',
          })
        }
        message={uiStatus.message}
        icon={
          uiStatus.type === 'success' ? (
            <CheckIcon weight="bold" />
          ) : (
            <XCircleIcon weight="bold" />
          )
        }
      />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Breadcrumbs items={breadcrumbItems} />
        <Button
          variant="contained"
          color="primary"
          size="medium"
          startIcon={<ExportIcon size={20} />}
          onClick={handleSummaryReport}
          disabled={uiStatus.isSummaryLoading || isEditMode}
          sx={{ flexShrink: 0 }}
        >
          {uiStatus.isSummaryLoading ? 'Loading...' : 'Export Chronology'}
        </Button>
      </Box>

      <Box mt={3}>
        {isLoading || isLoadingVersions || selectedVersion === undefined ? (
          <AppCustomLoader height={200} />
        ) : isError ? (
          <Typography variant="h6" color="error" textAlign="center">
            {error?.message}
          </Typography>
        ) : data && data?.chronologies?.length > 0 ? (
          <FileViewer
            open
            renderAsCard
            setOpen={() => {}}
            showDummyFile
            files={allEvents.map((item) => ({
              id: item?.file?._id || item._id, // fallback to avoid crash if no file
              fileName: `${moment(item.date).format('MM-DD-YYYY')} (${item?.title})`,
              name: item.title,
              location: item.location,
              newFileName: moment(item.date).format('MM-DD-YYYY'),
              key: item?.file?._id || item._id,
              mimeType: 'application/pdf',
              createdAt: item.date,
              fileSize: 0,
              documentProcessStages: '',
            }))}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            customHeader={
              <Box
                sx={{
                  p: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'common.white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box
                  sx={{
                    gap: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Button
                    variant="tertiary"
                    onClick={() => router.history.back()}
                    startIcon={<ArrowLeftIcon size={16} />}
                    disabled={isEditMode}
                  >
                    Back To Billing
                  </Button>
                  <Typography variant="h5">
                    Billing Chronology Events
                  </Typography>
                  <Select
                    value={selectedVersion}
                    onChange={handleVersionChange}
                    sx={{ minWidth: 200 }}
                    disabled={isLoadingVersions || isEditMode}
                  >
                    {versionsData?.map((version) => (
                      <MenuItem key={version.versionId} value={version.version}>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <ClockCounterClockwiseIcon />
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
                        <ClockCounterClockwiseIcon />
                        AI Generated (Original)
                      </Box>
                    </MenuItem>
                  </Select>
                </Box>
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
                      sx={{ bgcolor: '#17C3B2' }}
                      startIcon={<FloppyDiskIcon />}
                      onClick={() => void handleSaveEdits()}
                      disabled={isSaving || hasValidationErrors}
                    >
                      {isSaving ? 'Saving...' : 'Save As New Version'}
                    </Button>
                  </Box>
                ) : (
                  canEdit && (
                    <Button
                      variant="contained"
                      sx={{
                        bgcolor: '#17C3B2',
                      }}
                      disabled={
                        versionStatus === 'older' ||
                        (versionStatus === 'original' &&
                          (versionsData?.length ?? 0) > 0)
                      }
                      startIcon={<PencilIcon />}
                      onClick={handleEditToggle}
                    >
                      Edit Chronology
                    </Button>
                  )
                )}
              </Box>
            }
            customFileViewer={
              <Box
                sx={{
                  p: 3,
                  width: '100%',
                  maxHeight: 'calc(100vh - 12rem)',
                  overflow: 'auto',
                  bgcolor: 'common.white',
                  borderLeftWidth: '1px',
                  borderLeftStyle: 'solid',
                  borderLeftColor: 'divider',
                }}
              >
                <BillingSummaryFormat file={hasFile} />
              </Box>
            }
            customDocuments={
              <EventTimelineAccordion
                allEvents={allEvents}
                parameters={parameters}
                router={router}
                setSelectedFile={setSelectedFile}
                selectedFile={selectedFile}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
                handlePageChange={handlePageChange}
                loadMoreEvents={loadMoreEvents}
                versionStatus={versionStatus}
                versionCreatedAt={selectedVersionCreatedAt}
                selectedVersion={selectedVersion}
                isEditMode={isEditMode}
                editedSummaries={editedSummaries}
                onSummaryChange={handleSummaryChange}
              />
            }
          />
        ) : (
          <Typography variant="h6" color="error" textAlign="center">
            No Data Found
          </Typography>
        )}
      </Box>
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
    </Box>
  );
};

export default EventTimelineDetail;
