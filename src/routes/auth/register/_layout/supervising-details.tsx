import { createFileRoute } from '@tanstack/react-router';
import { SupervisingDetails } from '@/pages/Register/steps/SupervisingDetails';

export const Route = createFileRoute(
  '/auth/register/_layout/supervising-details'
)({
  component: SupervisingDetails,
});
