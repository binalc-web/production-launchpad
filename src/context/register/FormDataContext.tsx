import { createContext } from 'react';
import type { FormData } from '@/pages/Register/steps/RegistrationForm';

export interface FormDataContextType {
  formData: Partial<FormData>;
  setFormData: (data: Partial<FormData>) => void;
  clearFormData: () => void;
}

export const FormDataContext = createContext<FormDataContextType | undefined>(
  undefined
);
