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
  stage: number;
  expiresAt: number;
  collectors: Map<string, number>;
  claimantRarities: Map<string, ResourceRarity>;
};
export const RESOURCE_TOTAL: Record<ResourceRarity, number> = {
  common: 10,
  rare: 30,
  epic: 90,
  legendary: 300,
};
export const STAGE_WEIGHT = [1, 1, 1, 2] as const;
export const MAX_RESOURCES = 128;
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
// Provisional curve until a versioned source formula is available.
export function levelRequirement(level: number, modifier: number): number {
  return ((10 + (level - 1) * 5) * Math.max(10, modifier)) / 100;
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
