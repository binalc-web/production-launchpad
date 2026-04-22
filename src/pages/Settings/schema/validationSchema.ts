import * as yup from 'yup';
import { usPhoneNumberRegex, nameRegex } from '@/utils/regex';

export const EditProfileSchema = yup.object().shape({
  firstName: yup
    .string()
    .min(3, 'First Name must be at least 3 characters')
    .max(20, 'First Name must be at most 20 characters')
    .matches(nameRegex, 'First name should only contain alphabets.')
    .required('First Name is required'),
  lastName: yup
    .string()
    .min(3, 'Last Name must be at least 3 characters')
    .max(20, 'Last Name must be at most 20 characters')
    .matches(nameRegex, 'Last name should only contain alphabets.')
    .required('Last Name is required'),
  email: yup
    .string()
    .email('Invalid email format')
    .required('Email is required'),
  contact: yup
    .string()
    .required('Phone number is required')
    .test('phone-format', 'Invalid US phone number format', (value) =>
      usPhoneNumberRegex.test(value || '')
    ),

  streetName: yup
    .string()
    .min(3, 'House No./Street Name must be at least 3 characters')
    .required('House No./Street Name is required'),

  country: yup.string().required('Country is required'),

  state: yup.string().required('State is required'),

  city: yup.string().required('City is required'),

  zipCode: yup
    .string()
    .required('Zip Code is required')
    .matches(/^\d{5,}$/, 'Zip Code must be at least 5 digits'),

  businessName: yup.string().when('$role', {
    is: (role: string) => role === 'legal_user',
    then: (schema) =>
      schema
        .min(3, 'Name must be at least 3 characters')
        .required('Name is required'),
    otherwise: (schema) => schema.notRequired(),
  }),

  businessContact: yup.string().when('$role', {
    is: (role: string) => role === 'legal_user',
    then: (schema) =>
      schema
        .required('Phone number is required')
        .test('phone-format', 'Invalid US phone number format', (value) =>
          usPhoneNumberRegex.test(value || '')
        ),
    otherwise: (schema) => schema.notRequired(),
  }),

  businessEmail: yup.string().when('$role', {
    is: (role: string) => role === 'legal_user',
    then: (schema) =>
      schema.email('Invalid email format').required('Email is required'),
    otherwise: (schema) => schema.notRequired(),
  }),

  subRoleName: yup.string().when('$role', {
    is: (role: string) => role === 'legal_user',
    then: (schema) =>
      schema
        .min(3, 'Name must be at least 3 characters')
        .required('Name is required'),
    otherwise: (schema) => schema.notRequired(),
  }),

  subRoleContact: yup.string().when('$role', {
    is: (role: string) => role === 'legal_user',
    then: (schema) =>
      schema
        .required('Phone number is required')
        .test('phone-format', 'Invalid US phone number format', (value) =>
          usPhoneNumberRegex.test(value || '')
        ),
    otherwise: (schema) => schema.notRequired(),
  }),

  subRoleEmail: yup.string().when('$role', {
    is: (role: string) => role === 'legal_user',
    then: (schema) =>
      schema.email('Invalid email format').required('Email is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
});
