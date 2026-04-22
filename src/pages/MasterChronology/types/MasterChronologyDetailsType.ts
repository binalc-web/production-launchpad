export type MasterChronologyCaseDetailsType = {
  chronologies: Array<MasterChronologyDetailObject>;
};

export type MasterChronologyDetailObject = {
  _id: string;
  createdAt: string;
  case: {
    _id: string;
    caseId: number;
    title: string;
    caseType: string;
  };
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    contact: string;
    avatar: string | null;
  };
};

// ── Master Chronology Timeline ────────────────────────────────────────────────

export type ChargeBreakdown = {
  hospitalCharges: number;
  physicianCharges: number;
  medicationCharges: number;
  taxes: number;
  insurancePaymentsOffsets: number;
  otherCharges: number;
};

export type BillingSummary = {
  _id: string;
  date: string;
  title: string;
  amount_billed: number;
  insurance_paid: number;
  patient_paid: number;
  patient_due: number;
  payer: string | null;
  code: string | null;
  invoice_number: string | null;
  billing_provider: string | null;
  insurance_provider: string | null;
  fileId: string;
  fileDetails?: MasterChronologyFile;
  chargeBreakdown?: ChargeBreakdown;
  translated_summary?: string;
};

export type MedicalSummary = {
  date?: string;
  title?: string;
  raw_description?: string;
  translated_summary?: string;
  location?: string;
  physician?: string | null;
  diagnoses?: string | null;
  procedure?: string | null;
  admission_date?: string | null;
  discharge_date?: string | null;
  fileId?: string;
  fileDetails?: MasterChronologyFile;
};

export type ChronologyEntry = {
  _id: string;
  billingSummary: Array<BillingSummary>;
  medicalSummary: MedicalSummary;
  status: 'matched' | 'missing_billing' | 'missing_medical';
  totalAmount: number;
  fileDetails?: Array<MasterChronologyFile>;
  combinedSummary?: string;
  /** Injected by backend when includePreviousSummary=true on an augmented version */
  previous_combinedSummary?: string | null;
  previous_medicalSummary?: string | null;
  /** Keyed by billing entry _id → previous translated_summary */
  previous_billingSummary?: Record<string, string | null> | null;
};

export type ChronologyDate = {
  date: string;
  chronologies: Array<ChronologyEntry>;
  sortDate: string;
};

export type ChronologyMonth = {
  month: string;
  dates: Array<ChronologyDate>;
};

export type MasterChronologyYear = {
  year: number;
  months: Array<ChronologyMonth>;
};

export type TimelinePagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type MasterChronologyFile = {
  _id: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  mimeType: string;
};

export type MasterChronologyTimelineType = {
  masterChronologies: Array<MasterChronologyYear>;
  pagination: TimelinePagination;
  name: string;
  files: Array<MasterChronologyFile>;
};
