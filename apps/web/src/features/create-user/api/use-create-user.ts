import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, userQueries } from '@/entities/user';

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userQueries.lists() }),
  });
}
