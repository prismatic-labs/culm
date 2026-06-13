import { EAST_ASIA_CLUSTER } from './map-layout';

export interface FlowAnchor {
  x: number;
  y: number;
  radius: number;
  country: string;
}

export interface FlowRoutePlan {
  /** Marker-to-marker arrows. */
  directTargets: string[];
  /** East Asia countries summarized by one gateway arrow (source is outside the cluster). */
  bundledEastAsia: string[];
  showInternalLoop: boolean;
}

export function eastAsiaGatewayPoint(
  markerPoints: ReadonlyMap<string, FlowAnchor>,
  cluster: Set<string> = EAST_ASIA_CLUSTER,
): FlowAnchor | null {
  const points = [...markerPoints.values()].filter((point) => cluster.has(point.country));
  if (!points.length) return null;

  const x = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const y = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const radius = Math.max(...points.map((point) => point.radius));

  return { x, y, radius, country: 'East Asia' };
}

export function planFlowRoutes(
  fromCountry: string,
  externalCountries: string[],
  hasInternal: boolean,
  markerPoints: ReadonlyMap<string, FlowAnchor>,
  cluster: Set<string> = EAST_ASIA_CLUSTER,
): FlowRoutePlan {
  const eaTargets = externalCountries.filter((country) => cluster.has(country));
  const nonEaTargets = externalCountries.filter((country) => !cluster.has(country));

  if (cluster.has(fromCountry)) {
    return {
      directTargets: externalCountries.filter((country) => markerPoints.has(country)),
      bundledEastAsia: [],
      showInternalLoop: hasInternal,
    };
  }

  if (eaTargets.length >= 2) {
    return {
      directTargets: nonEaTargets.filter((country) => markerPoints.has(country)),
      bundledEastAsia: eaTargets,
      showInternalLoop: hasInternal,
    };
  }

  return {
    directTargets: [...nonEaTargets, ...eaTargets].filter((country) => markerPoints.has(country)),
    bundledEastAsia: [],
    showInternalLoop: hasInternal,
  };
}

export function shouldShowEastAsiaLabel(
  _country: string,
  _selectedCountry: string | null = null,
  _hoveredCountry: string | null = null,
  _cluster: Set<string> = EAST_ASIA_CLUSTER,
): boolean {
  return true;
}
