export type MedicalRecordDetailsType = {
  billingOrMedicalId?: string;
  recordDateRange: {
    startDate: string;
    endDate: string;
  };
  _id: string;
  caseId:
    | string
    | {
        caseId: string;
      };
  patientId: {
    avatar: string | undefined;
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    contact: string;
  };
  status: string;
  provider: string;
  recordType: 'billing';
  caseType?: string;
  medicalTreatmentFacilities: Array<string>;
  files: Array<{
    name: string;
    newFileName: string;
    key: string;
    mimeType: string;
    s3Location: string;
    createdAt: string;
    _id?: string;
    convertedFileMimeType?: string;
    fileSize: number;
    documentProcessStages: string;
  }>;
  documents: Array<{
    author: string;
    category: string;
    id: string;
    contentType: string;
    status: string;
    fileId: string;
  }>;
  createdAt: string;
  updatedAt: string;
};
