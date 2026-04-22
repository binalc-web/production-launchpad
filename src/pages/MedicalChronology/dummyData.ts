/**
 * Mock data for Medical Chronology records.
 *
 * This array simulates a list of medical chronology records for testing and development purposes.
 * Each record contains details about the case, patient, record status, and chronology generation date.
 */

export const mockMedicalChronologyRecords = Array.from(
  { length: 20 },
  (_, index) => ({
    /**
     * Unique identifier for the medical case.
     */
    caseId: index + 1,

    /**
     * Unique identifier for the request associated with the medical record.
     */
    requestId: index + 1,

    /**
     * Details of the patient associated with the medical record.
     */
    patientDetails: {
      /**
       * Full name of the patient.
       */
      name: `First${index + 1} Last${index + 1}`,

      /**
       * Email address of the patient.
       */
      email: `user${index + 1}@example.com`,
    },

    /**
     * Current status of the medical record.
     *
     * - `completed`: The record has been successfully retrieved.
     * - `failed`: The record retrieval failed.
     * - `in_progress`: The record retrieval is ongoing.
     */
    recordStatus:
      index % 3 === 0
        ? 'completed'
        : index % 3 === 1
          ? 'failed'
          : 'in_progress',

    /**
     * Date when the chronology was generated, in ISO format.
     *
     * This is calculated as `i` days from the current date.
     */
    chronologyGenerationDate: new Date(
      Date.now() + index * 86400000
    ).toISOString(), // i days from now
  })
);
