import { readFile } from 'node:fs/promises';
import { createRegistry, type ContentDefinition } from './registry.js';
import { startingDefinitions, startingEffectIds } from './starting.js';

type Candidate = {
  id: string;
  kind: string;
  owner: string;
  releaseState: string;
  candidateFields: unknown;
};
function candidate(value: unknown): value is Candidate {
  if (!value || typeof value !== 'object') return false;
  const record = Object.fromEntries(Object.entries(value));
  return (
    typeof record.id === 'string' &&
    record.id.length > 0 &&
    typeof record.kind === 'string' &&
    typeof record.owner === 'string' &&
    record.owner.length > 0 &&
    record.releaseState === 'research-only' &&
    'candidateFields' in record
  );
}
function platedDefinition(entry: Candidate): ContentDefinition {
  const fields = entry.candidateFields;
  if (!fields || typeof fields !== 'object' || !('numericalTables' in fields))
    throw new Error('Plated source table is missing');
  const table = fields.numericalTables;
  if (
    !table ||
    typeof table !== 'object' ||
    !('preferredSource' in table) ||
    table.preferredSource !== 'wiki-plated' ||
    !('values' in table) ||
    !table.values ||
    typeof table.values !== 'object' ||
    !('wiki-plated' in table.values)
  )
    throw new Error('Plated selected source is missing');
  const raw = table.values['wiki-plated'];
  if (!raw || typeof raw !== 'object')
    throw new Error('Invalid Plated source table');
  const values: Record<string, number[]> = {};
  for (const rarity of ['Common', 'Rare', 'Epic', 'Legendary']) {
    if (!(rarity in raw)) throw new Error(`Missing Plated ${rarity} table`);
    const row: unknown = Reflect.get(raw, rarity);
    if (
      !Array.isArray(row) ||
      row.length !== 5 ||
      !row.every(
        (value: unknown) =>
          typeof value === 'number' && Number.isFinite(value) && value >= 0,
      )
    )
      throw new Error(`Invalid Plated ${rarity} table`);
    values[rarity.toLowerCase()] = [...row];
  }
  return {
    id: entry.id,
    aliases: [],
    disposition: 'blocked',
    selectable: false,
    name: 'Armor Plates',
    description: 'Increases maximum plating.',
    pool: 'ordinary',
    maxRank: 5,
    rarities: ['common', 'rare', 'epic', 'legendary'],
    values,
    requirement: { kind: 'none' },
    exclusions: [],
    affinities: ['imposing'],
    effect: 'plating',
    specializations: [],
  };
}
export async function loadCatalogue() {
  const raw: unknown = JSON.parse(
    await readFile(
      new URL('../../../docs/content/source-catalogue.json', import.meta.url),
      'utf8',
    ),
  );
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('sourceGameVersion' in raw) ||
    raw.sourceGameVersion !== '1.2.1' ||
    !('records' in raw) ||
    !Array.isArray(raw.records) ||
    !raw.records.every(candidate)
  )
    throw new Error('Invalid source catalogue');
  const seen = new Set(startingDefinitions.map((entry) => entry.id));
  const coverage = raw.records.map((entry) => {
    if (seen.has(entry.id))
      throw new Error(`Duplicate source identity ${entry.id}`);
    seen.add(entry.id);
    return {
      id: entry.id,
      owner: entry.owner,
      disposition: 'blocked' as const,
      selectable: false,
    };
  });
  const plated = raw.records.find((entry) => entry.id === 'plated');
  if (!plated) throw new Error('Plated source record is missing');
  const registry = createRegistry(
    [...startingDefinitions, platedDefinition(plated)],
    startingEffectIds,
  );
  return {
    registry,
    coverage: [
      ...startingDefinitions.map(({ id, disposition, selectable }) => ({
        id,
        owner: 'YCCE-019',
        disposition,
        selectable,
      })),
      ...coverage,
    ],
  };
}
