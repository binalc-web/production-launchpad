import { createFileRoute } from '@tanstack/react-router';
import PatientRegister from '@/pages/PatientRegister';

export const Route = createFileRoute('/auth/patient-register/_layout/')({
  component: PatientRegister,
});
