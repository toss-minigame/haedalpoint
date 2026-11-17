// 화면에서 해먹은 "양동이"라고 부른다 (Figma "해달 얼음낚시"). 단계는 넓히기 전을 Lv.1 로 센다 (n = 1~9, fishing.policy.ts).
// 코드·API 이름은 그대로 hammock 이다

/** 단계에 맞는 양동이 이름 (예: 0단계 → 양동이 Lv.1) */
export function hammockName(level: number): string {
  return `양동이 Lv.${Math.floor(level) + 1}`;
}
