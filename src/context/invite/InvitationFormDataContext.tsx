import { createContext } from 'react';
import type { InvitationFormData } from '@/pages/PatientRegister';

export interface InvitationFormDataContextType {
  invitationFormData: Partial<InvitationFormData>;
  setInvitationFormData: (data: Partial<InvitationFormData>) => void;
  clearInvitationFormData: () => void;
}

export const InvitationFormDataContext = createContext<
  InvitationFormDataContextType | undefined
>(undefined);
