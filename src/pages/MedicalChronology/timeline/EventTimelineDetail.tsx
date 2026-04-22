/**
 * @module MedicalChronology
 * @fileoverview Provides the detailed view of medical events for a specific chronology timeline entry.
 * This component displays medical chronology event documents in a file viewer with navigation.
 */

import FileViewer from '@/components/FileViewer';
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
import { useEffect, useState, type FC } from 'react';

import type { AddCaseDataType } from '@/api/caseManagement/addCase';
import {
  CHRONOLOGY_CATEGORY,
  type VersionStatus,
} from '@/api/chronologies/constants';
import {
  getAugmentedChronologyDetails,
  getAugmentedChronologyList,
} from '@/api/chronologies/details';
import { getChronologySummaryReport } from '@/api/chronologies/export';
import AppCustomLoader from '@/components/AppCustomLoader';
import Breadcrumbs, { type BreadcrumbItem } from '@/components/Breadcrumbs';
import { PopUp } from '@/components/Popup';
import ToastAlert from '@/components/ToastAlert';
import { useChronologyEdit } from '@/hooks/useChronologyEdit';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { extractErrorMessage } from '@/utils/chronologyEditPayload';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import type { ChronologyType } from '../types/MedicalChronologyDetailsType';
import EventTimelineAccordion from './EventTimelineAccordion';

/**
 * EventTimelineDetail component that displays medical chronology events
 * @returns A component displaying a file viewer with medical chronology documents
 */

const ITEMS_PER_PAGE = 5;

const EventTimelineDetail: FC = () => {
  const router = useRouter();
  const parameters = useParams({
    from: '/_app/medical-chronology/timeline-event/$chronologyId/$id',
  });

  const breadcrumbItems: Array<BreadcrumbItem> = [
    {
      title: 'Medical Chronology',
      url: '/medical-chronology',
    },
    {
      title: 'Chronology Timeline',
      url: `/medical-chronology/timeline/${parameters.chronologyId}`,
    },
    {
      title: 'Chronology Events',
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
  const [showCancelConfirmation, setShowCancelConfirmation] =
    useState<boolean>(false);

  // Initial data load query - only fires once selectedVersion is set from versions query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      'chronology-details-initial',
      parameters.chronologyId,
      selectedVersion,
    ],
    queryFn: () =>
      getAugmentedChronologyDetails({
        chronologyId: parameters.chronologyId,
        category: 'medical',
        version: selectedVersion,
        page: 1,
        limit: ITEMS_PER_PAGE,
        includePreviousSummary: 'true',
      }),
    enabled: selectedVersion !== undefined,
  });

  // Versions query
  const { data: versionsData, isLoading: isLoadingVersions } = useQuery({
    queryKey: [
      'augmented-versions',
      parameters.chronologyId,
      'Medical Chronology',
    ],
    queryFn: () =>
      getAugmentedChronologyList({
        chronologyId: parameters.chronologyId,
        category: 'medical',
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

  const chronologies = data?.chronologies as Array<ChronologyType> | undefined;
  const hasFile = chronologies?.find(
    (item) => item.file._id === parameters?.id
  );

  const [allEvents, setAllEvents] = useState<Array<ChronologyType>>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<
    AddCaseDataType['files'][0] | null
  >(
    parameters.id && hasFile
      ? ({
          id: hasFile.file._id,
          fileName: hasFile.title,
          name: hasFile.title,
          location: hasFile.location,
          newFileName: hasFile.title,
          key: hasFile.file._id,
          mimeType:
            (hasFile?.file as unknown as Record<string, string>)
              ?.convertedFileMimeType || 'application/pdf',
          createdAt: hasFile.date,
        } as unknown as AddCaseDataType['files'][0])
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
    chronologyId: parameters.chronologyId,
    category: CHRONOLOGY_CATEGORY.MEDICAL,
    allEvents,
    invalidationKeys: [
      ['augmented-versions', parameters.chronologyId, 'Medical Chronology'],
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

  useEffect(() => {
    if (data?.chronologies && !isLoading) {
      if (data.page === 1 || allEvents.length === 0) {
        setAllEvents(data.chronologies as Array<ChronologyType>);
        setHasMore(data.chronologies.length >= ITEMS_PER_PAGE);
      }

      // Auto-select the file for PDF viewer when data loads
      if (!selectedFile) {
        const events = data.chronologies as Array<ChronologyType>;
        const matchedFile = events.find(
          (item) => item.file._id === parameters?.id
        );
        const targetFile = matchedFile ?? events[0];
        if (targetFile) {
          setSelectedFile({
            id: targetFile.file._id,
            fileName: `${moment(targetFile.date).format('MM-DD-YYYY')} (${targetFile.title})`,
            name: targetFile.title,
            location: targetFile.location,
            newFileName: moment(targetFile.date).format('MM-DD-YYYY'),
            key: targetFile.file._id,
            mimeType:
              (targetFile.file as unknown as Record<string, string>)
                ?.convertedFileMimeType || 'application/pdf',
            createdAt: targetFile.date,
          } as unknown as AddCaseDataType['files'][0]);
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

  const loadMoreEvents = async (pageNumber: number): Promise<void> => {
    try {
      setIsLoadingMore(true);
      const moreData = await getAugmentedChronologyDetails({
        chronologyId: parameters.chronologyId,
        category: 'medical',
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

  const handlePageChange = (): void => {
    const nextPage = Math.ceil(allEvents.length / ITEMS_PER_PAGE) + 1;
    void loadMoreEvents(nextPage);
  };

  const handleSummaryReport = (): void => {
    setUiStatus((previous) => ({ ...previous, isSummaryLoading: true }));
    void getChronologySummaryReport({
      chronologyId: parameters.chronologyId,
      category: CHRONOLOGY_CATEGORY.MEDICAL,
      version: selectedVersion,
    })
      .then(() => {
        setUiStatus((previous) => ({
          ...previous,
          showAlert: true,
          type: 'success',
          message: `Chronology Summary Report has been sent to your email successfully.`,
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
          setUiStatus((previous) => ({ ...previous, showAlert: false }))
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
            files={allEvents?.map((item) => {
              return {
                id: item.file._id,
                fileName: `${moment(item.date).format('MM-DD-YYYY')} (${item?.title})`,
                name: item.title,
                location: item.location,
                newFileName: moment(item.date).format('MM-DD-YYYY'),
                key: item.file._id,
                mimeType:
                  item?.file?.convertedFileMimeType || 'application/pdf',
                createdAt: item.date,
              } as unknown as AddCaseDataType['files'][0];
            })}
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
                    Back To Timeline
                  </Button>
                  <Typography variant="h5">
                    Medical Chronology Events
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
          <>
            <Typography variant="h6" textAlign="center">
              No Data Found!
            </Typography>
          </>
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
