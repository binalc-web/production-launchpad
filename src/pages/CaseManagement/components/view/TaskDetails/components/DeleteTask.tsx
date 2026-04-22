import { PopUp } from '@/components/Popup';
import ToastAlert from '@/components/ToastAlert';
import { useDeleteTask } from '@/pages/Settings/hooks/useDeleteTask';
import { Typography } from '@mui/material';
import { CheckCircleIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useState, type FC } from 'react';

type DeleteTaskProps = {
  showDeletePopup: boolean;
  setShowDeletePopup: React.Dispatch<React.SetStateAction<boolean>>;
  taskId: string;
  handleOnSuccess: () => void;
};

const DeleteTask: FC<DeleteTaskProps> = ({
  showDeletePopup,
  taskId,
  setShowDeletePopup,
  handleOnSuccess,
}) => {
  const { mutate, isSuccess, isError, error } = useDeleteTask();

  const [showError, setShowError] = useState<boolean>(false);

  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isError) {
      setShowError(true);

      const timer = setTimeout(() => {
        setShowError(false);
      }, 2000);

      return (): void => clearTimeout(timer);
    }
  }, [isError]);

  useEffect(() => {
    if (isSuccess) {
      handleOnSuccess();
      setShowSuccess(true);

      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 2000);

      return (): void => clearTimeout(timer);
    }
  }, [isSuccess]);

  return (
    <>
      {showDeletePopup && (
        <PopUp
          type="DELETETASK"
          title={
            <Typography fontWeight={600} variant="h2">
              Are you sure you want to delete this task?
            </Typography>
          }
          buttonText="Yes, Sure"
          cancelText="No, Not yet"
          isOpen={showDeletePopup}
          description=""
          onClick={() => {
            mutate({
              taskId: taskId,
            });
          }}
          onCancel={() => setShowDeletePopup(false)}
        />
      )}

      {showError && (
        <ToastAlert
          severity="error"
          showAlert={showError}
          onClose={() => setShowError(false)}
          message={
            error?.message ||
            'Something went wrong while delete the task. Please try again'
          }
          icon={<XIcon weight="bold" />}
          placement="right"
        />
      )}

      {showSuccess && (
        <ToastAlert
          showAlert={showSuccess}
          onClose={() => setShowSuccess(false)}
          message="Task deleted successfully."
          body=""
          placement="right"
          icon={<CheckCircleIcon weight="fill" />}
          severity="success"
        />
      )}
    </>
  );
};

export default DeleteTask;
