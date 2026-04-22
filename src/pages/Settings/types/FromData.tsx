export interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  contact: string;
  streetName: string;
  country: string;
  state: string;
  city: string;
  zipCode: string;
  businessName?: string;
  avatar?: string;
  businessContact?: string;
  businessEmail?: string;
  subRoleName?: string;
  subRoleContact?: string;
  subRoleEmail?: string;
}

export interface AccountSettingsFromData {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}
