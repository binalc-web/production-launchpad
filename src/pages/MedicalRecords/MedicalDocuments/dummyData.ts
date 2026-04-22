// This file contains dummy data for the Medical Records page.
// It is used to simulate the data that would be fetched from an API.
// This is useful for development and testing purposes.
// The data is structured to match the expected format of the API response.
// The data is not real and should not be used in production.
// The data is generated using a simple function that creates an array of objects.
// Each object represents a medical record and contains the following fields:
// - documentId: a unique identifier for the medical record
// - documentName: the name of the medical record document
// - documentTag: the tag associated with the medical record (e.g., Consent, Chronology, Deposition)
// - uploadedDate: the date the medical record was uploaded (in ISO format
export const mockMedicalDocuments = Array.from({ length: 20 }, (_, index) => ({
  documentId: index + 1,
  documentName: `${index + 1} - Document Name ${index + 1}   document.pdf`,
  uploadedDate: new Date(Date.now() + index * 86400000).toISOString(), // i days from now
}));
