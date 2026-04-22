import { EpicCallback } from '@/pages/EPIC/EpicCallback';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/callback')({
  component: EpicCallback,
});
