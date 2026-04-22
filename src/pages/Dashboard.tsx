import { useMemo, type FC } from 'react';
import { useAuth } from '../context/auth/useAuth';
import PatientDashboard from './PatientDashboard';
import LegalDashboard from './LegalDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';
import ThirdPartyDashboard from './ThirdPartyDashboard';

//TODO observe this code base
const thirdPartyRoles = [
  'third_party_administrator_user',
  'estate_representative_user',
  'insurance_user',
  'hospital_user',
];

//TODO observe this code base
const IndividualEntityRole = [
  'patient',
  'parent',
  'trustee',
  'durable_power_of_attorney',
];

const componentToRender = {
  patient: <PatientDashboard />,
  // eslint-disable-next-line camelcase
  legal_user: <LegalDashboard />,
  // eslint-disable-next-line camelcase
  super_admin: <SuperAdminDashboard />,

  ...Object.fromEntries(
    IndividualEntityRole.map((role) => [role, <PatientDashboard />])
  ),
  
  ...Object.fromEntries(
    thirdPartyRoles.map((role) => [role, <ThirdPartyDashboard />])
  ),
};

const Dashboard: FC = () => {
  const { basicUserDetails } = useAuth();
  const userRole = useMemo(
    () => basicUserDetails?.role || 'legal_user',
    [basicUserDetails?.role]
  );
  return componentToRender[
    (userRole as keyof typeof componentToRender) || 'legal_user'
  ];
};
export default Dashboard;
