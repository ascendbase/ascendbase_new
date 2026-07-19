
import type { Point } from './types';

export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// Calculates the angle ABC (angle at vertex B) in degrees
export function angle(pA: Point, pB: Point, pC: Point): number {
  const vBA = { x: pA.x - pB.x, y: pA.y - pB.y };
  const vBC = { x: pC.x - pB.x, y: pC.y - pB.y };

  const dotProduct = vBA.x * vBC.x + vBA.y * vBC.y;
  const magnitudeBA = Math.sqrt(vBA.x * vBA.x + vBA.y * vBA.y);
  const magnitudeBC = Math.sqrt(vBC.x * vBC.x + vBC.y * vBC.y);

  if (magnitudeBA === 0 || magnitudeBC === 0) {
    return 0; // Or throw error, or handle as appropriate
  }

  let cosTheta = dotProduct / (magnitudeBA * magnitudeBC);
  // Clamp cosTheta to [-1, 1] to avoid NaN from Math.acos due to precision errors
  cosTheta = Math.max(-1, Math.min(1, cosTheta));
  
  const angleRad = Math.acos(cosTheta);
  return angleRad * (180 / Math.PI);
}

// Calculates the tilt angle of the line p1-p2 with the horizontal axis in degrees.
// p1 is considered the medial (inner) point, p2 the lateral (outer) point.
// A positive angle means p2 (lateral) is visually higher than p1 (medial).
export function horizontalAngle(p1: Point, p2: Point): number {
  const visualDeltaY = p1.y - p2.y; // Positive if lateral canthus (p2) is visually higher
  const visualDeltaX = p2.x - p1.x; // Horizontal distance

  // Handle vertical or horizontal lines to avoid division by zero or Math.abs(0) issues with atan2.
  if (visualDeltaX === 0) {
    if (visualDeltaY === 0) return 0; // Points are coincident
    return visualDeltaY > 0 ? 90 : -90; // Perfectly vertical line
  }
  // For horizontal line, visualDeltaY will be 0, atan2(0, abs(X)) = 0.

  const angleRad = Math.atan2(visualDeltaY, Math.abs(visualDeltaX));
  return angleRad * (180 / Math.PI);
}

export function midpoint(p1: Point, p2: Point): Point {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}
