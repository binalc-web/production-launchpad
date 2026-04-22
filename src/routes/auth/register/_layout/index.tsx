import { createFileRoute } from '@tanstack/react-router';
import { Register } from '@/pages/Register/index';

export const Route = createFileRoute('/auth/register/_layout/')({
  component: Register,
});
