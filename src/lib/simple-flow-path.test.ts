import { describe, expect, it } from 'vitest';
import { buildSimpleFlowPath } from './simple-flow-path';

describe('buildSimpleFlowPath', () => {
  it('returns a quadratic curve between marker edges', () => {
    const d = buildSimpleFlowPath(
      { x: 100, y: 100, radius: 8 },
      { x: 400, y: 200, radius: 8 },
    );
    expect(d).toMatch(/^M .+ Q .+ .+$/);
  });

  it('fans departures when several routes leave one marker', () => {
    const from = { x: 200, y: 200, radius: 10 };
    const to = { x: 260, y: 210, radius: 10 };
    const a = buildSimpleFlowPath(from, to, 0, 3);
    const b = buildSimpleFlowPath(from, to, 2, 3);
    expect(a).not.toBe(b);
  });
});
