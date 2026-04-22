import { useMemo, useState, type FC } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import FileViewer from '@/components/FileViewer';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import type { AddCaseDataType } from '@/api/caseManagement/addCase';
import type { MedicalTimelineEventType } from '../types/MedicalChronologyDetailsType';
import {
  CARE_SETTING_CONFIG,
  CARE_SETTING_LABELS,
  DOT_SIZE,
  EVENT_TYPES,
  INJURY_BANNER_CENTER_PADDING_X_PX,
  INJURY_BANNER_EDGE_PADDING_X_PX,
  INJURY_BANNER_EXTEND_LEFT_MIN_PERCENT,
  INJURY_BANNER_EXTEND_RIGHT_MAX_PERCENT,
  INJURY_VERTICAL_LINE_WIDTH_PX,
  LEFT_COLUMN_WIDTH,
  ROW_HEIGHT,
  ROW_MAX_HEIGHT_PX,
  ROW_STACK_GAP_PX,
  TIMELINE_MARKER_TOP_INSET_PX,
} from './medicalTimelineMatrix.constants';
import type { ChartPoint, SelectedRange } from './medicalTimelineMatrix.types';
import { getTimelineMarkerTopPx } from './medicalTimelineMatrix.utilities';
import { useMedicalTimelineChartData } from './useMedicalTimelineChartData';

const INJURY_BANNER_STACK_MIN_X_GAP_PERCENT = 7;
const INJURY_BANNER_STACK_OFFSET_PX = 26;

function injuryMarkerCenterLeftExpr(xPercent: number): string {
  return `clamp(${DOT_SIZE / 2}px, calc(${xPercent}% - ${DOT_SIZE / 2}px), calc(100% - ${DOT_SIZE / 2}px)) + ${DOT_SIZE / 2}px`;
}

type InjuryBannerPlacement = 'extend-right' | 'extend-left' | 'center';

function injuryBannerPlacementForX(xPercent: number): InjuryBannerPlacement {
  if (xPercent <= INJURY_BANNER_EXTEND_RIGHT_MAX_PERCENT) return 'extend-right';
  if (xPercent >= INJURY_BANNER_EXTEND_LEFT_MIN_PERCENT) return 'extend-left';
  return 'center';
}

function computeInjuryBannerStackOffsets(
  markers: Array<{ x: number }>
): Array<number> {
  const offsets = new Array(markers.length).fill(0);
  let stackLevel = 0;
  for (let index = 0; index < markers.length; index++) {
    if (
      index > 0 &&
      markers[index].x - markers[index - 1].x <
        INJURY_BANNER_STACK_MIN_X_GAP_PERCENT
    ) {
      stackLevel += 1;
    } else {
      stackLevel = 0;
    }
    offsets[index] = stackLevel * INJURY_BANNER_STACK_OFFSET_PX;
  }
  return offsets;
}

const TIMELINE_TOOLTIP_POPPER_SX = {
  backgroundColor: 'transparent !important',
  boxShadow: 'none',
  padding: 0,
  margin: 0,
  maxWidth: 'none',
  opacity: 1,
  '& .MuiTooltip-arrow': {
    display: 'none',
  },
} as const;

const TimelineEventTooltipCard: FC<{
  point: ChartPoint;
  onOpenSource: (fileId: string, fileName: string) => void;
}> = ({ point, onOpenSource }) => {
  const rowIndex = EVENT_TYPES.findIndex(
    (eventType) => eventType.id === point.typeId
  );
  if (rowIndex < 0) return null;
  const eventTypeConfig = EVENT_TYPES[rowIndex];
  const settingConfig = CARE_SETTING_CONFIG[point.careSetting];
  const isDateOfInjury = point.typeId === 'date_of_injury';
  const careLabel = isDateOfInjury
    ? 'Date of Injury'
    : CARE_SETTING_LABELS[point.careSetting];
  return (
    <Box
      sx={{
        maxWidth: '300px',
        maxHeight: '254px',
        boxSizing: 'border-box',
        borderRadius: '6px',
        border: '1px solid #EDEEF1',
        bgcolor: '#FFFFFF',
        paddingLeft: '12px',
        paddingRight: '12px',
        paddingTop: '16px',
        paddingBottom: '16px',
        opacity: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          mb: 0,
        }}
      >
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: isDateOfInjury ? '#D7263D' : settingConfig.color,
            flexShrink: 0,
          }}
        />
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 500,
            color: '#374151',
          }}
        >
          {careLabel}
        </Typography>
      </Box>

      <Typography
        sx={{
          fontSize: 16,
          fontWeight: 500,
          color: '#474E5D',
          mb: '8px',
        }}
      >
        {eventTypeConfig.label}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <Typography
          sx={{
            fontSize: 13,
            color: '#6B7280',
          }}
        >
          Provider:{' '}
          <Box component="span" sx={{ color: '#111827', fontWeight: 500 }}>
            {point.provider}
          </Box>
        </Typography>
        <Typography
          sx={{
            fontSize: 13,
            color: '#6B7280',
          }}
        >
          Facility:{' '}
          <Box component="span" sx={{ color: '#111827', fontWeight: 500 }}>
            {point.facility}
          </Box>
        </Typography>
        <Typography
          sx={{
            fontSize: 13,
            color: '#6B7280',
          }}
        >
          Source:{' '}
          <Box
            component="button"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onOpenSource(point.sourceFileId, point.sourceFile);
            }}
            sx={{
              color: '#2563EB',
              fontWeight: 600,
              textDecoration: 'underline',
              cursor: 'pointer',
              background: 'transparent',
              border: 0,
              padding: 0,
            }}
          >
            {point.sourceFile}
          </Box>
        </Typography>
      </Box>
    </Box>
  );
};

const MedicalTimelineMatrix: FC<{
  data: Array<MedicalTimelineEventType>;
  selectedRange: SelectedRange;
}> = ({ data, selectedRange }) => {
  const chartData = useMedicalTimelineChartData(data, selectedRange);

  const [openFileViewer, setOpenFileViewer] = useState(false);
  const [fileViewerFiles, setFileViewerFiles] = useState<
    AddCaseDataType['files']
  >([]);
  const [fileViewerSelectedFile, setFileViewerSelectedFile] = useState<
    AddCaseDataType['files'][0] | null
  >(null);

  const guessMimeType = (fileName: string): string => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.match(/\.(png|jpg|jpeg|gif|webp)$/)) return 'image/*';
    return 'application/pdf';
  };

  const openSourcePreview = (fileId: string, fileName: string): void => {
    const mimeType = guessMimeType(fileName);

    const viewerFile: AddCaseDataType['files'][0] = {
      id: fileId,
      fileName,
      name: fileName,
      key: fileId,
      mimeType,
      location: 'Not Provided',
      newFileName: fileName,
      fileSize: 0,
      documentProcessStages: '',
      createdAt: new Date().toISOString(),
    };

    setFileViewerFiles([viewerFile]);
    setFileViewerSelectedFile(viewerFile);
    setOpenFileViewer(true);
  };

  const injuryBannerStackOffsets = useMemo(
    () => computeInjuryBannerStackOffsets(chartData.injuryMarkers),
    [chartData.injuryMarkers]
  );

  if (chartData.points.length === 0) {
    return (
      <Box
        sx={{
          mt: 2,
          p: 2,
          borderRadius: 1.5,
          border: '1px solid #E5E7EB',
        }}
      >
        <Typography color="text.secondary">
          No events available for timeline chart.
        </Typography>
      </Box>
    );
  }

  const rowPoints = EVENT_TYPES.map((eventType) =>
    chartData.points
      .filter((p) => p.typeId === eventType.id)
      .sort((a, b) => a.x - b.x)
  );
  const rowCounts = rowPoints.map((array) => array.length || 0);
  // Must stay consistent with getTimelineMarkerTopPx: capped height plus constrained stacking.
  const rowHeights = rowCounts.map((count) =>
    Math.min(
      ROW_MAX_HEIGHT_PX,
      ROW_HEIGHT + Math.max(0, count - 1) * ROW_STACK_GAP_PX
    )
  );
  const rowTops = rowHeights.reduce<Array<number>>(
    (accumulator, _height, index) => {
      if (index === 0) return [0];
      accumulator.push(accumulator[index - 1] + rowHeights[index - 1]);
      return accumulator;
    },
    []
  );

  const totalRowsHeight = rowHeights.reduce((sum, h) => sum + h, 0);
  const verticalDividerColumnCount = Math.max(
    0,
    chartData.monthLabels.length - 1
  );
  const stackIndexByPointId: Record<string, number> = {};
  rowPoints.forEach((array) => {
    array.forEach((point, index) => {
      stackIndexByPointId[point.id] = index;
    });
  });
  const isYearOnly = selectedRange === '5Y' || selectedRange === '2Y';
  const isMonthMode = selectedRange === '1Y' || selectedRange === '6M';

  return (
    <Box
      sx={{
        mt: 2,
        borderRadius: 1.5,
        border: '1px solid #E5E7EB',
        overflow: 'auto',
        maxHeight: 720,
      }}
    >
      <Box sx={{ minWidth: LEFT_COLUMN_WIDTH + chartData.timelineWidth }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'stretch',
            borderBottom: '1px solid #E5E7EB',
            bgcolor: 'common.white',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            boxShadow: '0 1px 0 rgba(229, 231, 235, 0.9)',
          }}
        >
          <Box
            sx={{
              width: LEFT_COLUMN_WIDTH,
              px: 1,
              py: 1,
              borderRight: '1px solid #E5E7EB',
              position: 'sticky',
              left: 0,
              zIndex: 7,
              bgcolor: 'common.white',
            }}
          >
            <Typography
              sx={{ fontSize: 10, fontWeight: 700, color: '#6B7280' }}
            >
              EVENT TYPE
            </Typography>
          </Box>
          <Box
            sx={{
              width: chartData.timelineWidth,
              px: 2,
              py: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {isYearOnly ? (
              // 5Y / 2Y: show only year row.
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${chartData.monthLabels.length}, 1fr)`,
                  columnGap: 0,
                }}
              >
                {chartData.yearSegments.map((seg) => (
                  <Box
                    key={`${seg.year}-${seg.startIndex}`}
                    sx={{
                      gridColumn: `${seg.startIndex + 1} / ${seg.endIndex + 2}`,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      px: 0.25,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: '#6B7280',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {seg.year}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : isMonthMode ? (
              <>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${chartData.monthLabels.length}, 1fr)`,
                    columnGap: 0,
                    alignItems: 'center',
                  }}
                >
                  {chartData.yearSegments.map((seg) => (
                    <Box
                      key={`${seg.year}-${seg.startIndex}`}
                      sx={{
                        gridColumn: `${seg.startIndex + 1} / ${seg.endIndex + 2}`,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        px: 0.25,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 11,
                          color: '#6B7280',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {seg.year}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Box
                  sx={{
                    mt: 0.5,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${chartData.monthLabels.length}, 1fr)`,
                    columnGap: 0,
                  }}
                >
                  {chartData.monthLabels.map((m, index) => (
                    <Typography
                      key={`${m}-${index}`}
                      sx={{
                        fontSize: 10.5,
                        color: '#6B7280',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m}
                    </Typography>
                  ))}
                </Box>
              </>
            ) : (
              // 1M: show month+year row and then day numbers.
              <>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${chartData.monthLabels.length}, 1fr)`,
                    columnGap: 0,
                    alignItems: 'center',
                  }}
                >
                  {chartData.monthYearSegments.map((seg) => (
                    <Box
                      key={`${seg.label}-${seg.startIndex}`}
                      sx={{
                        gridColumn: `${seg.startIndex + 1} / ${seg.endIndex + 2}`,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        px: 0.25,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 11,
                          color: '#6B7280',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {seg.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Box
                  sx={{
                    mt: 0.5,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${chartData.monthLabels.length}, 1fr)`,
                    columnGap: 0,
                  }}
                >
                  {chartData.monthLabels.map((m, index) => (
                    <Typography
                      key={`${m}-${index}`}
                      sx={{
                        fontSize: 10.5,
                        color: '#6B7280',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m}
                    </Typography>
                  ))}
                </Box>
              </>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', position: 'relative' }}>
          <Box
            sx={{
              width: LEFT_COLUMN_WIDTH,
              borderRight: '1px solid #E5E7EB',
              position: 'sticky',
              left: 0,
              zIndex: 3,
              bgcolor: 'common.white',
            }}
          >
            {EVENT_TYPES.map((eventType, rowIndex) => (
              <Box
                key={eventType.id}
                sx={{
                  height: rowHeights[rowIndex],
                  px: 1,
                  gap: 0.75,
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '1px solid #F0F2F5',
                  bgcolor:
                    eventType.id === 'date_of_injury' ? '#FEF2F2' : 'white',
                }}
              >
                <eventType.Icon
                  size={14}
                  color={
                    eventType.id === 'date_of_injury' ? '#DC2626' : '#6B7280'
                  }
                  weight="regular"
                />
                <Typography
                  sx={{
                    fontSize: 12,
                    color:
                      eventType.id === 'date_of_injury' ? '#B91C1C' : '#4B5563',
                    fontWeight: eventType.id === 'date_of_injury' ? 600 : 400,
                  }}
                >
                  {eventType.label}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              width: chartData.timelineWidth,
              position: 'relative',
              height: totalRowsHeight,
              backgroundColor: '#FFFFFF',
            }}
          >
            {Array.from({ length: verticalDividerColumnCount }, (_, index) => {
              const leftPercent =
                ((index + 1) / (verticalDividerColumnCount + 1)) * 100;
              return (
                <Box
                  key={`v-divider-${index}`}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `calc(${leftPercent}% - 0.5px)`,
                    width: '1px',
                    bgcolor: '#E5E7EB',
                    opacity: 0.55,
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />
              );
            })}

            {EVENT_TYPES.map((_eventType, rowIndex) => (
              <Box
                key={`${_eventType.id}-line`}
                sx={{
                  position: 'absolute',
                  top: rowTops[rowIndex],
                  left: 0,
                  right: 0,
                  height: rowHeights[rowIndex],
                  borderBottom: '1px solid #F0F2F5',
                  zIndex: 1,
                }}
              />
            ))}

            {chartData.injuryMarkers.map((marker, injuryIndex) => {
              const centerExpr = injuryMarkerCenterLeftExpr(marker.x);
              const placement = injuryBannerPlacementForX(marker.x);
              const injuryLineHalfPx = INJURY_VERTICAL_LINE_WIDTH_PX / 2;
              const bannerTop = injuryBannerStackOffsets[injuryIndex] ?? 0;

              const injuryBannerMinWidthExtendRight =
                placement === 'extend-right'
                  ? `calc(${centerExpr} + ${injuryLineHalfPx}px)`
                  : undefined;

              const injuryBannerLeftExpr =
                placement === 'extend-right'
                  ? 0
                  : placement === 'extend-left'
                    ? `calc(${centerExpr} + ${injuryLineHalfPx}px)`
                    : `calc(${centerExpr})`;

              const injuryBannerPaddingX =
                placement === 'center'
                  ? {
                      paddingLeft: `${INJURY_BANNER_CENTER_PADDING_X_PX}px`,
                      paddingRight: `${INJURY_BANNER_CENTER_PADDING_X_PX}px`,
                    }
                  : placement === 'extend-right'
                    ? {
                        paddingLeft: `${INJURY_BANNER_EDGE_PADDING_X_PX}px`,
                        paddingRight: `${INJURY_BANNER_CENTER_PADDING_X_PX}px`,
                      }
                    : {
                        paddingLeft: `${INJURY_BANNER_CENTER_PADDING_X_PX}px`,
                        paddingRight: `${INJURY_BANNER_EDGE_PADDING_X_PX}px`,
                      };

              return (
                <Box key={marker.dayKey} sx={{ display: 'contents' }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      left: `calc(${centerExpr} - ${INJURY_VERTICAL_LINE_WIDTH_PX / 2}px)`,
                      top: 0,
                      bottom: 0,
                      width: INJURY_VERTICAL_LINE_WIDTH_PX,
                      bgcolor: '#D7263D',
                      zIndex: 1,
                      pointerEvents: 'none',
                    }}
                  />

                  <Box
                    sx={{
                      position: 'absolute',
                      left: injuryBannerLeftExpr,
                      top: bannerTop,
                      transform:
                        placement === 'center'
                          ? 'translate(-50%, 0)'
                          : placement === 'extend-right'
                            ? 'translate(5px, 0)'
                            : 'translate(-100%, 0)',
                      ...(injuryBannerMinWidthExtendRight !== undefined && {
                        minWidth: injuryBannerMinWidthExtendRight,
                      }),
                      boxSizing: 'border-box',
                      ...injuryBannerPaddingX,
                      padding: '5px 8px',
                      borderTopLeftRadius: 0,
                      borderTopRightRadius: 0,
                      borderBottomLeftRadius: 8,
                      borderBottomRightRadius: 8,
                      bgcolor: '#D7263D',
                      boxShadow: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      zIndex: 2,
                      pointerEvents: 'none',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#FFFFFF',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {marker.label}
                    </Typography>
                  </Box>
                </Box>
              );
            })}

            {chartData.points.map((point) => {
              const rowIndex = EVENT_TYPES.findIndex(
                (eventType) => eventType.id === point.typeId
              );
              if (rowIndex < 0) return null;
              const eventTypeConfig = EVENT_TYPES[rowIndex];
              const markersInRow = rowCounts[rowIndex] ?? 0;
              const stackIndexInRow = stackIndexByPointId[point.id] ?? 0;
              // Vertical position: stack within this row only (see rowHeights cap above).
              const markerTopPx = getTimelineMarkerTopPx({
                rowTopPx: rowTops[rowIndex],
                rowHeightPx: rowHeights[rowIndex],
                markersInRow,
                stackIndexInRow,
                stackGapPx: ROW_STACK_GAP_PX,
                markerDiameterPx: DOT_SIZE,
              });
              const settingConfig = CARE_SETTING_CONFIG[point.careSetting];
              const isDateOfInjury = point.typeId === 'date_of_injury';
              const DotIcon = eventTypeConfig.Icon;

              return (
                <Tooltip
                  placement="right"
                  title={
                    <TimelineEventTooltipCard
                      point={point}
                      onOpenSource={openSourcePreview}
                    />
                  }
                  componentsProps={{
                    tooltip: {
                      sx: TIMELINE_TOOLTIP_POPPER_SX,
                    },
                  }}
                >
                  <Box
                    key={point.id}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openSourcePreview(point.sourceFileId, point.sourceFile);
                    }}
                    sx={{
                      position: 'absolute',
                      // Keep dot fully visible when it is very close to the left edge.
                      left: `clamp(${DOT_SIZE / 2}px, calc(${point.x}% - ${DOT_SIZE / 2}px), calc(100% - ${
                        DOT_SIZE / 2
                      }px))`,
                      top: markerTopPx + TIMELINE_MARKER_TOP_INSET_PX,
                      width: DOT_SIZE,
                      height: DOT_SIZE,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: isDateOfInjury ? '#D7263D' : settingConfig.color,
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.6)',
                      zIndex: 2,
                      cursor: 'pointer',
                    }}
                  >
                    <DotIcon size={12} color="#FFFFFF" weight="regular" />
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      </Box>
      <FileViewer
        hideRefetchAndLog
        hideDocuments
        open={openFileViewer}
        setOpen={setOpenFileViewer}
        selectedFile={fileViewerSelectedFile}
        files={fileViewerFiles}
        setSelectedFile={setFileViewerSelectedFile}
        customHeader={
          <Box
            sx={{
              p: 2,
              display: 'flex',
              border: '1px solid',
              alignItems: 'center',
              borderColor: 'divider',
              bgcolor: 'common.white',
            }}
          >
            <Box
              sx={{
                gap: 2.5,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Box
                component="button"
                type="button"
                onClick={() => {
                  setOpenFileViewer(false);
                  setFileViewerSelectedFile(null);
                }}
                sx={{
                  display: 'flex',
                  height: '38px',
                  px: '20px',
                  py: '10px',
                  border: '1px solid #B4BBC5',
                  borderRadius: '6px',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  backgroundColor: '#FFFFFF',
                  color: '#474E5D',
                  '&:hover': {
                    bgcolor: '#F8FAFC',
                  },
                }}
              >
                <ArrowLeftIcon size={16} />
                <Typography
                  sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1 }}
                >
                  Back
                </Typography>
              </Box>
              <Typography variant="h5">
                {fileViewerSelectedFile?.fileName || 'Preview doc'}
              </Typography>
            </Box>
          </Box>
        }
      />
    </Box>
  );
};

export default MedicalTimelineMatrix;
