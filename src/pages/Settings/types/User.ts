type Contact = {
  name: string;
  email: string;
  contact: string;
};

export interface AddressDetails {
  streetName: string;
  city: string;
  state: string;
  country: string;
  zipCode: number;
}
export type User = {
  firstName: string;
  lastName: string;
  email: string;
  _id: string;
  isEmailNotification: boolean | null;
  contact: string | null;
  avatar: string | null;
  role: string;
  subRole: string;
  businessDetails: Contact | null;
  subRoleDetails: Contact | null;
  addressDetails: AddressDetails | null;
};
