// O/X 퀴즈 API 요청·응답 타입 (FE/BE 공용)
// 정책값(하루 퀴즈 수, 보상량)은 api 가 응답으로 내려준다. web 에 따로 두지 않는다.
//
// 흐름
//   답변 → 정답(CORRECT): 정답·해설 공개 → 광고 시청 → 물고기 보상
//        → 오답(WRONG):   정답·해설 숨김 → 광고 시청 → 재도전(RETRY_READY) → 다시 답변 (맞힐 때까지)

/**
 * - WRONG: 틀림. 광고를 보면 재도전할 수 있다.
 * - RETRY_READY: 광고를 보고 재도전 기회를 얻음. 다시 답변할 수 있다.
 * - CORRECT: 맞힘. 광고를 보면 보상을 받을 수 있다.
 */
export type QuizAttemptStatus = 'WRONG' | 'RETRY_READY' | 'CORRECT';

/** 내가 도전한 퀴즈의 상태. 정답·해설은 맞힌 뒤에만 내려간다. */
export interface QuizAttemptResult {
  status: QuizAttemptStatus;
  userAnswer: boolean; // 마지막 답변 (true = O, false = X)
  isCorrect: boolean;
  wrongCount: number;
  correctAnswer: boolean | null; // 맞히기 전에는 null
  explanation: string | null; // 맞히기 전에는 null
  rewardAmount: number | null; // 받은 물고기 수 (아직 받지 않았으면 null)
  rewardClaimed: boolean;
}

export interface TodayQuizItem {
  quizId: string;
  question: string;
  attempt: QuizAttemptResult | null; // 아직 도전하지 않았으면 null
}

// GET /api/quiz/today
export interface TodayQuizResponse {
  date: string; // 'YYYY-MM-DD' (KST)
  items: TodayQuizItem[];
  rewardPerQuiz: number; // 정답 후 광고 시청 시 퀴즈당 받는 물고기 수
}

// POST /api/quiz/:quizId/answer
export interface AnswerQuizRequest {
  answer: boolean;
}

export interface AnswerQuizResponse extends QuizAttemptResult {
  quizId: string;
}

// POST /api/quiz/:quizId/ad-retry (오답 후 광고 시청 완료)
export interface UnlockQuizRetryResponse {
  quizId: string;
  status: 'RETRY_READY';
}

// POST /api/quiz/:quizId/ad-reward (정답 후 광고 시청 완료)
export interface ClaimQuizRewardResponse {
  quizId: string;
  rewardAmount: number;
}
