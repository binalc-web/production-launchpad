import BasicUserDetails from '@/pages/PatientRegister/BasicUserDetails';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/auth/legal-user-register/_layout/basic-details')({
  component: BasicUserDetails,
});
