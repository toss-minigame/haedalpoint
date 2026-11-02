import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { patchTodayAttempt, quizApi, quizQueries } from '@/entities/quiz';
import { ApiError } from '@/shared/api';

const HTTP_CONFLICT = 409;

type AnswerQuizVariables = {
  quizId: string;
  answer: boolean;
};

export function useAnswerQuiz() {
  const queryClient = useQueryClient();
  const todayKey = quizQueries.today().queryKey;

  return useMutation({
    mutationFn: ({ quizId, answer }: AnswerQuizVariables) => quizApi.answer(quizId, answer),
    onSuccess: ({ quizId, ...attempt }) => {
      queryClient.setQueryData(todayKey, (today) =>
        patchTodayAttempt(today, quizId, () => attempt),
      );
    },
    onError: (error) => {
      // 다른 기기·탭에서 이미 답변했거나 재도전 기회가 없는 경우: 안내 후 최신 상태로 갱신
      if (error instanceof ApiError && error.statusCode === HTTP_CONFLICT) {
        toast.info(error.message);
        return queryClient.invalidateQueries({ queryKey: todayKey });
      }
      toast.error('답변을 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
    },
  });
}
