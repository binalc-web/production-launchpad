import { createFileRoute } from '@tanstack/react-router';
import ClearMEVerification from '@/pages/PatientRegister/ClearMEVerification';

export const Route = createFileRoute('/clearme-verification')({
  component: ClearMEVerification,
});
