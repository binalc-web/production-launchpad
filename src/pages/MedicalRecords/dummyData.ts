// This file contains mock data for the Medical Records page.
// It is used to simulate the data that would be fetched from an API.
// This is useful for development and testing purposes.
// The data is structured to match the expected format of the API response.
// The data is not real and should not be used in production.
// The data is generated using a simple function that creates an array of objects.
// Each object represents a medical record request and contains the following fields:
// - caseId: a unique identifier for the medical record request
// - requestId: a unique identifier for the request
// - patientDetails: an object containing the patient's name and email address
// - recordStatus: the status of the medical record request (completed, failed, in_progress)
// - recordRetrievalDate: the date the medical record was retrieved (in ISO format)
export const mockMedicalRecords = Array.from({ length: 20 }, (_, index) => ({
  caseId: index + 1,
  requestId: index + 1,
  patientDetails: {
    name: `First${index + 1} Last${index + 1}`,
    email: `user${index + 1}@example.com`,
  },
  recordProvider: index % 3 === 0 ? 'Other' : 'EHR',
  recordStatus:
    index % 3 === 0 ? 'completed' : index % 3 === 1 ? 'failed' : 'in_progress',
  recordRetrievalDate: new Date(Date.now() + index * 86400000).toISOString(), // i days from now
  actions: ['view', ...(index % 2 === 0 ? ['cancel'] : ['refresh'])],
}));
