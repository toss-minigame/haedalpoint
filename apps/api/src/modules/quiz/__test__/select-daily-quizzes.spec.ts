import { selectDailyQuizIds } from '../lib/select-daily-quizzes';

const IDS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'];

describe('selectDailyQuizIds', () => {
  it('returns the same set for the same date', () => {
    expect(selectDailyQuizIds('2026-11-02', IDS, 3)).toEqual(
      selectDailyQuizIds('2026-11-02', IDS, 3),
    );
  });

  it('returns `count` distinct quizzes', () => {
    const selected = selectDailyQuizIds('2026-11-02', IDS, 3);

    expect(selected).toHaveLength(3);
    expect(new Set(selected).size).toBe(3);
    for (const id of selected) expect(IDS).toContain(id);
  });

  it('rotates to the next consecutive quizzes on the next day', () => {
    const today = selectDailyQuizIds('2026-11-02', IDS, 3);
    const tomorrow = selectDailyQuizIds('2026-11-03', IDS, 3);

    const start = IDS.indexOf(today[0]);
    const expectedTomorrow = [0, 1, 2].map((i) => IDS[(start + 3 + i) % IDS.length]);
    expect(tomorrow).toEqual(expectedTomorrow);
  });

  it('wraps around the end of the list', () => {
    // 7개 중 3개씩 순환하면 언젠가는 끝에서 처음으로 넘어가는 날이 있다
    const days = Array.from({ length: 7 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);
    const wrapped = days
      .map((day) => selectDailyQuizIds(day, IDS, 3))
      .some((set) => IDS.indexOf(set[2]) < IDS.indexOf(set[0]));

    expect(wrapped).toBe(true);
  });

  it('returns every quiz when there are fewer than `count`', () => {
    expect(selectDailyQuizIds('2026-11-02', ['q1', 'q2'], 3)).toEqual(['q1', 'q2']);
  });

  it('returns an empty list when there are no quizzes', () => {
    expect(selectDailyQuizIds('2026-11-02', [], 3)).toEqual([]);
  });

  it('does not mutate the input list', () => {
    const ids = [...IDS];
    selectDailyQuizIds('2026-11-02', ids, 3);

    expect(ids).toEqual(IDS);
  });

  it.each([0, -1, 1.5])('throws RangeError for invalid count %p', (count) => {
    expect(() => selectDailyQuizIds('2026-11-02', IDS, count)).toThrow(RangeError);
  });
});
