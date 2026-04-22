import * as yup from 'yup';
import { passwordRegex } from '@/utils/regex';

export const AccountSettingsSchema = yup.object().shape({
  oldPassword: yup
    .string()
    .min(
      8,
      'Password must be at least 8 characters, with upper & lowercase, a symbol or a number.'
    )
    .matches(
      passwordRegex,
      'Password must be at least 8 characters, with upper & lowercase, a number, and a special character.'
    )
    .required('Password is required'),

  newPassword: yup
    .string()
    .min(
      8,
      'New password must be at least 8 characters, with upper & lowercase, a symbol or a number.'
    )
    .matches(
      passwordRegex,
      'New Password must be at least 8 characters, with upper & lowercase, a number, and a special character.'
    )
    .required('Password is required')
    .test(
      'not-same-as-old',
      'New Password must be different from the current Password.',
      function (value) {
        return value !== this.parent.oldPassword;
      }
    ),

  confirmNewPassword: yup
    .string()
    .required('Confirm Password is required')
    .when('newPassword', (newPassword, schema) =>
      newPassword
        ? schema.oneOf(
            [yup.ref('newPassword')],
            'Confirm Password must match the New Password'
          )
        : schema
    ),
});
