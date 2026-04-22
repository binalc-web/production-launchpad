import { createFileRoute } from '@tanstack/react-router';
import MedicalRecords from '@/pages/MedicalRecords';

export const Route = createFileRoute('/_app/medical-records/')({
  component: MedicalRecords,
});
