export type FieldStatus = {
  kind: 'stun' | 'corrosion';
  intervalMs: number;
  durationMs: number;
  radiusFraction: number;
  magnitude: number;
  slowMultiplier: number;
};

export function validFieldStatus(status: FieldStatus): boolean {
  return (
    (status.kind === 'stun' || status.kind === 'corrosion') &&
    Number.isFinite(status.intervalMs) &&
    status.intervalMs >= 250 &&
    status.intervalMs <= 300_000 &&
    Number.isFinite(status.durationMs) &&
    status.durationMs > 0 &&
    status.durationMs <= 300_000 &&
    Number.isFinite(status.radiusFraction) &&
    status.radiusFraction > 0 &&
    status.radiusFraction <= 1 &&
    Number.isFinite(status.magnitude) &&
    status.magnitude >= 0 &&
    status.magnitude <= 1_000_000 &&
    Number.isFinite(status.slowMultiplier) &&
    status.slowMultiplier >= 0 &&
    status.slowMultiplier <= 100
  );
}
