import { useQuery } from '@tanstack/react-query';
import { AttendanceStamps, type AttendanceStatus, attendanceQueries } from '@/entities/attendance';
import { CheckInButton } from '@/features/check-in';
import { tutorialTarget } from '@/features/welcome-tutorial';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

type Props = {
  rewardedAd: RewardedAd;
};

const DEFAULT_DESCRIPTION = '광고를 보고 출석하면 보상을 받아요';

function descriptionOf(status: AttendanceStatus | undefined): string {
  if (!status) return DEFAULT_DESCRIPTION;
  return status.firstWeekCompleted
    ? `${status.attendanceDays}일 출석했어요 · 매일 출석하면 그날 낚싯대가 강화돼요`
    : '광고를 보고 출석하면 날마다 보상을 받아요. 7일째에는 해달 친구가 와요';
}

// 첫 주(7일째까지)는 출석 도장과 날마다의 보상을 보여주고, 그 뒤에는 출석 버튼만 둔다
export function AttendanceSection({ rewardedAd }: Props) {
  const { data: status, isPending, isError, error } = useQuery(attendanceQueries.me());

  return (
    <section aria-labelledby="attendance-heading" {...tutorialTarget('check-in')}>
      <Card>
        <CardHeader>
          <CardTitle id="attendance-heading" className="text-lg font-bold">
            출석체크
          </CardTitle>
          <CardDescription className="text-[15px] break-keep">
            {descriptionOf(status)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isPending && <p className="text-muted-foreground">출석 현황을 불러오고 있어요</p>}
          {isError && <p className="text-destructive">{error.message}</p>}
          {status && (
            <>
              {!status.firstWeekCompleted && <AttendanceStamps firstWeek={status.firstWeek} />}
              <CheckInButton status={status} ad={rewardedAd} />
              {status.pendingTossPoints > 0 && (
                <p className="text-[15px] break-keep text-muted-foreground">
                  지급 중인 토스 포인트 {status.pendingTossPoints}원
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
