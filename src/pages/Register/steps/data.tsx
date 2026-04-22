export const roles = [
  {
    role: 'patient',
    title: 'Patient',
  },
  {
    role: 'parent',
    title: 'Parent',
  },
  { 
    role: 'trustee',
    title: 'Trustee',
  },
  {
    role:'durable_power_of_attorney',
    title: 'Durable Power of Attorney',
  },
  {
    role: 'medical_professional',
    title: 'Medical Professionals',
    subRoles: [
      {
        title: 'Medical Doctors',
        role: 'medical_doctor',
      },
      {
        title: 'Hospitals/ Clinics',
        role: 'hospitals_clinics',
      },
    ],
  },
  {
    role: 'legal_user',
    title: 'Legal Professionals',
    subRoles: [
      {
        title: 'Attorney',
        role: 'attorney',
      },
      {
        title: 'Supervising Attorney',
        role: 'supervising_attorney',
      },
      {
        title: 'Paralegal',
        role: 'paralegal',
      },
      {
        title: 'Legal Assistant',
        role: 'legal_assistant',
      },
      {
        title: 'Expert Witness Coordinator',
        role: 'expert_witness_coordinator',
      },
      {
        title: 'Claims & Insurance Liaison',
        role: 'claims_and_insurance_liaison',
      },
      {
        title: 'Private Investigator/Case Researcher',
        role: 'private_investigator_case_researcher',
      },
      {
        title: 'Case Manager',
        role: 'case_manager',
      },
    ],
  },
  {
    role: 'admin',
    title: 'Super Admin/ Admin',
  },
  {
    role: 'hospital_user',
    title: 'Hospital Users',
    subRoles: [
      {
        title: 'Physician',
        role: 'physician',
      },
      {
        title: 'Nurse',
        role: 'nurse',
      },
      {
        title: 'Nurse Manager',
        role: 'nurse_manager',
      },
      {
        title: 'Certified Medical Assistant',
        role: 'certified_medical_assistant',
      },
      {
        title: 'Advanced Practice Provider - Physician Assistant',
        role: 'advanced_practice_provider_pa',
      },
      {
        title: 'Advanced Practice Provider - Nurse Practitioner',
        role: 'advanced_practice_provider_np',
      },
      {
        title: 'Advanced Practice Provider - Certified Nurse Midwife',
        role: 'advanced_practice_provider_cnm',
      },
      {
        title: 'Office Manager',
        role: 'office_manager',
      },
      {
        title: 'Administrative Assistant',
        role: 'administrative_assistant',
      },
      {
        title: 'Medical Office Assistant',
        role: 'medical_office_assistant',
      },
      {
        title: 'Medical Records Specialist',
        role: 'medical_records_specialist',
      },
      {
        title: 'Clinical Pharmacist',
        role: 'clinical_pharmacist',
      },
      {
        title: 'Chiropractor',
        role: 'chiropractor',
      },
      {
        title: 'Other Allied Health Professional',
        role: 'other_allied_health_professional',
      },
      {
        title: 'Pharmacist',
        role: 'pharmacist',
      },
      {
        title: 'Advanced Practice Provider',
        role: 'advanced_practice_provider',
      },
      {
        title: 'Certified Registered Nurse Anesthetist',
        role: 'certified_registered_nurse_anesthetist',
      },
    ],
  },

  {
    role: 'estate_representative_user',
    title: 'Estate Representative',
    subRoles: [
      {
        title: 'Estate Representative',
        role: 'estate_representative',
      },
    ],
  },

  {
    role: 'insurance_user',
    title: 'Insurance User',
    subRoles: [
      {
        title: 'Claims Adjuster',
        role: 'claims_adjuster',
      },
      {
        title: 'Claims Examiner',
        role: 'claims_examiner',
      },
      {
        title: 'Claims Specialist',
        role: 'claims_specialist',
      },
      {
        title: 'Nurse Case Manager',
        role: 'nurse_case_manager',
      },
      {
        title: 'Case Manager',
        role: 'case_manager',
      },
      {
        title: 'Eligibility Specialist',
        role: 'eligibility_specialist',
      },
      {
        title: 'Underwriter',
        role: 'underwriter',
      },
      {
        title: 'Administrative Assistant',
        role: 'administrative_assistant',
      },
    ],
  },

  {
    role: 'third_party_administrator_user',
    title: 'Third Party Administrator User',
    subRoles: [
      {
        title: 'Claims Adjuster',
        role: 'claims_adjuster',
      },
      {
        title: 'Claims Examiner',
        role: 'claims_examiner',
      },
      {
        title: 'Claims Specialist',
        role: 'claims_specialist',
      },
      {
        title: 'Nurse Case Manager',
        role: 'nurse_case_manager',
      },
      {
        title: 'Case Manager',
        role: 'case_manager',
      },
      {
        title: 'Eligibility Specialist',
        role: 'eligibility_specialist',
      },
      {
        title: 'Underwriter',
        role: 'underwriter',
      },
      {
        title: 'Administrative Assistant',
        role: 'administrative_assistant',
      },
    ],
  },

  {
    role: 'interested_third_party',
    title: 'Interested Third Party',
    subRoles: [
      {
        title: 'Collaborating Legal Team',
        role: 'collaborating_legal_team',
      },
      {
        title: 'Expert Witnesses',
        role: 'expert_witnesses',
      },
      {
        title: 'Deponents',
        role: 'deponents',
      },
      {
        title: 'Opposing Legal Team',
        role: 'opposing_legal_team',
      },
    ],
  },
];

export const rolesForSignUp = [
  {
    role: 'legal_user',
    title: 'Legal Professionals',
    subRoles: [
      {
        title: 'Attorney',
        role: 'attorney',
      },
      {
        title: 'Supervising Attorney',
        role: 'supervising_attorney',
      },
      {
        title: 'Paralegal',
        role: 'paralegal',
      },
      {
        title: 'Legal Assistant',
        role: 'legal_assistant',
      },
      {
        title: 'Expert Witness Coordinator',
        role: 'expert_witness_coordinator',
      },
      {
        title: 'Claims & Insurance Liaison',
        role: 'claims_and_insurance_liaison',
      },
      {
        title: 'Private Investigator/Case Researcher',
        role: 'private_investigator_case_researcher',
      },
      {
        title: 'Case Manager',
        role: 'case_manager',
      },
    ],
  },
];

export const organizationTypes = [
  {
    type: 'legal_firm',
    title: 'Legal Firm',
  },
  {
    type: 'hospital',
    title: 'Hospital',
  },
  {
    type: 'insurance_adjuster',
    title: 'Insurance Adjuster',
  },
  { title: 'Estate Representative', type: 'estate_representative' },

  {
    title: 'Third Party Administrator',
    type: 'third_party_administrator',
  },
];

export const IndividualEntityRole = [
  {
    type: 'patient',
    title: 'Patient',
  },
  {
    type: 'parent',
    title: 'Parent',
  },
  {
    type: 'trustee',
    title: 'Trustee',
  },
  { title: 'Durable Power of Attorney', type: 'durable_power_of_attorney' },
];
