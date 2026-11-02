// O/X 퀴즈 운영 정책값.
// ⚠️ 임시값: 기획 확정 시 이 파일만 수정한다 (api 재배포만 필요, web 은 API 응답으로 값을 받음).
// 값만 둔다. 정책 계산 로직은 modules/quiz/lib 에 둔다.
export const QUIZ_POLICY = {
  /** 하루에 출제하는 퀴즈 수 */
  DAILY_QUIZ_COUNT: 3,
  /** 광고 시청 완료 시 퀴즈당 지급하는 물고기 수 (정답·오답 동일) */
  REWARD_PER_QUIZ: 10,
} as const;
