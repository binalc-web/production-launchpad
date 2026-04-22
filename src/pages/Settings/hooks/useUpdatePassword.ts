import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { updatePassword } from '@/api/users/updatePassword';

// Define the types for parameters and return values
type UpdatePasswordParameters = {
  password: string;
  newPassword: string;
  confirmNewPassword: string;
};

type UpdatePasswordResponse = Partial<{
  email: string;
}>;

// Correctly type the hook return value
export const useUpdatePassword = (): UseMutationResult<
  UpdatePasswordResponse,
  Error,
  UpdatePasswordParameters,
  unknown
> => {
  return useMutation({
    mutationFn: async ({
      password,
      newPassword,
      confirmNewPassword,
    }: UpdatePasswordParameters) => {
      return updatePassword({ password, newPassword, confirmNewPassword });
    },
    onSuccess: (data) => {
      const response: Partial<{
        email: string;
      }> = data;
      return response;
    },
    onError: (error) => {
      throw new Error(
        error.message ?? 'Something went wrong while updating profile!'
      );
    },
  });
};
