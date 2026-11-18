import { describe, expect, it } from 'vitest';
import {
  CATCH_TIMELINE,
  createSceneState,
  requestCatch,
  type SceneState,
} from '../../../lib/scene/scene-state';
import { otterPose } from '../otter-pose';

const random = () => 0.5;
const waiting = createSceneState(390, 560, random, false);

/** 잡기 시작한 지 elapsed 초가 지난 장면 */
function catching(elapsed: number): SceneState {
  const started = requestCatch(waiting, random);
  return { ...started, time: started.time + elapsed };
}

describe('otterPose', () => {
  it('sits holding the rod down while waiting', () => {
    const pose = otterPose(waiting);
    expect(pose).toMatchObject({ stand: 0, hold: 0, rodScale: 1, bucketLift: 0, happy: false });
    expect(Math.abs(pose.rodLift)).toBeLessThan(0.05);
  });

  it('looks down at the puddle when a fish bites', () => {
    const pose = otterPose(catching(CATCH_TIMELINE.REEL_START * 0.9));
    expect(pose.headNod).toBeGreaterThan(0);
    expect(pose.rodLift).toBeLessThan(0.05);
  });

  it('lifts the rod higher and higher while reeling in', () => {
    const { REEL_START, HOLD_START } = CATCH_TIMELINE;
    const early = otterPose(catching(REEL_START + (HOLD_START - REEL_START) * 0.2));
    const late = otterPose(catching(REEL_START + (HOLD_START - REEL_START) * 0.9));
    expect(early.rodLift).toBeGreaterThan(0);
    expect(late.rodLift).toBeGreaterThan(early.rodLift);
  });

  it('smiles with the rod up while the fish hangs on the line', () => {
    const { HOLD_START, CAST_START } = CATCH_TIMELINE;
    const pose = otterPose(catching((HOLD_START + CAST_START) / 2));
    expect(pose.happy).toBe(true);
    expect(pose.rodLift).toBeCloseTo(1);
  });

  it('goes back to waiting after casting again', () => {
    const pose = otterPose(catching(CATCH_TIMELINE.CATCH_END + 0.01));
    expect(pose.happy).toBe(false);
    expect(Math.abs(pose.rodLift)).toBeLessThan(0.05);
  });

  it('stands holding the full bucket, with the rod put away', () => {
    const pose = otterPose(waiting, 1);
    expect(pose).toMatchObject({ stand: 1, hold: 1, bucketLift: 1, rodScale: 0, happy: true });
    expect(pose.fishScale).toBeCloseTo(1);
    expect(pose.hop).toBeCloseTo(0);
  });

  it('gets up step by step: rod away first, then the bucket, then the fish pop out', () => {
    let previous = otterPose(waiting, 0);
    for (let full = 0.05; full <= 1; full += 0.05) {
      const pose = otterPose(waiting, full);
      expect(pose.stand).toBeGreaterThanOrEqual(previous.stand);
      expect(pose.rodScale).toBeLessThanOrEqual(previous.rodScale);
      expect(pose.bucketLift).toBeGreaterThanOrEqual(previous.bucketLift);
      previous = pose;
    }
    const early = otterPose(waiting, 0.25);
    expect(early.rodScale).toBeLessThan(1);
    expect(early.bucketLift).toBe(0);
    expect(early.fishScale).toBeCloseTo(0);
  });
});
