import { type ReactNode, type FC, useState } from 'react';
import { FormDataContext } from './FormDataContext';
import type { FormData } from '@/pages/Register/steps/RegistrationForm';

export const FormDataProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [formData, setFormDataState] = useState<Partial<FormData>>({});

  const setFormData = (data: Partial<FormData>): void => {
    setFormDataState((previous) => ({ ...previous, ...data }));
  };

  const clearFormData = (): void => {
    setFormDataState({});
  };

  return (
    <FormDataContext.Provider value={{ formData, setFormData, clearFormData }}>
      {children}
    </FormDataContext.Provider>
  );
};
