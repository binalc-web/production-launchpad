import BasicUserDetails from '@/pages/PatientRegister/BasicUserDetails';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/auth/patient-register/_layout/basic-details')({
  component: BasicUserDetails,
});
