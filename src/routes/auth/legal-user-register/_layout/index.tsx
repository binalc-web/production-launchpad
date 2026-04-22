import LegalUserRegister from '@/pages/LegalUserRegister';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/auth/legal-user-register/_layout/')({
  component: LegalUserRegister,
});
