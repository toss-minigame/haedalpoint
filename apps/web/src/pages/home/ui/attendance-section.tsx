import { useQuery } from '@tanstack/react-query';
import { AttendanceStamps, attendanceQueries } from '@/entities/attendance';
import { AdBonusButton, CheckInButton } from '@/features/check-in';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

type Props = {
  hasUserId: boolean;
};

export function AttendanceSection({ hasUserId }: Props) {
  const {
    data: status,
    isPending,
    isError,
    error,
  } = useQuery({
    ...attendanceQueries.me(),
    enabled: hasUserId,
  });

  const description = status
    ? `연속 ${status.currentStreakDay}일째 · 7일 연속 출석하면 해달 친구가 함께 채굴해요`
    : '매일 출석하고 무기 강화 보너스를 받아요';

  return (
    <section aria-labelledby="attendance-heading">
      <Card>
        <CardHeader>
          <CardTitle id="attendance-heading" className="text-lg font-bold">
            출석체크
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!hasUserId && (
            <p className="text-sm text-muted-foreground">테스트용 userId 를 먼저 입력해주세요.</p>
          )}
          {hasUserId && isPending && <p className="text-muted-foreground">불러오는 중...</p>}
          {isError && <p className="text-destructive">{error.message}</p>}
          {status && (
            <>
              <AttendanceStamps cycle={status.cycle} />
              <div className="flex flex-col gap-2">
                <CheckInButton status={status} />
                <AdBonusButton isAvailable={status.adBonusAvailable} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
