import { Outlet } from '@tanstack/react-router';
import { FormDataProvider } from '../context/register/FormDataProvider';

export const RegisterLayout: React.FC = () => {
  return (
    <FormDataProvider>
      <Outlet />
    </FormDataProvider>
  );
};
