import { describe, expect, it } from 'vitest';
import { sortMappedFlowTargets } from './flow-targets';

describe('sortMappedFlowTargets', () => {
  const from = { x: 100, y: 100 };
  const markerPoints = new Map([
    ['Netherlands', { x: 200, y: 80 }],
    ['Taiwan', { x: 400, y: 120 }],
  ]);

  it('drops countries without marker coordinates before sorting', () => {
    expect(() =>
      sortMappedFlowTargets(
        ['Netherlands', 'Japan', 'Taiwan'],
        'China',
        from,
        markerPoints,
      ),
    ).not.toThrow();

    const targets = sortMappedFlowTargets(
      ['Netherlands', 'Japan', 'Taiwan'],
      'China',
      from,
      markerPoints,
    );
    expect(targets).toEqual(['Netherlands', 'Taiwan']);
    expect(targets).not.toContain('Japan');
  });

  it('excludes the origin country', () => {
    const targets = sortMappedFlowTargets(['Netherlands', 'China'], 'China', from, markerPoints);
    expect(targets).toEqual(['Netherlands']);
  });
});
