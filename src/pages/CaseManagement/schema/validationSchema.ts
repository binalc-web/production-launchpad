import * as yup from 'yup';

export const addCaseSchema = yup.object().shape({
  patientId: yup.string().required('Patient is required'),
  caseTitle: yup
    .string()
    .min(4, 'Case title must be at least 4 characters')
    .required('Case title is required'),
  caseStatus: yup.string().required('Case status is required'),
  caseType: yup.string().required('Case type is required'),
  date: yup
    .date()
    .typeError('Invalid date')
    .required('Case Start date is required'),
  assigneeName: yup.string().required('Assignee is required'),
  interestedThirdPartyType: yup
    .mixed()
    .test(
      'is-string-or-array',
      'Must be a string or an array of strings',
      (value) =>
        value === undefined ||
        typeof value === 'string' ||
        (Array.isArray(value) && value.every((v) => typeof v === 'string'))
    )
    .optional(),
  interestedThirdPartyName: yup.array().when('interestedThirdPartyType', {
    is: (value: string) => value && value.length > 0,
    then: (schema) =>
      schema
        .min(1, 'Interested Third Party Name is required')
        .required('Interested Third Party Name is required'),
    otherwise: (schema) => schema.optional(),
  }),
  authorizingPerson: yup.string().required('Authorizing Person is required'),
  attorneyName: yup.string().when('authorizingPerson', {
    is: 'guardian',
    then: (schema) => schema.required('Guardian Name is required'),
    otherwise: (schema) =>
      schema.when('authorizingPerson', {
        is: 'power_of_attorney',
        then: (schema) => schema.required('Attorney Name is required'),
        otherwise: (schema) => schema.optional(),
      }),
  }),
});
