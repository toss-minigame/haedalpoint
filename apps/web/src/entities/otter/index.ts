// Public API: 슬라이스 외부에서는 반드시 이 파일을 통해서만 import
export { outfitApi } from './api/outfit-api';
export { outfitQueries } from './api/outfit-queries';
export {
  OUTFIT_CODES,
  OUTFITS,
  type OutfitCode,
  type OutfitSlot,
  toggleOutfit,
} from './lib/otter-outfits';
export { CATCH_INTERVAL_SECONDS, FRIEND_CATCH_INTERVAL_SECONDS } from './lib/scene/scene-state';
export type { OutfitItem, Outfits } from './model/types';
export { OtterBubble } from './ui/otter-bubble';
export { OtterScene } from './ui/otter-scene';
