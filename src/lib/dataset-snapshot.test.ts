import { describe, expect, it } from 'vitest';
import published from '../../public/data/concentration.json';
import { concentrationMap } from '../data/concentration-map';
import { buildDatasetSnapshot } from './dataset-snapshot';

describe('dataset snapshot', () => {
  it('buildDatasetSnapshot matches concentrationMap aside from exportedAt', () => {
    const { exportedAt, ...snapshot } = buildDatasetSnapshot();
    expect(exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(snapshot).toEqual(concentrationMap);
  });

  it('public concentration.json matches concentrationMap aside from exportedAt', () => {
    const { exportedAt, ...rest } = published as typeof concentrationMap & { exportedAt: string };
    expect(typeof exportedAt).toBe('string');
    expect(rest).toEqual(concentrationMap);
  });
});
