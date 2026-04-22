/**
 * Type definition for a single row in the Audits and Reports table.
 *
 * This type represents the structure of data displayed in the Audits and Reports table,
 * including details about the report, patient, action performed, and the person who performed it.
 */

export type patientDetails = {
  /**
   * First name of the patient.
   */
  firstName: string;
  /**
   * Last name of the patient.
   */
  lastName: string;
  /**
   * Email address of the patient.
   */
  email: string;
  /**
   * Unique identifier for the patient.
   */
  avatar?: string; // Optional field for patient avatar
};

export type AuditsAndReportsTableType = {
  /**
   * Unique identifier for the report.
   */
  _id: string;

  /**
   * Unique identifier for the case associated with the report.
   */
  auditId: string;

  case: {
    _id: string;
    caseId: string;
  };

  /**
   * Details of the patient associated with the report.
   */
  patient: patientDetails;

  /**
   * Date and time when the action was performed, in ISO format.
   */
  createdAt: string;

  /**
   * Description of the action performed.
   */
  actionPerformed: string;

  /**
   * Details of the person who performed the action.
   */
  actionOwner: patientDetails;
};
/**
 * Type definition for the Audits and Reports table.
 *
 * This type represents the structure of the Audits and Reports table,
 * including the list of records and the total number of records.
 */
