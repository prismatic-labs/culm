export interface FlowAnchor {
  x: number;
  y: number;
}

/** Bearing-sorted external flow targets that have map marker coordinates. */
export function sortMappedFlowTargets(
  externalCountries: string[],
  fromCountry: string,
  from: FlowAnchor,
  markerPoints: ReadonlyMap<string, FlowAnchor>,
): string[] {
  return externalCountries
    .filter((country) => country !== fromCountry && markerPoints.has(country))
    .sort((a, b) => {
      const pa = markerPoints.get(a)!;
      const pb = markerPoints.get(b)!;
      return (
        Math.atan2(pa.y - from.y, pa.x - from.x) - Math.atan2(pb.y - from.y, pb.x - from.x)
      );
    });
}
