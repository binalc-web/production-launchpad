import {
  useMutation,
  type UseMutationResult,
  useQueryClient,
} from '@tanstack/react-query';
import { updateUserDetails } from '@/api/users/updateUserDetails';
import type { User } from '../types/User';
import { useAuth } from '@/context/auth/useAuth';

export const useUpdateUser = (): UseMutationResult<
  Partial<User>,
  Error,
  { user: Partial<User> },
  unknown
> => {
  const { updateBasicDetails, basicUserDetails } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user }: { user: Partial<User> }) => {
      return updateUserDetails(user);
    },
    onSuccess: (data) => {
      const response: Partial<User> = data;

      queryClient.setQueryData<User>(['userDetails'], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          ...response,
        };
      });
      updateBasicDetails(
        response.firstName ?? '',
        response.lastName ?? '',
        response.email ?? basicUserDetails?.email ?? '',
        response.role ?? '',
        response.avatar ?? basicUserDetails?.avatar
      );
      return response;
    },
    onError: (error) => {
      throw new Error(
        error.message ?? 'Something went wrong while updating profile!'
      );
    },
  });
};
