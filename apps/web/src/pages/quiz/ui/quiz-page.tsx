import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { quizQueries, type TodayQuizResponse } from '@/entities/quiz';
import { getDevUserId } from '@/shared/lib/dev-user-id';
import { Button } from '@/shared/ui/button';
import { QuizItem } from './quiz-item';

function countSolved({ items }: TodayQuizResponse): number {
  return items.filter((item) => item.attempt?.status === 'CORRECT').length;
}

function QuizList({ today }: { today: TodayQuizResponse }) {
  if (today.items.length === 0) {
    return (
      <p className="text-muted-foreground">오늘은 준비된 퀴즈가 없어요. 내일 다시 와 주세요.</p>
    );
  }

  const solved = countSolved(today);
  const isAllSolved = solved === today.items.length;

  return (
    <>
      <p className="text-base text-muted-foreground">
        {isAllSolved
          ? '오늘 퀴즈를 모두 맞혔어요. 내일 새 퀴즈로 만나요!'
          : `${today.items.length}문제 중 ${solved}문제를 맞혔어요`}
      </p>
      <ol className="flex flex-col gap-4">
        {today.items.map((item, index) => (
          <li key={item.quizId}>
            <QuizItem order={index + 1} item={item} rewardPerQuiz={today.rewardPerQuiz} />
          </li>
        ))}
      </ol>
    </>
  );
}

export function QuizPage() {
  // 임시: 토스 로그인/익명키 인증 연동 전 테스트용 userId (홈에서 입력)
  const hasUserId = getDevUserId() !== null;
  const {
    data: today,
    isPending,
    isError,
    error,
  } = useQuery({ ...quizQueries.today(), enabled: hasUserId });

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">오늘의 O/X 퀴즈</h1>
        <p className="text-base text-muted-foreground">
          맞히고 광고를 보면 물고기를 받아요. 틀려도 광고를 보면 다시 풀 수 있어요.
        </p>
      </header>

      {!hasUserId && (
        <p className="text-base text-muted-foreground">
          홈에서 테스트용 userId 를 먼저 입력해주세요.
        </p>
      )}
      {hasUserId && isPending && <p className="text-muted-foreground">불러오는 중...</p>}
      {isError && <p className="text-destructive">{error.message}</p>}
      {today && <QuizList today={today} />}

      <Button asChild variant="ghost" className="h-11 self-start px-3 text-base">
        <Link to="/">홈으로</Link>
      </Button>
    </main>
  );
}
