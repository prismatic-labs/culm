/** Map dataset `topCountry` strings to Natural Earth / world-atlas feature names. */
export const COUNTRY_ALIASES: Record<string, string[]> = {
  China: ['China'],
  Netherlands: ['Netherlands'],
  Taiwan: ['Taiwan'],
  'South Korea': ['South Korea', 'Korea, Rep.', 'Republic of Korea'],
  'United States': ['United States of America', 'United States'],
  Japan: ['Japan'],
  Germany: ['Germany'],
};

export function atlasNamesFor(country: string): string[] {
  return COUNTRY_ALIASES[country] ?? [country];
}
