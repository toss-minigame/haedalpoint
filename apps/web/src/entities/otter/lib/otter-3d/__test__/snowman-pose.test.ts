import { describe, expect, it } from 'vitest';
import { createSceneState, setHammockFull } from '../../../lib/scene/scene-state';
import { SNOWMAN_COMPLETE_STAGE, type SnowmanView, snowmanPose } from '../snowman-pose';

const scene = { ...createSceneState(390, 560, () => 0.5, false), time: 10 };
const FRIEND: SnowmanView = { alive: true, melt: 0, buildStage: 0, freezeElapsed: null };
const building = (buildStage: number): SnowmanView => ({ ...FRIEND, alive: false, buildStage });

describe('snowmanPose', () => {
  it('starts as a small snowball and grows part by part while being built', () => {
    const first = snowmanPose(scene, building(1));
    expect(first).toMatchObject({ stage: 1, face: 'plain' });
    expect(first.size).toBeLessThan(1);
    expect(snowmanPose(scene, building(3))).toMatchObject({ stage: 3, size: 1, face: 'plain' });
  });

  it('never shows more parts than a finished snowman has', () => {
    expect(snowmanPose(scene, building(9)).stage).toBe(SNOWMAN_COMPLETE_STAGE);
  });

  it('stands still while being built', () => {
    expect(snowmanPose(scene, building(4))).toMatchObject({ hop: 0, lean: 0, armWave: 0, melt: 0 });
  });

  it('is a finished, unmelted snowman when it comes as a friend', () => {
    const pose = snowmanPose(scene, FRIEND);
    expect(pose).toMatchObject({
      stage: SNOWMAN_COMPLETE_STAGE,
      melt: 0,
      puddle: 0,
      ice: 0,
      size: 1,
    });
    expect(pose.face).not.toBe('plain');
  });

  it('just waits when the bucket is full', () => {
    const pose = snowmanPose(setHammockFull(scene, true), FRIEND);
    expect(pose.face).toBe('idle');
    expect(pose.hop).toBe(0);
  });

  it('looks worried and drips as it melts, with a puddle that keeps spreading', () => {
    const little = snowmanPose(scene, { ...FRIEND, melt: 0.3 });
    const lot = snowmanPose(scene, { ...FRIEND, melt: 1 });
    expect(little).toMatchObject({ face: 'melt', melt: 0.3, hop: 0, armWave: 0 });
    expect(lot.melt).toBe(1);
    expect(little.puddle).toBeGreaterThan(0);
    expect(lot.puddle).toBeGreaterThan(little.puddle);
    expect(little.fxBob).toBeLessThanOrEqual(0);
  });

  it('cheers inside popping ice right after being frozen', () => {
    const pose = snowmanPose(scene, { ...FRIEND, freezeElapsed: 0.5 });
    expect(pose.face).toBe('happy');
    expect(pose.ice).toBeCloseTo(1);
    expect(pose.armRaise).toBeGreaterThan(0);
  });

  it('lets the ice fade and goes back to normal after the freeze show', () => {
    const fading = snowmanPose(scene, { ...FRIEND, freezeElapsed: 1.8 });
    expect(fading.ice).toBeGreaterThan(0);
    expect(fading.ice).toBeLessThan(1);
    const done = snowmanPose(scene, { ...FRIEND, freezeElapsed: 2.5 });
    expect(done).toEqual(snowmanPose(scene, FRIEND));
  });
});
