import { useState, type FC } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  BuildingIcon,
  CalendarBlankIcon,
  FileTextIcon,
  MinusCircleIcon,
  PencilSimpleIcon,
  PlusCircleIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import { formatCurrency } from '@/utils/masterChronologyUtilities';
import type {
  ChronologyEntry,
  MasterChronologyYear,
} from '../types/MasterChronologyDetailsType';
import EditableSummaryField from '@/components/EditableSummaryField';
import { TextDiffViewer } from '@/components/TextDiffViewer';
import { isSummaryBelowMinLength } from '@/utils/chronologyEditPayload';
import { getInitialSummary } from '@/hooks/useMasterChronologyEdit';
import type { VersionStatus } from './MasterChronologyDetail';
import moment from 'moment';

interface SelectedEvent {
  entry: ChronologyEntry;
  date: string;
  year: number;
  month: string;
}

const MINUS_ICON_BG = '#3957D7';
const PLUS_ICON_BG = '#677284';

interface MasterChronologyTimelinePanelProps {
  data: Array<MasterChronologyYear>;
  selectedEvent: SelectedEvent | null;
  onSelectEvent: (event: SelectedEvent) => void;
  hasNextPage: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  /** When true, no outer border (used inside left box with date range) */
  embedded?: boolean;
  isEditMode?: boolean;
  editedSummaries?: Map<string, string>;
  onSummaryChange?: (eventId: string, value: string) => void;
  showChanges?: boolean;
  versionStatus?: VersionStatus;
  versionCreatedAt?: string;
}

/* eslint-disable camelcase */
/** Figma chip styles: light bg + darker text (rectangular, rounded) */
const statusConfig: Record<
  ChronologyEntry['status'],
  { label: string; bg: string; text: string }
> = {
  matched: {
    label: 'Completed',
    bg: '#E8F5E9',
    text: '#2E7D32',
  },
  missing_billing: {
    label: 'Medical Only',
    bg: '#FFF3E0',
    text: '#E65100',
  },
  missing_medical: {
    label: 'Billing Only',
    bg: '#FFEBEE',
    text: '#C62828',
  },
};
/* eslint-enable camelcase */

const EditStatusIndicator: FC<{
  editedValue?: string;
  originalValue: string;
}> = ({ editedValue, originalValue }) => {
  const hasBeenEdited =
    editedValue !== undefined && editedValue !== originalValue;
  const hasError =
    editedValue !== undefined && isSummaryBelowMinLength(editedValue);

  if (hasError) {
    return (
      <Tooltip
        title="This event has validation errors. Expand to review."
        arrow
      >
        <WarningIcon size={22} color="#d32f2f" weight="fill" />
      </Tooltip>
    );
  }
  if (hasBeenEdited) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <PencilSimpleIcon size={16} color="#8B95A5" />
        <Typography sx={{ fontSize: 13, color: 'neutral.400' }}>
          Edited
        </Typography>
      </Box>
    );
  }
  return null;
};

const MasterChronologyTimelinePanel: FC<MasterChronologyTimelinePanelProps> = ({
  data,
  selectedEvent,
  onSelectEvent,
  hasNextPage,
  isLoadingMore,
  onLoadMore,
  embedded = false,
  isEditMode = false,
  editedSummaries = new Map(),
  onSummaryChange,
  showChanges = false,
  versionStatus = 'original',
  versionCreatedAt,
}) => {
  // Track which years / months are expanded (default all expanded)
  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(new Set());
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(
    new Set()
  );

  const toggleYear = (year: number): void => {
    setCollapsedYears((previous) => {
      const next = new Set(previous);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  const toggleMonth = (key: string): void => {
    setCollapsedMonths((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <Box
      sx={{
        ...(embedded
          ? {
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }
          : {
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              bgcolor: 'common.white',
            }),
        overflowY: 'auto',
        maxHeight: embedded ? 'none' : 'calc(100vh - 19rem)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {data.map((yearGroup) => {
        const yearExpanded = !collapsedYears.has(yearGroup.year);

        return (
          <Box key={yearGroup.year}>
            {/* ── Year Row ── */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1,
                bgcolor: '#F8F9FB',
                borderBottom: '1px solid',
                borderColor: 'divider',
                position: 'sticky',
                top: 0,
                zIndex: 4,
              }}
            >
              <Typography fontWeight={700} fontSize={15} color="text.primary">
                {yearGroup.year}
              </Typography>
              <IconButton
                size="small"
                disableRipple
                onClick={() => toggleYear(yearGroup.year)}
                sx={{
                  p: 0,
                  '&.MuiIconButton-root': { bgcolor: 'transparent' },
                  '&:hover': { bgcolor: 'transparent' },
                }}
              >
                {yearExpanded ? (
                  <MinusCircleIcon size={22} color={MINUS_ICON_BG} />
                ) : (
                  <PlusCircleIcon size={22} color={PLUS_ICON_BG} />
                )}
              </IconButton>
            </Box>

            <Collapse in={yearExpanded} unmountOnExit>
              {yearGroup.months.map((monthGroup) => {
                const monthKey = `${yearGroup.year}-${monthGroup.month}`;
                const monthExpanded = !collapsedMonths.has(monthKey);

                return (
                  <Box key={monthKey}>
                    {/* ── Month Row ── */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 2,
                        py: 0.75,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'common.white',
                        position: 'sticky',
                        top: 38,
                        zIndex: 3,
                      }}
                    >
                      <Typography
                        fontSize={13}
                        fontWeight={600}
                        color="text.secondary"
                      >
                        {monthGroup.month}
                      </Typography>
                      <IconButton
                        size="small"
                        disableRipple
                        onClick={() => toggleMonth(monthKey)}
                        sx={{
                          p: 0,
                          '&.MuiIconButton-root': { bgcolor: 'transparent' },
                          '&:hover': { bgcolor: 'transparent' },
                        }}
                      >
                        {monthExpanded ? (
                          <MinusCircleIcon size={22} color={MINUS_ICON_BG} />
                        ) : (
                          <PlusCircleIcon size={22} color={PLUS_ICON_BG} />
                        )}
                      </IconButton>
                    </Box>

                    <Collapse in={monthExpanded} unmountOnExit>
                      <Box
                        sx={{ position: 'relative', pl: 2, pr: 1.5, pb: 0.5 }}
                      >
                        {/* Gray vertical line */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 15,
                            top: 8,
                            bottom: 8,
                            width: 2,
                            bgcolor: '#E5E7EB',
                            borderRadius: 1,
                            zIndex: 0,
                          }}
                        />
                        {monthGroup.dates.map((dateGroup, dateIndex) => (
                          <Box
                            key={dateGroup.date}
                            sx={{
                              position: 'relative',
                              zIndex: 0,
                              pb: 1,
                              mt: dateIndex === 0 ? 0.75 : 0,
                            }}
                          >
                            {/* Day row */}
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                py: 0.5,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 14,
                                  height: 14,
                                  borderRadius: '50%',
                                  border: '2px solid',
                                  borderColor: '#93A8F7',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  bgcolor: 'transparent',
                                  marginLeft: -0.9,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    bgcolor: MINUS_ICON_BG,
                                  }}
                                />
                              </Box>
                              <Typography
                                fontSize={12.5}
                                fontWeight={600}
                                color="text.primary"
                              >
                                {dateGroup.date}
                              </Typography>
                            </Box>

                            {/* Event cards for this day */}
                            <Box sx={{ pl: 1.25 }}>
                              {dateGroup.chronologies.map((entry, index) => {
                                const title =
                                  entry.medicalSummary?.title ||
                                  entry.billingSummary?.[0]?.title ||
                                  'Untitled Event';
                                const provider =
                                  entry.medicalSummary?.location ||
                                  entry.billingSummary?.[0]?.billing_provider ||
                                  '';
                                const amount =
                                  entry.billingSummary?.[0]?.amount_billed ?? 0;
                                const fileDetailsLength =
                                  entry.fileDetails?.length || 0;
                                const documentCount =
                                  fileDetailsLength > 99
                                    ? '99+'
                                    : fileDetailsLength;
                                const cfg = statusConfig[entry.status];
                                const isSelected =
                                  selectedEvent?.date === dateGroup.date &&
                                  selectedEvent?.year === yearGroup.year &&
                                  selectedEvent?.month === monthGroup.month &&
                                  selectedEvent?.entry === entry;

                                const eventId = entry._id;
                                const currentSummary = getInitialSummary(entry);
                                const editedValue =
                                  editedSummaries.get(eventId);

                                // Pre-compute diff strings for Show Changes mode
                                const diffCurrent =
                                  entry.combinedSummary ?? '';
                                const diffPrevious =
                                  entry.previous_combinedSummary ?? '';

                                return (
                                  <Box
                                    key={`${dateGroup.date}-${index}`}
                                    onClick={() =>
                                      onSelectEvent({
                                        entry,
                                        date: dateGroup.date,
                                        year: yearGroup.year,
                                        month: monthGroup.month,
                                      })
                                    }
                                    sx={{
                                      position: 'relative',
                                      mb: 0.75,
                                      cursor: 'pointer',
                                      borderRadius: 1.5,
                                      border: '1px solid',
                                      borderColor: isSelected
                                        ? 'transparent'
                                        : 'divider',
                                      bgcolor: isSelected
                                        ? '#F5F5F5'
                                        : 'common.white',
                                      transition: 'all 0.15s ease',
                                      overflow: 'visible',
                                      '&:hover': {
                                        borderColor: isSelected
                                          ? 'transparent'
                                          : 'divider',
                                        bgcolor: '#F5F5F5',
                                      },
                                    }}
                                  >
                                    {/* Selected: blue vertical line */}
                                    {isSelected && (
                                      <Box
                                        sx={{
                                          position: 'absolute',
                                          left: -12,
                                          top: 0,
                                          bottom: 0,
                                          width: 4,
                                          backgroundColor: MINUS_ICON_BG,
                                          zIndex: 1,
                                          borderRadius: 1,
                                        }}
                                      />
                                    )}
                                    <Box sx={{ p: 1.25 }}>
                                      {/* Title + chip */}
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'flex-start',
                                          justifyContent: 'space-between',
                                          gap: 1,
                                          mb: 0.75,
                                        }}
                                      >
                                        <Typography
                                          fontSize={12.5}
                                          fontWeight={700}
                                          sx={{
                                            overflow: 'hidden',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            lineHeight: 1.4,
                                          }}
                                        >
                                          {title}
                                        </Typography>
                                        <Box
                                          sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.75,
                                          }}
                                        >
                                          {isEditMode && (
                                            <EditStatusIndicator
                                              editedValue={editedValue}
                                              originalValue={currentSummary}
                                            />
                                          )}
                                          <Chip
                                            label={cfg.label}
                                            size="small"
                                            sx={{
                                              fontSize: 10,
                                              height: 20,
                                              flexShrink: 0,
                                              bgcolor: cfg.bg,
                                              color: cfg.text,
                                              fontWeight: 600,
                                              borderRadius: 0.5,
                                              border: '1px solid',
                                              padding: '10px 8px',
                                              '& .MuiChip-label': { px: 1 },
                                            }}
                                          />
                                        </Box>
                                      </Box>

                                      {/* Details row */}
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '10px',
                                          flexWrap: 'wrap',
                                        }}
                                      >
                                        <CalendarBlankIcon
                                          size={14}
                                          color="#6B7280"
                                        />
                                        <Typography
                                          fontSize={14}
                                          fontWeight={400}
                                          color="text.primary"
                                        >
                                          {amount > 0
                                            ? formatCurrency(amount)
                                            : 'No Cost'}
                                        </Typography>
                                        <Box
                                          sx={{
                                            width: 4,
                                            height: 4,
                                            borderRadius: '50%',
                                            bgcolor: '#D7DAE0',
                                          }}
                                        />
                                        <BuildingIcon
                                          size={14}
                                          color="#6B7280"
                                        />
                                        <Typography
                                          fontSize={14}
                                          color="text.secondary"
                                          noWrap
                                          sx={{ maxWidth: 150 }}
                                          title={provider}
                                        >
                                          {provider || 'No Hospital'}
                                        </Typography>
                                        <Box
                                          sx={{
                                            width: 4,
                                            height: 4,
                                            borderRadius: '50%',
                                            bgcolor: '#D7DAE0',
                                          }}
                                        />
                                        <FileTextIcon
                                          size={14}
                                          color="#6B7280"
                                        />
                                        <Typography
                                          fontSize={14}
                                          fontWeight={400}
                                          color="text.secondary"
                                        >
                                          {documentCount}
                                        </Typography>
                                      </Box>

                                      {/* AI Summary / Edit / Diff section */}
                                      <Box
                                        sx={{ mt: 1.5 }}
                                        onClick={(event) =>
                                          event.stopPropagation()
                                        }
                                      >
                                        {isEditMode ? (
                                          <EditableSummaryField
                                            value={
                                              editedValue ?? currentSummary
                                            }
                                            onChange={(newValue) =>
                                              onSummaryChange?.(
                                                eventId,
                                                newValue
                                              )
                                            }
                                          />
                                        ) : showChanges &&
                                          versionStatus !== 'original' ? (
                                          <TextDiffViewer
                                            string1={diffCurrent}
                                            string2={diffPrevious}
                                          />
                                        ) : (
                                          <>
                                            <Typography
                                              fontSize={16}
                                              sx={{
                                                display: '-webkit-box',
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                              }}
                                            >
                                              {currentSummary}
                                            </Typography>
                                          </>
                                        )}
                                      </Box>

                                      {/* Footer: version label */}
                                      {!isEditMode && (
                                        <Box
                                          sx={{
                                            mt: 1,
                                            gap: 0.5,
                                            display: 'flex',
                                            alignItems: 'center',
                                          }}
                                        >
                                          {versionStatus === 'original' ? (
                                            <>
                                              <Box
                                                component="svg"
                                                width="14px"
                                                height="14px"
                                                viewBox="0 0 20 20"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                              >
                                                <path
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
                                              <FileTextIcon
                                                size={14}
                                                color="#8B95A5"
                                              />
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
                                      )}
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Collapse>
          </Box>
        );
      })}

      {/* ── Load More ── */}
      {hasNextPage && (
        <Box
          sx={{
            p: 1.5,
            display: 'flex',
            justifyContent: 'center',
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            sx={{ minWidth: 120, fontSize: 13 }}
          >
            {isLoadingMore ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <CircularProgress size={16} />
                <Typography component="span" fontSize={13}>
                  Loading...
                </Typography>
              </Box>
            ) : (
              'Load More'
            )}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default MasterChronologyTimelinePanel;
