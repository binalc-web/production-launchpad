/**
 * This function is used to get user role based on organization type.
 * @param organizationType type of organization.
 * @returns user role based on organization type.
 */
export const getUserRoleByOrganizationType = (
  organizationType: string
): string => {
  if (organizationType === 'legal_firm') {
    return 'legal_user';
  }

  if (organizationType === 'hospital') {
    return 'hospital_user';
  }

  if (organizationType === 'estate_representative') {
    return 'estate_representative_user';
  }

  if (organizationType === 'insurance_adjuster') {
    return 'insurance_user';
  }

  if (organizationType === 'third_party_administrator') {
    return 'third_party_administrator_user';
  }

  throw new Error('Invalid organization type');
};
