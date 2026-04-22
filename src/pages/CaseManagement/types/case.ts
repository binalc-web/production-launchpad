import type { Patient } from '@/pages/RoleManagement/types/patient';
import type { Assignee } from './assignee';

export type Case = {
  firstName: string;
  patient: Patient;
  title: string;
  lastName: string;
  caseType: string;
  caseId: string;
  contact: string;
  email: string;
  status: 'Open' | 'Closed' | 'In Review';
  startDate: string;
  endDate: string;
  assignee: Assignee;

  case?: {
    caseId: string;
    caseNumber: string;
  };
  _id?: string;
  caseNumber?: string;
  patientDetails?: Patient;
  provider?: string;
};

export type FormPayload = {
  caseId?: string;
  patient: string;
  caseType: string;
  title: string;
  status: string;
  startDate: string;
  assignee: string;
  authorizingPersonType: string;
  authorizedAttorney?: string;
  authorizedGuardian?: string;
  thirdPartyType?: Array<string>;
  thirdPartyUsers?: Array<string>;
  files?: Array<{
    name: string;
    newFileName: string;
    key: string;
    mimeType: string;
    location: string;
  }>;
};
