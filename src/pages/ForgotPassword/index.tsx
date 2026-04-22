import { type FC, useState } from 'react';
import { ForgotForm } from './steps/ForgotForm';
import { OTPVerification } from './steps/OTPVerification';
import { NewPassword } from './steps/NewPassword';

export const ForgotPassword: FC = () => {
  const [step, setStep] = useState<number>(1);
  const [userData, setUserData] = useState<{ email: string }>({ email: '' });

  const stepComponents = {
    1: <ForgotForm setStep={setStep} setUserData={setUserData} />,
    2: <OTPVerification setStep={setStep} userData={userData} />,
    3: <NewPassword userData={userData} />,
  };

  return <>{stepComponents[step as keyof typeof stepComponents]}</>;
};
