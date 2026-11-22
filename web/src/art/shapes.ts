/** Soft vector shapes: smooth closed curves, wobbly blobs, hearts and rounded stars. */

type Point = readonly [number, number];

/** Closed Catmull-Rom curve through the points, as Bézier segments. Lower tension gives sharper corners. */
export function smoothClosed(points: readonly Point[], tension = 1): Path2D {
  const path = new Path2D();
  const n = points.length;
  const k = tension / 6;
  path.moveTo(points[0][0], points[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    path.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) * k,
      p1[1] + (p2[1] - p0[1]) * k,
      p2[0] - (p3[0] - p1[0]) * k,
      p2[1] - (p3[1] - p1[1]) * k,
      p2[0],
      p2[1],
    );
  }
  path.closePath();
  return path;
}

export interface BlobOptions {
  /** How far the edge wanders from an ellipse, as a share of the radius. */
  wobble?: number;
  /** Gives each blob its own shape. */
  seed?: number;
  /** Animates the edge so the blob breathes. */
  phase?: number;
  points?: number;
}

/** An ellipse with a gently uneven edge. */
export function blob(cx: number, cy: number, rx: number, ry: number, opts: BlobOptions = {}): Path2D {
  const { wobble = 0.06, seed = 0, phase = 0, points = 9 } = opts;
  const pts: Point[] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = 1 + wobble * Math.sin(phase + i * 2.3 + seed * 1.7);
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  return smoothClosed(pts);
}

/** A plump heart centred near (cx, cy). */
export function heart(cx: number, cy: number, size: number): Path2D {
  const s = size;
  const path = new Path2D();
  path.moveTo(cx, cy + s * 0.55);
  path.bezierCurveTo(cx - s * 1.15, cy - s * 0.1, cx - s * 0.55, cy - s * 0.95, cx, cy - s * 0.35);
  path.bezierCurveTo(cx + s * 0.55, cy - s * 0.95, cx + s * 1.15, cy - s * 0.1, cx, cy + s * 0.55);
  path.closePath();
  return path;
}

/** A star with soft, rounded points. */
export function softStar(cx: number, cy: number, outer: number, inner: number, rotation = 0, points = 5): Path2D {
  const pts: Point[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = rotation - Math.PI / 2 + (i / (points * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? outer : inner;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return smoothClosed(pts, 0.45);
}
