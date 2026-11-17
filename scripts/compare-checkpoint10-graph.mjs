import { readFile } from 'node:fs/promises';
import { createStarterRegistry } from '../build-host/server/content/starter.js';

const catalogue = JSON.parse(
  await readFile('docs/content/source-catalogue.json', 'utf8'),
);
const registry = createStarterRegistry();
const ids = new Set(registry.publicContent().map((entry) => entry.id));

function normalize(node, source) {
  if (!node || node.kind === 'none') return 'none';
  if (source && node.kind === 'unresolved') return null;
  if (node.kind === 'content' || node.kind === 'rank')
    return `rank:${node.id}:${source ? node.minRank : node.minimum}`;
  if (node.kind === 'specialization') return `specialization:${node.id}`;
  const groups = { allOf: 'all', anyOf: 'any', all: 'all', any: 'any' };
  if (groups[node.kind]) {
    const children = node.conditions.map((item) => normalize(item, source));
    if (children.includes(null)) return null;
    return `${groups[node.kind]}(${children.sort().join(',')})`;
  }
  return `unsupported:${node.kind}`;
}

const report = {
  matched: [],
  different: [],
  unresolved: [],
  missingRuntime: [],
  exclusions: { matched: [], sourceOnly: [], runtimeOnly: [] },
};
for (const entry of catalogue.records) {
  if (!ids.has(entry.id)) {
    report.missingRuntime.push(entry.id);
    continue;
  }
  const definition = registry.definition(entry.id);
  const sourceExclusions = new Set(entry.availability.exclusions);
  const runtimeExclusions = new Set(definition.exclusions);
  for (const id of sourceExclusions) {
    const pair = `${entry.id} -> ${id}`;
    (runtimeExclusions.has(id)
      ? report.exclusions.matched
      : report.exclusions.sourceOnly
    ).push(pair);
  }
  for (const id of runtimeExclusions) {
    if (!sourceExclusions.has(id))
      report.exclusions.runtimeOnly.push(`${entry.id} -> ${id}`);
  }
  const source = normalize(entry.availability.prerequisites, true);
  if (source === null) {
    report.unresolved.push(entry.id);
    continue;
  }
  const runtime = normalize(definition.requirement, false);
  if (source === runtime) report.matched.push(entry.id);
  else report.different.push({ id: entry.id, source, runtime });
}
console.log(JSON.stringify(report, null, 2));
