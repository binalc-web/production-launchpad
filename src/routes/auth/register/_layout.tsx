import { createFileRoute } from '@tanstack/react-router';
import { RegisterLayout } from '@/layouts/RegisterLayout';

export const Route = createFileRoute('/auth/register/_layout')({
  component: RegisterLayout,
});
