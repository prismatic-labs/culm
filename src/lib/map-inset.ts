/** East Asia cluster country set (shared by map layout). */

export const EAST_ASIA_CLUSTER = new Set(['China', 'Japan', 'South Korea', 'Taiwan']);

export function isEastAsiaCountry(country: string): boolean {
  return EAST_ASIA_CLUSTER.has(country);
}
