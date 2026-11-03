import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

// 로딩 중 자리만 잡는 개수라 서버 정책(QUIZ_POLICY.DAILY_QUIZ_COUNT)과 꼭 같을 필요는 없다
const SKELETON_CARD_KEYS = ['skeleton-1', 'skeleton-2', 'skeleton-3'] as const;

// QuizCard + AnswerButtons 와 같은 배치로 그려 불러온 뒤 화면이 튀지 않게 한다
function QuizCardSkeleton() {
  return (
    <Card>
      <CardHeader className="gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-2/3" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export function QuizListSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">퀴즈를 불러오는 중이에요</span>
      <Skeleton aria-hidden className="h-6 w-44" />
      <ol aria-hidden className="flex flex-col gap-4">
        {SKELETON_CARD_KEYS.map((key) => (
          <li key={key}>
            <QuizCardSkeleton />
          </li>
        ))}
      </ol>
    </div>
  );
}
