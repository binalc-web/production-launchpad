import { createFileRoute } from '@tanstack/react-router';
import MedicalChronology from '@/pages/MedicalChronology';

export const Route = createFileRoute('/_app/medical-chronology/')({
  component: MedicalChronology,
});
