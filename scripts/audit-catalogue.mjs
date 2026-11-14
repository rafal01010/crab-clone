import { readFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';

const catalogue = JSON.parse(
  await readFile('docs/content/source-catalogue.json', 'utf8'),
);
const records = new Map();
const sourceIds = new Set(catalogue.sources.map((source) => source.id));
const specializations = new Set();
const requiredFields = [
  'rank',
  'rarity',
  'pool',
  'prerequisites',
  'exclusions',
  'affinity',
  'trigger',
  'numericalTables',
  'specializations',
];
const questionIds = new Set();
for (const entry of catalogue.records) {
  assert.ok(
    entry.id && !records.has(entry.id),
    `Duplicate or missing identity: ${entry.id}`,
  );
  assert.ok(entry.owner, `${entry.id} has no owner`);
  assert.ok(entry.evidence.length, `${entry.id} has no evidence`);
  for (const source of entry.evidence)
    assert.ok(
      sourceIds.has(source) || /^https:\/\//.test(source),
      `${entry.id}: unknown source ${source}`,
    );
  const fieldsWithQuestions = new Set();
  for (const question of entry.questions) {
    assert.ok(
      question.id && !questionIds.has(question.id),
      `${entry.id}: missing or duplicate question ID`,
    );
    assert.ok(
      question.owner && question.field,
      `${question.id}: missing owner or field`,
    );
    questionIds.add(question.id);
    fieldsWithQuestions.add(question.field);
  }
  for (const field of requiredFields) {
    assert.ok(
      fieldsWithQuestions.has(field) ||
        entry.fieldEvidence?.[field]?.length > 0,
      `${entry.id}: ${field} has neither evidence nor an owned question`,
    );
  }
  records.set(entry.id, entry);
  for (const option of entry.specializations) {
    assert.ok(
      option.id && !specializations.has(option.id),
      `Duplicate or missing specialization: ${option.id}`,
    );
    assert.ok(option.owner, `${option.id} has no owner`);
    specializations.add(option.id);
  }
}
let edges = 0;
let unknown = 0;
function visit(node, owner) {
  switch (node.kind) {
    case 'content':
      assert.ok(
        records.has(node.id),
        `${owner}: missing prerequisite ${node.id}`,
      );
      assert.ok(
        Number.isSafeInteger(node.minRank) && node.minRank > 0,
        `${owner}: invalid minimum rank`,
      );
      edges++;
      break;
    case 'specialization':
      assert.ok(
        specializations.has(node.id),
        `${owner}: missing specialization ${node.id}`,
      );
      edges++;
      break;
    case 'allOf':
    case 'anyOf':
      assert.ok(
        node.conditions.length > 0,
        `${owner}: empty prerequisite group`,
      );
      for (const condition of node.conditions) visit(condition, owner);
      break;
    case 'unresolved':
      assert.ok(
        node.question,
        `${owner}: unresolved prerequisite has no question`,
      );
      unknown++;
      break;
    case 'none':
      break;
    default:
      throw new Error(`${owner}: unsupported prerequisite ${node.kind}`);
  }
}
for (const entry of records.values()) {
  visit(entry.availability.prerequisites, entry.id);
  for (const excluded of entry.availability.exclusions) {
    assert.ok(
      records.has(excluded),
      `${entry.id}: unknown exclusion ${excluded}`,
    );
    assert.ok(
      records.get(excluded).availability.exclusions.includes(entry.id),
      `${entry.id}: asymmetric exclusion ${excluded}`,
    );
  }
}
const reachable = new Set();
function potentiallySatisfied(node) {
  switch (node.kind) {
    case 'none':
    case 'unresolved':
      return true;
    case 'content':
      return reachable.has(node.id);
    case 'specialization':
      return [...records.values()].some(
        (entry) =>
          reachable.has(entry.id) &&
          entry.specializations.some((option) => option.id === node.id),
      );
    case 'allOf':
      return node.conditions.every(potentiallySatisfied);
    case 'anyOf':
      return node.conditions.some(potentiallySatisfied);
    default:
      return false;
  }
}
let changed = true;
while (changed) {
  changed = false;
  for (const entry of records.values()) {
    if (
      !reachable.has(entry.id) &&
      potentiallySatisfied(entry.availability.prerequisites)
    ) {
      reachable.add(entry.id);
      changed = true;
    }
  }
}
const notPotentiallyReachable = [...records.keys()].filter(
  (id) => !reachable.has(id),
);
const questions = catalogue.records.reduce(
  (count, entry) => count + entry.questions.length,
  0,
);
console.log(
  JSON.stringify(
    {
      sourceVersion: catalogue.sourceGameVersion,
      candidates: records.size,
      specializations: specializations.size,
      prerequisiteEdges: edges,
      unresolvedPrerequisites: unknown,
      notPotentiallyReachable,
      openQuestions: questions,
      researchOnly: catalogue.records.filter(
        (entry) => entry.releaseState === 'research-only',
      ).length,
    },
    null,
    2,
  ),
);
