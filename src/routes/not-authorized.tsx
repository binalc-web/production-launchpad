import { createFileRoute } from '@tanstack/react-router';
import NotAuthorized from '../pages/NotAuthorized';

export const Route = createFileRoute('/not-authorized')({
  component: NotAuthorized,
});
