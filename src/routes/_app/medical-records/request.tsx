import { createFileRoute } from '@tanstack/react-router';
import RequestRecord from '@/pages/MedicalRecords/RequestRecord';

export const Route = createFileRoute('/_app/medical-records/request')({
  component: RequestRecord,
});
