export type userDetails = {
  name: string;
  email: string;
  avatar: string;
};

export type organizationDetails = {
  name: string;
  email: string;
};

export type UserTableType = {
  userDetails: userDetails;
  role: string;
  contact: string;
  isDeactivated: boolean;
  userId: string;
  isOrganizationAdmin?: boolean;
  organizationDetails?: organizationDetails;
};
