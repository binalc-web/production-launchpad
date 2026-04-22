export type ChronologyType = {
  date: string;
  title: string;
  raw_description: string;
  translated_summary: string;
  location: string;
  physician: string;
  _id: string;
  file: {
    _id: string;
    convertedFileMimeType: string;
  };
  previous_summary: string;
};

export type MedicalTimelineEventType = {
  _id: string;
  date: string;
  title: string;
  raw_description: string;
  translated_summary: string;
  location: string;
  physician: string;
  care_setting?: string;
  document_type?: string;
  timeline_event_type?: string;
  eventType?: string;
  file: {
    _id: string;
    fileName?: string;
    filename?: string;
    name?: string;
    originalFileName?: string;
    original_filename?: string;
    documentName?: string;
    title?: string;
  };
};

export type MedicalChronologyTimelineType = {
  chronologyId: string;
  caseId: string;
  category: string;
  events: Array<MedicalTimelineEventType>;
};

export type MedicalChronologyDetailsType = {
  _id: string;
  file: {
    _id: string;
  };
  chronologies: Array<ChronologyType>;
};

export type ChronologyCaseObjectType = {
  _id: string;
  billingOrMedicalId?: string;
  invoice_number?: string;
  code?: string;
  file: {
    _id: string;
  };
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
  medicalRecordId: string;
};
