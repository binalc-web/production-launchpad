import moment, { type MomentBuiltinFormat } from 'moment';
import type { MedicalTimelineEventType } from '../types/MedicalChronologyDetailsType';
import {
  EVENT_TYPES,
  TimelineKeyword,
} from './medicalTimelineMatrix.constants';
import type {
  CareSetting,
  EventTypeConfig,
} from './medicalTimelineMatrix.types';

export const getDateFromEvent = (
  item: MedicalTimelineEventType
): Date | null => {
  const formats: Array<string | MomentBuiltinFormat> = [
    'MM-DD-YYYY, hh:mm A',
    'M-D-YYYY, hh:mm A',
    'MM-DD-YYYY',
    'M-D-YYYY',
    moment.ISO_8601,
  ];

  // Backend date strings may vary (zero-padded vs non-padded). Be tolerant.
  const parsed = moment(item.date, formats, false);
  return parsed.isValid() ? parsed.toDate() : null;
};

export const mapToEventType = (
  item: MedicalTimelineEventType
): EventTypeConfig => {
  if ((item.timeline_event_type ?? '').toLowerCase() === 'date_of_injury') {
    return EVENT_TYPES[0];
  }

  const titleLower = (item.title ?? '').toLowerCase();
  const timelineTypeLower = (item.timeline_event_type ?? '').toLowerCase();
  const eventType = (item.eventType ?? '').toLowerCase();
  const documentType = (item.document_type ?? '').toLowerCase();

  // Title + API slugs beat free-text haystack. Progress notes often mention
  // "consult" / "nurse" in the body but the record is still physician documentation.
  const slugBag = `${timelineTypeLower} ${eventType} ${documentType}`.replace(
    /[-_]+/g,
    ' '
  );
  const isPhysicianProgressAuthoritative =
    titleLower.includes('physician progress') ||
    slugBag.includes('physician progress') ||
    slugBag.includes('physician notes') ||
    timelineTypeLower.includes('physician_note') ||
    timelineTypeLower.includes('physician progress') ||
    eventType.includes('physician_note') ||
    eventType.includes('physician progress') ||
    documentType.includes('physician_note') ||
    documentType.includes('physician progress');

  if (isPhysicianProgressAuthoritative) {
    return EVENT_TYPES[3];
  }

  const haystack =
    `${eventType} ${documentType} ${item.title} ${item.raw_description} ${item.translated_summary}`.toLowerCase();

  const hasStandaloneConsult = (): boolean =>
    haystack.includes(TimelineKeyword.Consultation) ||
    /\bconsult\b/i.test(haystack);

  const hasNursingSignal = (): boolean =>
    haystack.includes(TimelineKeyword.Nursing) || /\bnurses?\b/i.test(haystack);

  const hasPhysicianProgressNoteSignal = (): boolean =>
    haystack.includes(TimelineKeyword.PhysicianProgress) ||
    haystack.includes(TimelineKeyword.ProgressNote) ||
    haystack.includes(TimelineKeyword.Physician) ||
    haystack.includes(TimelineKeyword.Doctor);

  // Prefer direct mapping from backend `eventType` so row icons match exactly.
  if (eventType.includes(TimelineKeyword.DoctorVisit)) return EVENT_TYPES[3];
  if (eventType.includes(TimelineKeyword.Pharmacy)) return EVENT_TYPES[14];
  if (
    eventType.includes(TimelineKeyword.LabImaging) ||
    eventType.includes(TimelineKeyword.LabImagingAlt)
  ) {
    return EVENT_TYPES[9];
  }

  if (
    haystack.includes(TimelineKeyword.Emergency) ||
    haystack.includes(TimelineKeyword.Urgent)
  )
    return EVENT_TYPES[1];
  if (haystack.includes(TimelineKeyword.Admission)) return EVENT_TYPES[2];

  // Physician progress notes must win before nursing/consult — those texts often mention
  // "nurse" or "consult" while still being physician documentation.
  if (hasPhysicianProgressNoteSignal()) return EVENT_TYPES[3];
  if (hasNursingSignal()) return EVENT_TYPES[4];
  if (hasStandaloneConsult()) return EVENT_TYPES[5];
  if (
    haystack.includes(TimelineKeyword.Therapy) ||
    haystack.includes(TimelineKeyword.Rehab)
  )
    return EVENT_TYPES[6];
  if (haystack.includes(TimelineKeyword.Diagnostic)) return EVENT_TYPES[7];
  if (
    haystack.includes(TimelineKeyword.LabReport) ||
    haystack.includes(TimelineKeyword.Lab)
  )
    return EVENT_TYPES[8];
  if (
    haystack.includes(TimelineKeyword.Imaging) ||
    haystack.includes(TimelineKeyword.Radiology) ||
    haystack.includes(TimelineKeyword.XDashRay) ||
    haystack.includes(TimelineKeyword.Xray) ||
    haystack.includes(TimelineKeyword.Mri) ||
    haystack.includes(TimelineKeyword.Ct)
  ) {
    return EVENT_TYPES[9];
  }
  if (haystack.includes(TimelineKeyword.Pathology)) return EVENT_TYPES[10];
  if (haystack.includes(TimelineKeyword.Procedure)) return EVENT_TYPES[11];
  if (
    haystack.includes(TimelineKeyword.Surgery) ||
    haystack.includes(TimelineKeyword.Operative)
  )
    return EVENT_TYPES[12];
  if (
    haystack.includes(TimelineKeyword.Anesthesia) ||
    haystack.includes(TimelineKeyword.Anaesthesia)
  )
    return EVENT_TYPES[13];
  if (haystack.includes(TimelineKeyword.PrescriptionOrder))
    return EVENT_TYPES[16];
  if (
    haystack.includes(TimelineKeyword.Pharmacy) ||
    haystack.includes(TimelineKeyword.Medication)
  )
    return EVENT_TYPES[14];
  if (
    haystack.includes(TimelineKeyword.Discharge) ||
    haystack.includes(TimelineKeyword.Transfer)
  )
    return EVENT_TYPES[15];
  if (haystack.includes(TimelineKeyword.Chiropractic)) return EVENT_TYPES[17];

  const found = EVENT_TYPES.find((config) =>
    config.keywords.some((keyword) => haystack.includes(keyword))
  );
  return found ?? EVENT_TYPES[3];
};

export const mapCareSetting = (item: MedicalTimelineEventType): CareSetting => {
  const careSetting = (item.care_setting ?? '').toLowerCase();
  if (careSetting.includes('emergency') || careSetting.includes('urgent')) {
    return 'emergency';
  }
  if (careSetting.includes('inpatient')) {
    return 'inpatient';
  }
  return 'outpatient';
};

export const getSourceFileName = (item: MedicalTimelineEventType): string => {
  const { file } = item;
  if (!file) return 'Not Provided';

  const candidates = [
    file.fileName,
    file.filename,
    file.name,
    file.originalFileName,
    file.original_filename,
    file.documentName,
    file.title,
  ];

  const normalized = candidates
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .find((value) => value.length > 0);

  return normalized ?? 'Not Provided';
};

export type TimelineMarkerVerticalLayoutParameters = {
  /** Y offset of the row band within the timeline canvas (pixels). */
  rowTopPx: number;
  /** Allocated height for this row, including stacked markers (pixels). */
  rowHeightPx: number;
  /** Number of markers drawn in this row (same event type). */
  markersInRow: number;
  /** Order index for this marker after sorting by time (`x`); drives vertical stack order. */
  stackIndexInRow: number;
  /** Preferred vertical gap between consecutive stacked markers (pixels). */
  stackGapPx: number;
  /** Marker control width/height (pixels); must match `DOT_SIZE` in the matrix. */
  markerDiameterPx: number;
};

/**
 * Computes the absolute `top` offset (pixels) for a timeline marker so stacked
 * markers stay inside their row. Row height is capped when many events stack;
 * without constraining stack extent, dots would spill into other event-type rows.
 */
export const getTimelineMarkerTopPx = (
  layout: TimelineMarkerVerticalLayoutParameters
): number => {
  const {
    rowTopPx,
    rowHeightPx,
    markersInRow,
    stackIndexInRow,
    stackGapPx,
    markerDiameterPx,
  } = layout;

  const markerBandHeightPx = Math.max(0, rowHeightPx - markerDiameterPx);

  if (markersInRow <= 1) {
    return rowTopPx + (rowHeightPx - markerDiameterPx) / 2;
  }

  const idealStackExtentPx = (markersInRow - 1) * stackGapPx;
  const constrainedStackExtentPx = Math.min(
    idealStackExtentPx,
    markerBandHeightPx
  );
  const verticalStepPx = constrainedStackExtentPx / (markersInRow - 1);
  const stackOriginTopPx =
    rowTopPx + (rowHeightPx - markerDiameterPx - constrainedStackExtentPx) / 2;

  return stackOriginTopPx + stackIndexInRow * verticalStepPx;
};
