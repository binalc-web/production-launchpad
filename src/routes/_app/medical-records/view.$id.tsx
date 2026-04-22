import { createFileRoute } from '@tanstack/react-router';
import ViewRecord from '@/pages/MedicalRecords/ViewRecord';

export const Route = createFileRoute('/_app/medical-records/view/$id')({
  component: ViewRecord,
});
