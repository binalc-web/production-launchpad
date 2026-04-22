// EpicCallback.tsx
import { postEpicCode } from '@/api/epic';
import { useNavigate } from '@tanstack/react-router';
import { type FC, useEffect, useState, useCallback, useRef } from 'react';
import { XCircleIcon } from '@phosphor-icons/react';
import ToastAlert from '@/components/ToastAlert';
/**
 * EpicCallback component handles the callback from EPIC authorization
 * and redirects to medical records request page if access token exists.
 */
export const EpicCallback: FC = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  // 🛑 Lock to prevent double-calls
  const isProcessingRef = useRef(false);
  const navigateToDashboard = useCallback(async (): Promise<void> => {
    setShowAlert(false);
    await navigate({ to: '/dashboard' });
  }, [navigate]);
  useEffect(() => {
    /**
     * Handles the callback from EPIC authorization and redirects to medical records request page if access token exists.
     * If access token does not exist, it displays an error message and redirects to dashboard.
     */
    const handleCallback = async (): Promise<void> => {
      try {
        // ❗ Ensure the effect runs only once
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        const parameters = new URLSearchParams(location.search);
        const code = parameters.get('code');

        if (!code) {
          setErrorMessage('Authorization code missing');
          setShowAlert(true);
          setTimeout(() => {
            void navigate({ to: '/dashboard' });
          }, 3000);
          return;
        }

        // Store Epic token
        const tokenEndpoint = localStorage.getItem('epicTokenEndpoint');
        if (!tokenEndpoint) {
          setErrorMessage('Token endpoint not found');
          setShowAlert(true);
          setTimeout(() => {
            void navigate({ to: '/dashboard' });
          }, 3000);
          return;
        }
        const response = await postEpicCode({
          code: String(code),
          tokenEndpoint,
        });
        if (response?.success) {
          const id = localStorage.getItem('id');
          const caseId = localStorage.getItem('caseId');
          localStorage.setItem('epicTokenExchanged', 'true');
          // ✅ Redirect to medical report if access token exists
          await navigate({
            to: `/medical-records/request`,
            search: { id, caseId, ehr: 'epic' },
          });
          localStorage.removeItem('caseId');
        } else {
          setErrorMessage('Failed to get access token');
          setShowAlert(true);
          setTimeout(() => {
            // Navigate to dashboard after showing error
            void navigateToDashboard();
          }, 3000);
        }
      } catch (error) {
        console.error('Epic callback error:', error);
        setErrorMessage('Something went wrong during login');
        setShowAlert(true);
        setTimeout(() => {
          // Navigate to dashboard after showing error
          void navigateToDashboard();
        }, 3000);
      }
    };

    void handleCallback();
  }, [navigate, navigateToDashboard]);

  return (
    <ToastAlert
      placement="right"
      severity="error"
      showAlert={showAlert}
      onClose={() => {
        // Navigate to dashboard on alert close
        void navigateToDashboard();
      }}
      message={errorMessage ?? ''}
      icon={<XCircleIcon weight="fill" />}
    />
  );
};
