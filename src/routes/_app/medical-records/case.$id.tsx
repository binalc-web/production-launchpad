import MedicalRecordsByCase from '@/pages/MedicalRecords/MedicalRecordsByCase';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/medical-records/case/$id')({
  component: MedicalRecordsByCase,
});
