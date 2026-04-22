/**
 * Mock data for Audits and Reports records.
 *
 * This array simulates a list of audit and report records for testing and development purposes.
 * Each record contains details about the report, patient, action performed, and the person who performed it.
 */

export const mockAuditsAndReportsRecords = Array.from(
  { length: 20 },
  (_, index) => ({
    /**
     * Unique identifier for the report.
     */
    reportId: index + 1,

    /**
     * Unique identifier for the case associated with the report.
     */
    caseId: index + 1,

    /**
     * Details of the patient associated with the report.
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
     * Date and time when the action was performed, in ISO format.
     *
     * This is calculated as `i` days from the current date.
     */
    dateAndTime: new Date(Date.now() + index * 86400000).toISOString(), // i days from now

    /**
     * Description of the action performed.
     */
    actionPerformed: `${index + 1} data data data data data ${index + 1 * index}`,

    /**
     * Details of the person who performed the action.
     */
    performByDetails: {
      /**
       * Full name of the person who performed the action.
       */
      name: `Performed${index + 1} Last${index + 1}`,
    },
  })
);
