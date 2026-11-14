export type AbilitySlot = 'primary' | 'secondary' | 'movement' | 'ultimate';
export type Ability = {
  id: string;
  slotType: 'attack' | 'movement' | 'ultimate';
  action: 'strike' | 'projectile' | 'dash' | 'body-slam';
  cooldown: number;
  damage: number;
  healthScale?: number;
};
export type Equipment = {
  learned: Map<string, Ability>;
  slots: Record<AbilitySlot, string | null>;
  readyAt: Map<string, number>;
};
export function initialEquipment(): Equipment {
  return {
    learned: new Map([
      [
        'basic-dash',
        {
          id: 'basic-dash',
          slotType: 'movement',
          action: 'dash',
          cooldown: 4500,
          damage: 0,
        },
      ],
    ]),
    slots: {
      primary: null,
      secondary: null,
      movement: 'basic-dash',
      ultimate: null,
    },
    readyAt: new Map(),
  };
}
export function isAbilitySlot(value: string): value is AbilitySlot {
  return (
    value === 'primary' ||
    value === 'secondary' ||
    value === 'movement' ||
    value === 'ultimate'
  );
}
export function equip(
  equipment: Equipment,
  slot: AbilitySlot,
  id: string | null,
): boolean {
  if (id === null) {
    equipment.slots[slot] = null;
    return true;
  }
  const ability = equipment.learned.get(id);
  const slotType = slot === 'primary' || slot === 'secondary' ? 'attack' : slot;
  if (!ability || ability.slotType !== slotType) return false;
  for (const other of ['primary', 'secondary', 'movement', 'ultimate'] as const)
    if (equipment.slots[other] === id) equipment.slots[other] = null;
  equipment.slots[slot] = id;
  return true;
}
