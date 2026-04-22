import { createFileRoute } from '@tanstack/react-router';
import { InvitationLayout } from '@/layouts/InvitationLayout';

export const Route = createFileRoute('/auth/patient-register/_layout')({
  component: InvitationLayout,
});
