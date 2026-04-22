/**
 * Type definition for a single row in the Medical Records table.
 *
 * This type represents the structure of data displayed in the Medical Records table,
 * including details about the case, patient, record status, and available actions.
 */
export type MedicalRecordTableType = {
  _id: string;
  caseId:
    | string
    | {
        caseId: string;
      };
  patientId: string;
  requestId: string;
  status: string;
  provider: string;
  retrievedAt: string;
  createdAt: string;
  updatedAt: string;
  caseFirstName: string;
  caseLastName: string;
  caseNumber: number;
  patientDetails: {
    firstName: string;
    lastName: string;
    email: string;
  };
};
