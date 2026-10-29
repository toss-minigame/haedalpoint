import { useQuery } from '@tanstack/react-query';
import { UserCard, userQueries } from '@/entities/user';
import { CreateUserForm } from '@/features/create-user';

export function HomePage() {
  const { data: users, isPending, isError, error } = useQuery(userQueries.list());

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8 p-8">
      <h1 className="text-2xl font-bold">haedalpoint</h1>
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
