export type OrganizationDetails = {
  name: string;
  email: string;
};

export type OrganizationAdmin = {
  name: string;
  email: string;
  avatar: string;
};

export type OrganizationTableType = {
  _id: string;
  organizationId: string;
  organizationDetails: OrganizationDetails;
  contact: string;
  isDeactivated: boolean;
  isDeleted: boolean;
  organizationAdmin: OrganizationAdmin;
  organizationType: string;
};
