import { createFileRoute } from '@tanstack/react-router';
import { EmailVerification } from '@/pages/Register/steps/EmailVerification';

export const Route = createFileRoute('/auth/register/_layout/otp-validation')({
  component: EmailVerification,
});
