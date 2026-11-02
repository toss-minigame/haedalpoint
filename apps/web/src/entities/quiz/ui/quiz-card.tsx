import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

type Props = {
  order: number;
  question: string;
  children?: ReactNode;
};

// 문제 표시만 담당. 답변·광고 등 행동은 children 으로 받는다.
export function QuizCard({ order, question, children }: Props) {
  const headingId = `quiz-${order}-heading`;

  return (
    <section aria-labelledby={headingId}>
      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-muted-foreground">문제 {order}</p>
          <CardTitle id={headingId} className="text-lg leading-relaxed font-bold">
            {question}
          </CardTitle>
        </CardHeader>
        {children && <CardContent className="flex flex-col gap-3">{children}</CardContent>}
      </Card>
    </section>
  );
}
