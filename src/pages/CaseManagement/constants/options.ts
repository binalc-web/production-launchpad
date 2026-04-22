import avatar1 from '@assets/avatars/avatar-1.png';
import avatar2 from '@assets/avatars/avatar-2.png';
import avatar3 from '@assets/avatars/avatar-3.png';
import avatar4 from '@assets/avatars/avatar-4.png';
import avatar5 from '@assets/avatars/avatar-5.png';
import avatar6 from '@assets/avatars/avatar-6.png';

export type OptionType = {
  value: string;
  label: string;
  avatar?: string;
  lawFirm?: string;
};

export type CommonType = {
  [key: string]: string;
};

export const CASE_STATUS_OPTIONS: Array<OptionType> = [
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In Review' },
  { value: 'closed', label: 'Closed' },
];

export const FILE_TYPE_OPTIONS: Array<OptionType> = [
  { value: 'ocr_medical', label: 'Medical Document' },
  { value: 'ocr_billing', label: 'Billing Document' },
  { value: 'other', label: 'Other Document' },
];

export const PEOPLE_OPTIONS: Array<OptionType> = [
  {
    value: 'self',
    label: 'Self',
    avatar: avatar1,
    lawFirm: 'Justice & Associates Law Firm',
  },
  {
    value: 'jakob',
    label: 'Jakob Carder',
    avatar: avatar2,
    lawFirm: 'Pinnacle Legal Group',
  },
  {
    value: 'terry',
    label: 'Terry Donin',
    avatar: avatar3,
    lawFirm: 'Guardian Law Partners',
  },
  {
    value: 'craig',
    label: 'Craig Press',
    avatar: avatar4,
    lawFirm: 'Noble Counsel Attorneys',
  },
  {
    value: 'nolan',
    label: 'Nolan Dokidis',
    avatar: avatar5,
    lawFirm: 'Summit Legal Advisors',
  },
  {
    value: 'makenna',
    label: 'Makenna Vetrovs',
    avatar: avatar6,
    lawFirm: 'ABCD Law Firm',
  },
];

export const AUTHORIZING_PERSON_OPTIONS: Array<OptionType> = [
  { value: 'self', label: 'Self (Individual Client/Patient)' },
  { value: 'guardian', label: 'Guardian/Social Worker' },
  { value: 'power_of_attorney', label: 'Power of Attorney/Trustee' },
];

// This is a list of options for the "Interested Third Party Type" dropdown in the case management form.
// It includes various types of interested third parties that can be selected by the user.
// Each option has a value and a label for display purposes.
// The value is used for form submission, while the label is what the user sees in the dropdown.
// The options include:
// - Collaborating Legal Team
// - Expert Witnesses
// - Deponents
// - Opposing Legal Team
// - Insurance Adjuster
// - Judge
// - Magistrate
// - Mediator
// - Arbitrator
// - Other
// This list can be extended or modified as needed to include additional interested third party types.
// The options are defined as an array of objects, where each object contains a value and a label.
export const INTERESTED_THIRD_PARTY_TYPE_OPTIONS: Array<OptionType> = [
  { value: 'collaborating_legal_team', label: 'Collaborating Legal Team' },
  { value: 'expert_witnesses', label: 'Expert Witnesses' },
  { value: 'deponents', label: 'Deponents' },
  { value: 'opposing_legal_team', label: 'Opposing Legal Team' },
  { value: 'insurance_adjuster', label: 'Insurance Adjuster' },
  { value: 'judge', label: 'Judge' },
  { value: 'magistrate', label: 'Magistrate' },
  { value: 'mediator', label: 'Mediator' },
  { value: 'arbitrator', label: 'Arbitrator' },
  { value: 'other', label: 'Other' },
];

// This is a list of options for the "Case Type" dropdown in the case management form.
// It includes various types of cases that can be selected by the user.
// Each option has a value and a label for display purposes.
// The value is used for form submission, while the label is what the user sees in the dropdown.
// The options include:
// - Personal Injury
// - Medical Malpractice
// - Workers' Compensation
// - Disability Determination
// - Class Action
// - Wrongful Death
// - Insurance Claim
// - Other
// This list can be extended or modified as needed to include additional case types.
// The options are defined as an array of objects, where each object contains a value and a label.
export const CASE_TYPE_OPTIONS: Array<OptionType> = [
  { value: 'personal_injury', label: 'Personal Injury' },
  { value: 'medical_malpractice', label: 'Medical Malpractice' },
  { value: 'workers_compensation', label: "Workers' Compensation" },
  { value: 'disability_determination', label: 'Disability Determination' },
  { value: 'class_action', label: 'Class Action' },
  { value: 'wrongful_death', label: 'Wrongful Death' },
  { value: 'insurance_claim', label: 'Insurance Claim' },
  { value: 'other', label: 'Other' },
];

export const taskStatus = (status: string): string => {
  if (status === 'todo') return 'To Do';
  else if (status === 'in_progress') return 'In Progress';
  else if (status === 'in_review') return 'In Review';

  return 'Completed';
};

export const DOCUMENTS: Array<CommonType> = [
  {
    size: '5 MB',
    type: 'Consent',
    date: '02-03-2025',
    status: 'check_status',
    name: 'Client Consent & Authorization Form.pdf',
  },
  {
    size: '2 MB',
    type: 'Medical Records',
    date: '02-03-2025',
    status: 'protected',
    name: 'Full Medical Record Set.pdf',
  },
  {
    size: '5 MB',
    type: 'Chronology',
    date: '02-03-2025',
    status: 'protected',
    name: 'Medical Chronology Report.pdf',
  },
  {
    size: '5 MB',
    type: 'Expert Report',
    date: '02-03-2025',
    status: 'check_status',
    name: 'Expert Witness Report & Testimony Summary.pdf',
  },
  {
    size: '5 MB',
    type: 'Deposition',
    date: '02-03-2025',
    status: 'unprotected',
    name: 'Deposition Transcript.pdf',
  },
  {
    size: '5 MB',
    type: 'Consent',
    date: '02-03-2025',
    status: 'check_status',
    name: 'Client Consent & Authorization Form.pdf',
  },
  {
    size: '2 MB',
    type: 'Medical Records',
    date: '02-03-2025',
    status: 'protected',
    name: 'Full Medical Record Set.pdf',
  },
  {
    size: '5 MB',
    type: 'Chronology',
    date: '02-03-2025',
    status: 'protected',
    name: 'Medical Chronology Report.pdf',
  },
  {
    size: '5 MB',
    type: 'Expert Report',
    date: '02-03-2025',
    status: 'check_status',
    name: 'Expert Witness Report & Testimony Summary.pdf',
  },
  {
    size: '5 MB',
    type: 'Deposition',
    date: '02-03-2025',
    status: 'unprotected',
    name: 'Deposition Transcript.pdf',
  },
];

export const DOCUMENT_COLORS: Record<
  string,
  { bgcolor: string; color: string; borderColor: string }
> = {
  Consent: {
    bgcolor: '#FEF2F2',
    color: 'error.dark',
    borderColor: '#FCCFD1',
  },
  'Medical Records': {
    bgcolor: '#EEFFF1',
    color: 'success.dark',
    borderColor: '#B2FFC4',
  },
  Chronology: {
    bgcolor: '#EEFFF1',
    color: 'success.dark',
    borderColor: '#B2FFC4',
  },
  'Expert Report': {
    bgcolor: '#EEFFF1',
    color: 'success.dark',
    borderColor: '#B2FFC4',
  },
  Deposition: {
    bgcolor: '#F1F5FD',
    color: 'info.dark',
    borderColor: '#C5D6F8',
  },
};

export const TASKS_COLORS: Record<
  string,
  { bgcolor: string; color: string; borderColor: string }
> = {
  low: {
    bgcolor: '#EEFFF1',
    color: 'success.dark',
    borderColor: '#B2FFC4',
  },
  high: {
    bgcolor: '#FEF2F2',
    color: 'error.dark',
    borderColor: '#FCCFD1',
  },
  medium: {
    bgcolor: '#FBF7EB',
    color: 'warning.dark',
    borderColor: '#F0D498',
  },
};

export const TASKS_STATUS_COLORS: Record<
  string,
  { bgcolor: string; color: string }
> = {
  todo: {
    bgcolor: '#576172',
    color: '#fff',
  },

  // eslint-disable-next-line camelcase
  in_review: {
    bgcolor: '#CE8324',
    color: '#fff',
  },

  // eslint-disable-next-line camelcase
  in_progress: {
    bgcolor: '#3957D7',
    color: '#fff',
  },
  completed: {
    bgcolor: '#00A92A',
    color: '#fff',
  },
};

export const TASKS = {
  'to-do': [
    {
      attachments: 2,
      priority: 'low',
      date: '04-15-2025',
      title: 'Submit Medical Record Request',
      assignee: {
        firstName: 'Paityn',
        lastName: 'Calzoni',
      },
    },
    {
      attachments: 3,
      priority: 'high',
      date: '11-22-2025',
      title: 'Review Retrieved Medical Records',
      assignee: {
        firstName: 'Adison',
        lastName: 'Dorwart',
      },
    },
  ],
  'in-progress': [
    {
      attachments: 2,
      priority: 'low',
      date: '04-15-2025',
      title: 'Submit Medical Record Request',
      assignee: {
        firstName: 'Paityn',
        lastName: 'Calzoni',
      },
    },
  ],
  completed: [
    {
      attachments: 3,
      priority: 'high',
      date: '11-22-2025',
      title: 'Review Retrieved Medical Records',
      assignee: {
        firstName: 'Adison',
        lastName: 'Dorwart',
      },
    },
  ],
};

export const DELETE_REASONS = [
  'Uploaded the wrong document',
  'Re-uploading an updated version',
  'Attached document to the wrong case/client',
  'Document contains errors or missing information',
  'No longer needed for this submission',
  'Other reason',
];
