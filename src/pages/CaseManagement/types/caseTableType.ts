export type casePatientDetails = {
  firstName: string;
  lastName: string;
  email: string;
  contact: string;
  avatar: string | undefined;
};

export type caseAssigneeDetails = {
  assigneeName: string;
  assigneeEmail: string;
  assigneeAvatar: string | undefined;
};

export type CaseTableType = {
  caseId: string;
  patient: casePatientDetails;
  caseStatus: 'Open' | 'Closed' | 'In Review';
  assigneeDetails: caseAssigneeDetails;
  caseStartEndDate: string;
};
