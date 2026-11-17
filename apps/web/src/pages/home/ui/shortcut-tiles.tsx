import { useQuery } from '@tanstack/react-query';
import { CircleHelpIcon, DicesIcon } from 'lucide-react';
import { Link } from 'react-router';
import { quizQueries } from '@/entities/quiz';
import { currentKstMonth, rouletteQueries } from '@/entities/roulette';
import { Button } from '@/shared/ui/button';
import { REWARD_TILE_CLASS, RewardTileContent } from '@/shared/ui/reward-tile';

// 홈 리워드 아이콘 줄의 O/X 퀴즈 · 미끼 룰렛. 누르면 각 화면으로 간다.
// 오늘 아직 받을 보상이 남아 있으면 빨간 ! 를 붙인다.

export function QuizTile() {
  const { data: quiz } = useQuery(quizQueries.today());
  const items = quiz?.items ?? [];
  // 맞히고 광고 보상까지 받으면 그 퀴즈는 끝난 것이다
  const done = items.filter(
    (item) => item.attempt?.status === 'CORRECT' && item.attempt.rewardClaimed,
  ).length;
  const hasReward = quiz !== undefined && done < items.length;
  const status = quiz ? `${done}/${items.length}` : '오늘의 퀴즈';

  return (
    <Button asChild variant="ghost" size="lg" className={REWARD_TILE_CLASS}>
      <Link to="/quiz" aria-label={`O/X 퀴즈 풀기, 오늘 ${status}`}>
        <RewardTileContent
          icon={<CircleHelpIcon />}
          title="O/X 퀴즈"
          status={status}
          hasBadge={hasReward}
          isDimmed={quiz !== undefined && !hasReward}
        />
      </Link>
    </Button>
  );
}

export function RouletteTile() {
  const { data: roulette } = useQuery(rouletteQueries.today());
  const hasReward = roulette !== undefined && (roulette.canSpin || roulette.canApply);
  const status = !roulette ? '하루 한 번' : hasReward ? '오늘 1번' : '내일 또';
  const title = `${currentKstMonth()}월 미끼`;

  return (
    <Button asChild variant="ghost" size="lg" className={REWARD_TILE_CLASS}>
      <Link to="/roulette" aria-label={`${title} 룰렛, ${status}`}>
        <RewardTileContent
          icon={<DicesIcon />}
          title={title}
          status={status}
          hasBadge={hasReward}
          isDimmed={roulette !== undefined && !hasReward}
        />
      </Link>
    </Button>
  );
}
