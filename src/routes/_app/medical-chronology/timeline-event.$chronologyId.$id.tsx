import { createFileRoute } from '@tanstack/react-router';
import TimelineEvent from '@/pages/MedicalChronology/timeline/EventTimelineDetail';

export const Route = createFileRoute(
  '/_app/medical-chronology/timeline-event/$chronologyId/$id'
)({
  component: TimelineEvent,
});
