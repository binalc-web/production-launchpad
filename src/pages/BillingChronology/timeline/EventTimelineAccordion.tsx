import { useEffect, useState, type FC } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import moment from 'moment';
import {
  CaretDownIcon,
  FileTextIcon,
  InfoIcon,
  PencilSimpleIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import AppCustomLoader from '@/components/AppCustomLoader';
import type { useRouter } from '@tanstack/react-router';
import type { AddCaseDataType } from '@/api/caseManagement/addCase';
import type { ChronologyType } from '@/pages/BillingChronology/types/BillingChronologyDetailsType';
import { TextDiffViewer } from '@/components/TextDiffViewer';
import type { VersionStatus } from './EventTimelineDetail';
import EditableSummaryField from '@/components/EditableSummaryField';
import { isSummaryBelowMinLength } from '@/utils/chronologyEditPayload';

interface EventTimelineAccordionProps {
  allEvents: Array<ChronologyType>;
  parameters: {
    id: string;
    chronologyID: string;
  };
  router: ReturnType<typeof useRouter>;
  setSelectedFile: (file: AddCaseDataType['files'][0]) => void;
  selectedFile: AddCaseDataType['files'][0] | File | null;
  isLoadingMore: boolean;
  hasMore: boolean;
  handlePageChange: () => void;
  loadMoreEvents: (pageNumber: number) => Promise<void>;
  versionStatus: VersionStatus;
  versionCreatedAt?: string;
  selectedVersion?: number;
  isEditMode: boolean;
  editedSummaries: Map<string, string>;
  onSummaryChange: (eventId: string, value: string) => void;
}

const EditStatusIndicator: FC<{
  editedValue?: string;
  originalValue: string;
}> = ({ editedValue, originalValue }) => {
  const hasBeenEdited = editedValue !== undefined && editedValue !== originalValue;
  const hasError = editedValue !== undefined && isSummaryBelowMinLength(editedValue);

  if (hasError) {
    return (
      <Tooltip title="This event has validation errors. Expand to review." arrow>
        <WarningIcon size={22} color="#d32f2f" weight="fill" />
      </Tooltip>
    );
  }
  if (hasBeenEdited) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <PencilSimpleIcon size={16} color="#8B95A5" />
        <Typography sx={{ fontSize: 13, color: 'neutral.400' }}>Edited</Typography>
      </Box>
    );
  }
  return null;
};

const EventTimelineAccordion: FC<EventTimelineAccordionProps> = (props) => {
  const {
    allEvents,
    parameters,
    router,
    setSelectedFile,
    isLoadingMore,
    hasMore,
    handlePageChange,
    versionStatus,
    versionCreatedAt,
    selectedVersion,
    isEditMode,
    editedSummaries,
    onSummaryChange,
  } = props;
  
  // toggle to show/hide changes in summary
  const [showChanges, setShowChanges] = useState<boolean>(false);

  // Reset showChanges whenever the selected version changes
  useEffect(() => {
    setShowChanges(false);
  }, [selectedVersion]);
  // Track which accordion is expanded locally by event _id
  const [expandedId, setExpandedId] = useState<string | null>(parameters.id);

  return (
    <Card
      sx={{
        border: 0,
        height: '100%',
        borderRadius: 0,
        minHeight: '90vh',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: '16px',
          py: '12px',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Switch
            checked={showChanges}
            onChange={(event) => setShowChanges(event.target.checked)}
            disabled={isEditMode || versionStatus === 'original'}
          />
          <Typography
            sx={{
              fontSize: '14px',
            }}
          >
            Show Changes
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: 1,
            alignItems: 'center',
          }}
        >
          <InfoIcon />
          <Typography
            sx={{
              fontSize: '14px',
            }}
          >
            {`Viewing ${versionStatus} version`}
          </Typography>
        </Box>
      </Box>
      <Box
        sx={{
          display: 'flex',
          overflowY: 'auto',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 18rem)',
          pb: 3,
        }}
      >
        {allEvents?.map((item, index) => (
          <Accordion
            key={`${item?._id}-${index}`}
            elevation={0}
            expanded={item?._id === expandedId}
            sx={{
              m: '0 !important',
              py: 1,
              px: 1,
              '&:before': {
                opacity: '1 !important',
              },
              '&.Mui-expanded': {
                bgcolor: 'neutral.50',
              },
            }}
            onChange={(_, isExpanded) => {
              if (isExpanded) {
                setExpandedId(item?._id);
                if (item?._id !== parameters.id) {
                  void router.navigate({
                    to: `/billing-chronology/billing-event/${parameters.chronologyID}/${item?._id}`,
                    replace: true,
                  });
                  setSelectedFile({
                    id: item?.file?._id || item?._id,
                    fileName: `${moment(item.date).format('MM-DD-YYYY')} (${item?.title})`,
                    name: item.title,
                    location: item.location,
                    newFileName: moment(item.date).format('MM-DD-YYYY'),
                    key: item?.file?._id || item?._id,
                    mimeType: 'application/pdf',
                    createdAt: item.date,
                    fileSize: 0,
                    documentProcessStages: '',
                  });
                }
              } else {
                setExpandedId(null);
              }
            }}
          >
            <AccordionSummary
              aria-controls="panel1a-content"
              id="panel1a-header"
              expandIcon={<CaretDownIcon size={20} />}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  pr: 1,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  <Typography maxWidth={350} noWrap fontWeight={600}>
                    {moment(item.date).format('MM-DD-YYYY')} ({item?.title})
                  </Typography>
                </Box>
                {isEditMode && (
                  <EditStatusIndicator
                    editedValue={editedSummaries.get(item?._id)}
                    originalValue={item?.translated_summary ?? ''}
                  />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {/* Edit mode: show editable text field */}
              {isEditMode ? (
                <EditableSummaryField
                  value={
                    editedSummaries.get(item?._id) ??
                    item?.translated_summary ??
                    ''
                  }
                  onChange={(newValue) => onSummaryChange(item?._id, newValue)}
                />
              ) : showChanges ? (
                <TextDiffViewer
                  string1={item?.translated_summary}
                  string2={item?.previous_summary || ''}
                />
              ) : (
                <Typography>{item?.translated_summary || item?.raw_description}</Typography>
              )}
              <Box
                sx={{
                  mt: 1.25,
                  gap: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {versionStatus === 'original' ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <FileTextIcon size={16} color="#8B95A5" />
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: 'neutral.400',
                      }}
                    >
                      {`Summary ${versionCreatedAt ? moment(versionCreatedAt).format('DD MMM YYYY \u2022 h:mm A') : ''} (${versionStatus === 'latest' ? 'Latest' : 'Older'})`}
                    </Typography>
                  </>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
        {isLoadingMore ? <AppCustomLoader height={150} /> : null}
        {!isLoadingMore && hasMore && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              borderTop: '1px solid',
              borderColor: 'divider',
              justifyContent: 'center',
            }}
          >
            <Button
              variant="outlined"
              color="primary"
              onClick={handlePageChange}
              disabled={isLoadingMore}
              sx={{ mt: 2, minWidth: 200 }}
            >
              {isLoadingMore ? 'Loading...' : 'See More'}
            </Button>
          </Box>
        )}
      </Box>
    </Card>
  );
};

export default EventTimelineAccordion;

