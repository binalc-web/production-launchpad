import { roles } from '@/pages/Register/steps/data';

export type SubRole = {
  title: string;
  role: string;
};

export const getSubRolesFromOrganizationType = (
  organizationType: string
): Array<SubRole> => {
  if (organizationType === 'hospital') {
    return roles.find((role) => role.role === 'hospital_user')?.subRoles || [];
  } else if (organizationType === 'estate_representative') {
    return (
      roles.find((role) => role.role === 'estate_representative_user')
        ?.subRoles || []
    );
  } else if (organizationType === 'insurance_company') {
    return roles.find((role) => role.role === 'insurance_user')?.subRoles || [];
  } else if (organizationType === 'third_party_administrator') {
    return (
      roles.find((role) => role.role === 'third_party_administrator_user')
        ?.subRoles || []
    );
  }

  return roles.find((role) => role.role === 'legal_user')?.subRoles || [];
};
