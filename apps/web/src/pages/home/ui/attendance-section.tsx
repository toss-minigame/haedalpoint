import { useQuery } from '@tanstack/react-query';
import { AttendanceStamps, attendanceQueries } from '@/entities/attendance';
import { AdBonusButton, CheckInButton } from '@/features/check-in';
import { tutorialTarget } from '@/features/welcome-tutorial';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

type Props = {
  rewardedAd: RewardedAd;
  /** 튜토리얼 동안은 출석 광고 2배를 감춘다 (튜토리얼 안에서는 광고를 보게 하지 않는다) */
  hideAdBonus?: boolean;
};

export function AttendanceSection({ rewardedAd, hideAdBonus = false }: Props) {
  const { data: status, isPending, isError, error } = useQuery(attendanceQueries.me());

  const description = status
    ? `${status.currentStreakDay}일째 연속 출석 중 · 7일째에는 해달 친구가 함께 낚시해요`
    : '매일 출석하고 그날 낚싯대를 강화해요';

  return (
    <section aria-labelledby="attendance-heading" {...tutorialTarget('check-in')}>
      <Card>
        <CardHeader>
          <CardTitle id="attendance-heading" className="text-lg font-bold">
            출석체크
          </CardTitle>
          <CardDescription className="text-[15px] break-keep">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isPending && <p className="text-muted-foreground">출석 현황을 불러오고 있어요</p>}
          {isError && <p className="text-destructive">{error.message}</p>}
          {status && (
            <>
              <AttendanceStamps cycle={status.cycle} />
              <div className="flex flex-col gap-2">
                <CheckInButton status={status} />
                {status.adBonusAvailable && !hideAdBonus && <AdBonusButton ad={rewardedAd} />}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
