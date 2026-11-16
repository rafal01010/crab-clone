import { SOURCE_GAMEPLAY } from '../content/source-gameplay.js';
import { sourceCurve } from '../content/source-curve.js';

export type ResourceSource = 'vegetation' | 'meat' | 'aquatic';
export type ResourceRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type Resource = {
  id: string;
  position: { x: number; z: number };
  source: ResourceSource;
  rarity: ResourceRarity;
  killerId: string | null;
  ownerId: string | null;
  killerKind: 'player' | 'ally' | 'third-party' | null;
  repair: boolean;
  healingRoll: number;
  stage: number;
  expiresAt: number;
  collectors: Map<string, number>;
  claimantRarities: Map<string, ResourceRarity>;
  claimantRepair: Map<string, boolean>;
  storedBy: string | null;
};
export const RESOURCE_TOTAL: Readonly<Record<ResourceRarity, number>> =
  SOURCE_GAMEPLAY.food.totals;
export const STAGE_WEIGHT = [1, 1, 1, 2] as const;
export const MAX_RESOURCES = 256;
export type CollectionEvent = {
  resourceId: string;
  playerId: string;
  stage: number;
  source: ResourceSource;
  rarity: ResourceRarity;
  provenance: 'own-kill' | 'ally-kill' | 'third-party' | 'none';
  killerId: string | null;
  progress: number;
  ownerId: string | null;
  repair: {
    attempted: number;
    actual: number;
    consumedAtFullHealth: boolean;
  } | null;
};
export type Progression = {
  progress: number;
  pending: { level: number; pool: 'ordinary' | 'branching' }[];
  depletedRewards: number;
};
export function levelRequirement(level: number, modifier: number): number {
  // Curve input is reconstructed as the zero-based completed-level count.
  const required = sourceCurve(
    SOURCE_GAMEPLAY.progression.requirements,
    level - 1,
  );
  return (
    required *
    (level >= SOURCE_GAMEPLAY.progression.minimumModifiedLevel
      ? Math.max(25, modifier) / 100
      : 1)
  );
}

export function foodHealing(maximumHealth: number, stage: number): number {
  const tuning = SOURCE_GAMEPLAY.food.healing;
  const final = stage === STAGE_WEIGHT.length - 1;
  // Final flat healing replaces the normal flat term; its percentage is additional.
  return (
    (final ? tuning.finalFlat : tuning.flatPerBite) +
    maximumHealth *
      (tuning.fractionPerBite + (final ? tuning.finalExtraFraction : 0))
  );
}

export function healingFood(
  resource: Resource,
  rarity: ResourceRarity,
  bonus: number,
): boolean {
  return (
    rarity !== 'legendary' &&
    (resource.repair ||
      resource.healingRoll <
        SOURCE_GAMEPLAY.food.healingChance[rarity] + bonus / 100)
  );
}
export type Wallet = {
  balance: number;
  receipts: Map<
    string,
    {
      kind: 'grant' | 'spend';
      amount: number;
      accepted: boolean;
      balance: number;
    }
  >;
};
export function transact(
  wallet: Wallet,
  id: string,
  kind: 'grant' | 'spend',
  amount: number,
) {
  if (!id || id.length > 128 || !Number.isSafeInteger(amount) || amount <= 0)
    return null;
  const old = wallet.receipts.get(id);
  if (old) return old.kind === kind && old.amount === amount ? old : null;
  if (wallet.receipts.size >= 4096) return null;
  const balance =
    kind === 'grant' ? wallet.balance + amount : wallet.balance - amount;
  const accepted = Number.isSafeInteger(balance) && balance >= 0;
  if (accepted) wallet.balance = balance;
  const receipt = { kind, amount, accepted, balance: wallet.balance };
  wallet.receipts.set(id, receipt);
  return receipt;
}
