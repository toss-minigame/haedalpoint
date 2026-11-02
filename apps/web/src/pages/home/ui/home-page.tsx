import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { attendanceQueries } from '@/entities/attendance';
import { UserCard, userQueries } from '@/entities/user';
import { CreateUserForm } from '@/features/create-user';
import { getDevUserId, setDevUserId } from '@/shared/lib/dev-user-id';
import { AttendanceSection } from './attendance-section';
import { DevUserIdInput } from './dev-user-id-input';

export function HomePage() {
  const queryClient = useQueryClient();
  const { data: users, isPending, isError, error } = useQuery(userQueries.list());
  // 임시: 토스 로그인 연동 전 테스트용 userId
  const [devUserId, setDevUserIdState] = useState(getDevUserId);

  const handleDevUserIdChange = (userId: string | null) => {
    setDevUserId(userId);
    setDevUserIdState(userId);
    // 사용자 전환 시 이전 사용자의 출석 캐시를 버림
    queryClient.removeQueries({ queryKey: attendanceQueries.all() });
  };

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8 p-8">
      <h1 className="text-2xl font-bold">haedalpoint</h1>
      <DevUserIdInput userId={devUserId} onChange={handleDevUserIdChange} />
      <AttendanceSection hasUserId={devUserId !== null} />
      <CreateUserForm />
      <section className="flex flex-col gap-3">
        {isPending && <p className="text-muted-foreground">불러오는 중...</p>}
        {isError && <p className="text-destructive">{error.message}</p>}
        {users?.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </section>
    </main>
  );
}
