/**
 * Mock data for Billing Chronology records.
 *
 * This array simulates a list of billing chronology records for testing and development purposes.
 * Each record contains details about the invoice, patient, billing amount, date of service, and provider.
 */

export const mockBillingChronologyRecords = Array.from(
  { length: 20 },
  (_, index) => ({
    /**
     * Unique identifier for the invoice.
     */
    invoiceId: index + 1,

    /**
     * Billing code associated with the invoice.
     */
    billingCode: index + 1,

    /**
     * Details of the patient associated with the billing record.
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
     * Total billing amount for the invoice.
     */
    billingAmount: index + 1,

    /**
     * Date of service for the billing record, in ISO format.
     *
     * This is calculated as `i` days from the current date.
     */
    dateOfService: new Date(Date.now() + index * 86400000).toISOString(), // i days from now

    /**
     * Details of the provider associated with the billing record.
     */
    providerDetails: {
      /**
       * Full name of the provider.
       */
      name: `Provider${index + 1} Last${index + 1}`,
    },
  })
);
