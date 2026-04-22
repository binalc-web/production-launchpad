export type User = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  contact: string;
  avatar: string;
  isDeactivated?: boolean;
  _id: string;
  isOrganizationAdmin?: boolean;
  organization?: {
    name: string;
    email: string;
  };
};
