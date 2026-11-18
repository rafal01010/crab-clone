import type { MatchView } from '../../../shared/match.js';

export const salvageName = {
  vegetation: 'Plant salvage',
  meat: 'Wreck salvage',
  aquatic: 'Aquatic salvage',
} satisfies Record<MatchView['resources'][number]['source'], string>;

export type AbilitySlot = keyof MatchView['equipment']['slots'];
export const ABILITY_SLOTS = [
  { id: 'primary', label: 'Primary', type: 'attack' },
  { id: 'secondary', label: 'Secondary', type: 'attack' },
  { id: 'movement', label: 'Movement', type: 'movement' },
  { id: 'ultimate', label: 'Ultimate', type: 'ultimate' },
] as const satisfies readonly {
  id: AbilitySlot;
  label: string;
  type: 'attack' | 'movement' | 'ultimate';
}[];

export function abilityName(
  equipment: MatchView['equipment'],
  id: string | null,
  slot?: AbilitySlot,
): string {
  if (id === null) return slot === 'primary' ? 'Basic strike' : 'Empty';
  return (
    equipment.learned.find((item) => item.id === id)?.name ?? 'Unknown ability'
  );
}

export function timeLabel(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
