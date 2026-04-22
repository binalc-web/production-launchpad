/**
 * Type definition for a single row in the Medical Documents table.
 *
 * This type represents the structure of data displayed in the Medical Documents table,
 * including details about the document, its tag, and the date it was uploaded.
 */
export type MedicalDocumentTableType = {
  /**
   * Unique identifier for the document.
   */
  documentId: string;

  /**
   * Name of the document.
   */
  documentName: string;

  /**
   * Date when the document was uploaded, in ISO format.
   */
  uploadedDate: string; // ISO date string
};
