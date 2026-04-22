export type organizationAdmin = {
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  contact: string;
};

export type organization = {
  organizationId: string;
  organizationType: string;
  name: string;
  email: string;
  contact: string;
  isDeactivated?: boolean;
  isDeleted?: boolean;
  address?: string;
  _id: string;
  organizationAdmin: organizationAdmin;
};
