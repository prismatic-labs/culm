/** Simple edge-to-edge curves for map dependency arrows. */

export interface FlowPoint {
  x: number;
  y: number;
  radius: number;
}

export function buildSimpleFlowPath(
  from: FlowPoint,
  to: FlowPoint,
  routeIndex = 0,
  routeCount = 1,
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const baseAngle = Math.atan2(dy, dx);
  const ux = Math.cos(baseAngle);
  const uy = Math.sin(baseAngle);

  // Damp fan spread and curvature on short hops (e.g. Korea→Taiwan), where a
  // wide departure angle or large bend turns into a visible hook/loop.
  const spreadDamp = Math.min(1, len / 160);

  const angleSpread =
    routeCount > 1
      ? (routeIndex - (routeCount - 1) / 2) * Math.min(0.42, 1.35 / routeCount) * spreadDamp
      : 0;
  const departAngle = baseAngle + angleSpread;
  const dux = Math.cos(departAngle);
  const duy = Math.sin(departAngle);

  // The arrowhead is ~8px. Between tightly packed markers (e.g. Korea→Taiwan)
  // the naive gaps leave almost no line, so the head renders as a hook/blob.
  // Guarantee a minimum visible segment by trimming the gaps (origin side
  // first, then the target side but never inside the dot) when space is tight.
  const MIN_VISIBLE = 16;
  let startGap = from.radius + 5;
  let endGap = to.radius + 2;
  const deficit = MIN_VISIBLE - (len - startGap - endGap);
  if (deficit > 0) {
    const startTrim = Math.min(deficit, Math.max(0, startGap - 3));
    startGap -= startTrim;
    const endTrim = Math.min(deficit - startTrim, Math.max(0, endGap - to.radius * 0.5));
    endGap -= endTrim;
  }
  // Final safety for near-coincident markers: keep both gaps inside the span.
  startGap = Math.min(startGap, len * 0.55);
  endGap = Math.min(endGap, len * 0.55);

  const x1 = from.x + dux * startGap;
  const y1 = from.y + duy * startGap;
  const x2 = to.x - ux * endGap;
  const y2 = to.y - uy * endGap;

  // Curve proportional to the visible span between the offset endpoints, so a
  // tiny hop stays nearly straight instead of hooking.
  const span = Math.hypot(x2 - x1, y2 - y1) || 1;
  const center = (routeCount - 1) / 2;
  const fan = (routeIndex - center) * 12 * spreadDamp;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  // Curvature ramps in from zero so short cluster hops (e.g. Korea→Taiwan) stay
  // straight and their heads point dead-centre at the target dot, while longer
  // inter-continental arcs still bow gracefully. The old Math.max(3, …) floor
  // forced a small bend on every arrow, making short heads approach at a glance.
  const bend = Math.min(46, Math.max(0, (span - 44) * 0.17));
  const nx = -uy;
  const ny = ux;
  const fanScale = 0.3;

  return `M ${x1} ${y1} Q ${mx + nx * bend + nx * fan * fanScale} ${my + ny * bend + ny * fan * fanScale} ${x2} ${y2}`;
}

export function buildInternalLoopPath(x: number, y: number, radius: number): string {
  const loopR = radius + 10;
  const x1 = x + loopR * 0.72;
  const y1 = y + 2;
  const x2 = x - radius;
  const y2 = y;
  return `M ${x1} ${y1} A ${loopR} ${loopR} 0 1 0 ${x2} ${y2}`;
}
