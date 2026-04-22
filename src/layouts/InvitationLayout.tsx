import { Outlet } from '@tanstack/react-router';
import { InvitationFormDataProvider } from '../context/invite/InvitationFormDataProvider';

export const InvitationLayout: React.FC = () => {
  return (
    <InvitationFormDataProvider>
      <Outlet />
    </InvitationFormDataProvider>
  );
};
