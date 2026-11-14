export type FinaleConfig = {
  shrinkStartMs: number;
  tinyAtMs: number;
  collapseAtMs: number;
  initialRadius: number;
  tinyRadius: number;
  boundaryDamagePerSecond: number;
  meteorIntervalMs: number;
  meteorWarningMs: number;
  meteorRadius: number;
  meteorDamage: number;
};

export const DEFAULT_FINALE: FinaleConfig = {
  shrinkStartMs: 18 * 60_000,
  tinyAtMs: 25 * 60_000,
  collapseAtMs: 28 * 60_000,
  initialRadius: 46,
  tinyRadius: 3,
  boundaryDamagePerSecond: 10,
  meteorIntervalMs: 8_000,
  meteorWarningMs: 2_500,
  meteorRadius: 3,
  meteorDamage: 25,
};

export function finaleConfig(overrides: Partial<FinaleConfig>): FinaleConfig {
  const config = { ...DEFAULT_FINALE, ...overrides };
  if (
    Object.values(config).some(
      (value) => !Number.isFinite(value) || value <= 0,
    ) ||
    config.shrinkStartMs >= config.tinyAtMs ||
    config.tinyAtMs >= config.collapseAtMs ||
    config.tinyRadius >= config.initialRadius ||
    config.meteorWarningMs >= config.meteorIntervalMs
  )
    throw new Error('Invalid finale configuration');
  return config;
}

export function boundaryRadius(time: number, config: FinaleConfig): number {
  if (time <= config.shrinkStartMs) return config.initialRadius;
  if (time >= config.collapseAtMs) return 0;
  if (time <= config.tinyAtMs) {
    const progress =
      (time - config.shrinkStartMs) / (config.tinyAtMs - config.shrinkStartMs);
    return (
      config.initialRadius +
      (config.tinyRadius - config.initialRadius) * progress
    );
  }
  return (
    (config.tinyRadius * (config.collapseAtMs - time)) /
    (config.collapseAtMs - config.tinyAtMs)
  );
}
