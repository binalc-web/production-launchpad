import {
  AmbulanceIcon,
  HospitalIcon,
  ClipboardTextIcon,
  FlaskIcon,
  MicroscopeIcon,
  PillIcon,
  BarbellIcon,
  PulseIcon,
  ScissorsIcon,
  StethoscopeIcon,
  SyringeIcon,
  TestTubeIcon,
  UserCheckIcon,
  WarningIcon,
  ScanIcon,
  FaceMaskIcon,
  PersonIcon,
  SignOutIcon,
  PrescriptionIcon,
} from '@phosphor-icons/react';
import type {
  CareSetting,
  CareSettingConfig,
  EventTypeConfig,
} from './medicalTimelineMatrix.types';

export const LEFT_COLUMN_WIDTH = 200;
export const ROW_HEIGHT = 58;
export const DOT_SIZE = 22;
/** Upper bound for a matrix row when many markers stack; keeps the grid scrollable. */
export const ROW_MAX_HEIGHT_PX = 160;
/** Pixels between vertically stacked markers in the same event-type row. */
export const ROW_STACK_GAP_PX = 18;
/** Nudge applied to absolute marker `top` so dots align visually with the row band. */
export const TIMELINE_MARKER_TOP_INSET_PX = 10;
export const MIN_TIMELINE_WIDTH = 960;
/** Injury date banner extends right from the line when mark is in this left slice of the timeline (%). */
export const INJURY_BANNER_EXTEND_RIGHT_MAX_PERCENT = 28;
/**
 * Injury date banner extends left from the line only when the mark is very near the right edge (%).
 * Keep this high so “right-ish but not flush” dates (e.g. mid–late range) stay centered on the line.
 */
export const INJURY_BANNER_EXTEND_LEFT_MIN_PERCENT = 90;
/** Full-width vertical stripe for the injury date (px); banner edges align to half this from center. */
export const INJURY_VERTICAL_LINE_WIDTH_PX = 2;
/** Horizontal padding inside the injury banner when it extends from an edge (tighter flush to the line). */
export const INJURY_BANNER_EDGE_PADDING_X_PX = 10;
/** Horizontal padding when the injury banner is centered on the line. */
export const INJURY_BANNER_CENTER_PADDING_X_PX = 20;
export const MONTH_COL_WIDTH = 55;
export const DAY_COL_WIDTH = 35;

export enum TimelineKeyword {
  Injury = 'injury',
  Accident = 'accident',
  Emergency = 'emergency',
  Urgent = 'urgent',
  Er = 'er',
  Admission = 'admission',
  Admitted = 'admitted',
  Physician = 'physician',
  ProgressNote = 'progress note',
  Doctor = 'doctor',
  Nursing = 'nursing',
  Nurse = 'nurse',
  Consultation = 'consultation',
  Consult = 'consult',
  Therapy = 'therapy',
  Rehab = 'rehab',
  Pt = 'pt',
  Ot = 'ot',
  Diagnostic = 'diagnostic',
  TestResult = 'test result',
  Lab = 'lab',
  Blood = 'blood',
  Imaging = 'imaging',
  Radiology = 'radiology',
  Xray = 'xray',
  Mri = 'mri',
  Ct = 'ct',
  Pathology = 'pathology',
  Biopsy = 'biopsy',
  Procedure = 'procedure',
  Surgery = 'surgery',
  Operative = 'operative',
  Anesthesia = 'anesthesia',
  Anaesthesia = 'anaesthesia',
  Medication = 'medication',
  Drug = 'drug',
  Prescription = 'prescription',
  Discharge = 'discharge',
  Transfer = 'transfer',
  PrescriptionOrder = 'prescription order',
  Chiropractic = 'chiropractic',
  DoctorVisit = 'doctor visit',
  Pharmacy = 'pharmacy',
  LabImaging = 'lab / imaging',
  LabImagingAlt = 'lab imaging',
  PhysicianProgress = 'physician progress',
  LabReport = 'lab report',
  XDashRay = 'x-ray',
}

export const EVENT_TYPES: Array<EventTypeConfig> = [
  {
    id: 'date_of_injury',
    label: 'Date of Injury',
    keywords: [TimelineKeyword.Injury, TimelineKeyword.Accident],
    Icon: WarningIcon,
  },
  {
    id: 'emergency_urgent',
    label: 'Emergency / Urgent Care',
    keywords: [
      TimelineKeyword.Emergency,
      TimelineKeyword.Urgent,
      TimelineKeyword.Er,
    ],
    Icon: AmbulanceIcon,
  },
  {
    id: 'admission',
    label: 'Admission',
    keywords: [TimelineKeyword.Admission, TimelineKeyword.Admitted],
    Icon: HospitalIcon,
  },
  {
    id: 'physician_notes',
    label: 'Physician Progress Notes',
    keywords: [
      TimelineKeyword.Physician,
      TimelineKeyword.ProgressNote,
      TimelineKeyword.Doctor,
    ],
    Icon: StethoscopeIcon,
  },
  {
    id: 'nursing_notes',
    label: 'Nursing Notes',
    keywords: [TimelineKeyword.Nursing, TimelineKeyword.Nurse],
    Icon: ClipboardTextIcon,
  },
  {
    id: 'consultation',
    label: 'Consultation Notes',
    // Only match full "consultation" in fallback find(); standalone "consult" is handled
    // in mapToEventType with a word boundary so it does not steal physician progress text.
    keywords: [TimelineKeyword.Consultation],
    Icon: UserCheckIcon,
  },
  {
    id: 'therapy',
    label: 'Therapy / Rehab Notes',
    keywords: [
      TimelineKeyword.Therapy,
      TimelineKeyword.Rehab,
      TimelineKeyword.Pt,
      TimelineKeyword.Ot,
    ],
    Icon: BarbellIcon,
  },
  {
    id: 'diagnostic',
    label: 'Diagnostic Testing Results',
    keywords: [TimelineKeyword.Diagnostic, TimelineKeyword.TestResult],
    Icon: FlaskIcon,
  },
  {
    id: 'lab',
    label: 'Lab Reports',
    keywords: [TimelineKeyword.Lab, TimelineKeyword.Blood],
    Icon: TestTubeIcon,
  },
  {
    id: 'imaging',
    label: 'Imaging / Radiology',
    keywords: [
      TimelineKeyword.Imaging,
      TimelineKeyword.Radiology,
      TimelineKeyword.Xray,
      TimelineKeyword.Mri,
      TimelineKeyword.Ct,
    ],
    Icon: ScanIcon,
  },
  {
    id: 'pathology',
    label: 'Pathology Reports',
    keywords: [TimelineKeyword.Pathology, TimelineKeyword.Biopsy],
    Icon: MicroscopeIcon,
  },
  {
    id: 'procedure',
    label: 'Procedure Notes',
    keywords: [TimelineKeyword.Procedure],
    Icon: SyringeIcon,
  },
  {
    id: 'surgery',
    label: 'Surgery / Operative Reports',
    keywords: [TimelineKeyword.Surgery, TimelineKeyword.Operative],
    Icon: ScissorsIcon,
  },
  {
    id: 'anesthesia',
    label: 'Anesthesiology Reports',
    keywords: [TimelineKeyword.Anesthesia, TimelineKeyword.Anaesthesia],
    Icon: FaceMaskIcon,
  },
  {
    id: 'medication',
    label: 'Medication Administration Record',
    keywords: [
      TimelineKeyword.Medication,
      TimelineKeyword.Drug,
      TimelineKeyword.Prescription,
    ],
    Icon: PillIcon,
  },
  {
    id: 'discharge',
    label: 'Discharge / Transfer',
    keywords: [TimelineKeyword.Discharge, TimelineKeyword.Transfer],
    Icon: SignOutIcon,
  },
  {
    id: 'prescription',
    label: 'Prescription Order',
    keywords: [TimelineKeyword.PrescriptionOrder],
    Icon: PrescriptionIcon,
  },
  {
    id: 'chiropractic',
    label: 'Chiropractic Notes',
    keywords: [TimelineKeyword.Chiropractic],
    Icon: PersonIcon,
  },
];

export const CARE_SETTING_CONFIG: Record<CareSetting, CareSettingConfig> = {
  emergency: { icon: AmbulanceIcon, color: '#F97316' },
  inpatient: { icon: HospitalIcon, color: '#3F5AD8' },
  outpatient: { icon: PulseIcon, color: '#0FB34A' },
};

export const CARE_SETTING_LABELS: Record<CareSetting, string> = {
  emergency: 'Emergency / Urgent Care',
  inpatient: 'Inpatient',
  outpatient: 'Outpatient / Ambulatory',
};
