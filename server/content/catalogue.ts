import { readFile } from 'node:fs/promises';
import { createStarterRegistry } from './starter.js';
import { startingDefinitions } from './starting.js';

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
  const registry = createStarterRegistry();
  const implemented = new Map(
    registry.coverage().map((entry) => [entry.id, entry]),
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
      ...coverage.map((entry) => ({ ...entry, ...implemented.get(entry.id) })),
    ],
  };
}
