type CurvePoint = {
  time: number;
  value: number;
  inSlope: number;
  outSlope: number;
};

export function sourceCurve(
  points: readonly CurvePoint[],
  time: number,
): number {
  const first = points[0];
  if (!first) throw new Error('Source curve needs a point');
  if (time <= first.time) return first.value;
  for (let index = 1; index < points.length; index++) {
    const left = points[index - 1];
    const right = points[index];
    if (!left || !right || time > right.time) continue;
    const span = right.time - left.time;
    const t = (time - left.time) / span;
    return (
      (2 * t ** 3 - 3 * t ** 2 + 1) * left.value +
      (t ** 3 - 2 * t ** 2 + t) * span * left.outSlope +
      (-2 * t ** 3 + 3 * t ** 2) * right.value +
      (t ** 3 - t ** 2) * span * right.inSlope
    );
  }
  return points.at(-1)?.value ?? first.value;
}
