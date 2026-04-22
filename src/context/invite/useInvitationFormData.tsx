import { useContext } from 'react';
import {
  InvitationFormDataContext,
  type InvitationFormDataContextType,
} from './InvitationFormDataContext';

export const useInvitationFormData = (): InvitationFormDataContextType => {
  const context = useContext(InvitationFormDataContext);
  if (!context) {
    throw new Error(
      'useInvitationFormData must be used within a InvitationFormDataProvider'
    );
  }
  return context;
};
