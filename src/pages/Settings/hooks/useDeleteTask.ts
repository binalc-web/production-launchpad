import { deleteTask } from '@/api/caseManagement/caseTasks';
import { trackEvent } from '@/utils/mixPanel/mixpanel';
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

export const useDeleteTask = (): UseMutationResult<
  unknown,
  Error,
  { taskId: string },
  unknown
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId }: { taskId: string }) => {
      return deleteTask(taskId);
    },

    onSuccess: (_, variables) => {
      const { taskId } = variables;

      void trackEvent('Task Deleted', {
        taskId,
      });

      void queryClient.invalidateQueries({
        queryKey: ['tasks'],
      });
    },

    onError: (error) => {
      throw new Error(
        error.message ?? 'Something went wrong while deleting task!'
      );
    },
  });
};
