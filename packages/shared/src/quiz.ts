// O/X 퀴즈 API 요청·응답 타입 (FE/BE 공용)
// 정책값(하루 퀴즈 수, 보상량)은 api 가 응답으로 내려준다. web 에 따로 두지 않는다.

/** 내가 답변한 퀴즈의 결과. 정답·해설은 답변한 뒤에만 내려간다. */
export interface QuizAttemptResult {
  userAnswer: boolean; // true = O, false = X
  isCorrect: boolean;
  correctAnswer: boolean;
  explanation: string | null;
  rewardAmount: number | null; // 받은 물고기 수 (아직 받지 않았으면 null)
  rewardClaimed: boolean;
}

export interface TodayQuizItem {
  quizId: string;
  question: string;
  attempt: QuizAttemptResult | null; // 아직 답변하지 않았으면 null
}

// GET /api/quiz/today
export interface TodayQuizResponse {
  date: string; // 'YYYY-MM-DD' (KST)
  items: TodayQuizItem[];
  rewardPerQuiz: number; // 광고 시청 완료 시 퀴즈당 받는 물고기 수
}

// POST /api/quiz/:quizId/answer
export interface AnswerQuizRequest {
  answer: boolean;
}

export interface AnswerQuizResponse extends QuizAttemptResult {
  quizId: string;
}

// POST /api/quiz/:quizId/ad-reward
export interface ClaimQuizRewardResponse {
  quizId: string;
  rewardAmount: number;
}
