/**
 * Type definition for a single row in the Medical Chronology table.
 *
 * This type represents the structure of data displayed in the Medical Chronology table,
 * including details about the case, patient, and chronology generation date.
 */
export type MedicalChronologyTableType = {
  /**
   * Unique identifier for the medical case.
   */
  _id: string;

  // category: string;

  case: {
    caseId: string;
  };

  patient: {
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string; // Optional field for patient avatar
  };
  medicalRecordId?: string;
  /**
   * Unique identifier for the request associated with the medical record.
   */
  fileId: string;

  createdAt: string;

  // status: string;
};
