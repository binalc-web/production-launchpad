import { createFileRoute } from '@tanstack/react-router';
import ChronologyTimeline from '@/pages/MedicalChronology/timeline';

export const Route = createFileRoute('/_app/medical-chronology/timeline/$id')({
  component: ChronologyTimeline,
});
