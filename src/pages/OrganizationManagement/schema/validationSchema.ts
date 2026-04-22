import * as yup from 'yup';
import { usPhoneNumberRegex, nameRegex } from '@/utils/regex';

export const AddOrganizationSchema = yup.object().shape({
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

  userEmail: yup
    .string()
    .email('Invalid email format')
    .required('Email is required'),

  userContact: yup
    .string()
    .required('Phone number is required')
    .test('phone-format', 'Invalid US phone number format', (value) =>
      usPhoneNumberRegex.test(value || '')
    ),

  name: yup
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(30, 'Name must be at most 30 characters')
    .matches(nameRegex, ' name should only contain alphabets.')
    .required('Name is required'),

  address: yup.string().default(''),

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
});
