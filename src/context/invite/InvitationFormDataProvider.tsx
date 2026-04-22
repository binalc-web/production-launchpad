import { type ReactNode, type FC, useState } from 'react';
import { InvitationFormDataContext } from './InvitationFormDataContext';
import type { InvitationFormData } from '@/pages/PatientRegister';

export const InvitationFormDataProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [invitationFormData, setInvitationFormDataState] = useState<
    Partial<InvitationFormData>
  >({});

  const setInvitationFormData = (data: Partial<InvitationFormData>): void => {
    setInvitationFormDataState((previous) => ({ ...previous, ...data }));
  };

  const clearInvitationFormData = (): void => {
    setInvitationFormDataState({});
  };

  return (
    <InvitationFormDataContext.Provider
      value={{
        invitationFormData,
        setInvitationFormData,
        clearInvitationFormData,
      }}
    >
      {children}
    </InvitationFormDataContext.Provider>
  );
};
