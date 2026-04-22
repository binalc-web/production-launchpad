export type FormData = {
  patientId: string;
  caseTitle: string;
  caseStatus: string;
  caseType: string;
  assigneeName: string;
  date: Date | null;
  interestedThirdPartyType?: string | Array<string>;
  interestedThirdPartyName: Array<string>;
  authorizingPerson: string;
  attorneyName?: string;
};

export type patientDetailsType = {
  avatar: string | null;
  businessDetails: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  subRole: string;
  _id: string;
};

export type CaseFilesType = {
  name: string;
  newFileName: string;
  key: string;
  location: string;
  mimeType: string;
};
