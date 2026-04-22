import { useState } from 'react';
import { LoginForm } from './steps/LoginForm';
import { OTPVerification } from './steps/OTPVerification';

export const Login: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  const stepComponents = {
    1: (
      <LoginForm
        setStep={setStep}
        setEmail={setEmail}
        setRememberMe={setRememberMe}
      />
    ),
    2: <OTPVerification email={email} rememberMe={rememberMe} />,
  };

  return <>{stepComponents[step as keyof typeof stepComponents]}</>;
};
