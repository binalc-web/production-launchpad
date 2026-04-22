/**
 * Type definition for a single row in the Billing Chronology table.
 *
 * This type represents the structure of data displayed in the Billing Chronology table,
 * including details about the invoice, patient, billing amount, date of service, and provider.
 */
export type BillingChronologyTableType = {
  _id: string;
  createdAt: string;
  invoice_number: string;
  patient: {
    firstName: string;
    lastName: string;
    email: string;
    contact: string;
    avatar?: string; // Optional field for patient avatar
  };
  case: {
    caseId: string;
  };
};
