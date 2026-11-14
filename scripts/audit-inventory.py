import csv
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
catalogue = json.loads((root / 'docs/content/source-catalogue.json').read_text())
with (root / 'hovercraft_codex_reference_bundle/hovercraft_evolution_mapping.csv').open(newline='') as source:
    rows = list(csv.DictReader(source))

lookup = {}
for record in catalogue['records']:
    for name in [record['sourceName'], *record['sourceAliases']]:
        lookup.setdefault(name.casefold(), []).append(record)

# The crosswalk explicitly treats this identification as provisional.
provisional = {'carrion': 'scavenger', 'courting': 'courting-display', 'more eyes!': 'more-eyes'}
records = {entry['id']: entry for entry in catalogue['records']}

def resolve(name):
    matches = lookup.get(name.casefold(), [])
    if len(matches) == 1:
        return matches[0], 'matched'
    if not matches and name.casefold() in provisional:
        return records[provisional[name.casefold()]], 'provisional'
    return None, 'ambiguous' if matches else 'missing'

def prerequisite_ids(node):
    if node['kind'] == 'content':
        return {node['id']}
    return set().union(*(prerequisite_ids(n) for n in node.get('conditions', [])))

unmatched = []
provisional_rows = []
reverse_confirmed = []
reverse_unresolved = []
for row in rows:
    source, disposition = resolve(row['source_name'])
    if disposition == 'provisional':
        provisional_rows.append({'name': row['source_name'], 'candidate': source['id']})
    if source is None:
        unmatched.append({'name': row['source_name'], 'reason': disposition})
        continue
    for raw in filter(None, row['unlocks'].split(';')):
        name = re.sub(r'\s*\([^)]*\)|\s+at\s+(?:level|lv)\s*\d+', '', raw, flags=re.I).strip()
        target, target_status = resolve(name)
        edge = {'source': source['id'], 'target': name}
        if target and source['id'] in prerequisite_ids(target['availability']['prerequisites']):
            reverse_confirmed.append(edge)
        else:
            edge['targetStatus'] = target_status
            edge['prerequisites'] = target['availability']['prerequisites']['kind'] if target else 'unknown'
            reverse_unresolved.append(edge)

fan = json.loads((root / 'docs/content/fan-inventory.json').read_text())
fan_unmatched = []
fan_provisional = []
for name in fan['names']:
    candidate, disposition = resolve(name)
    if disposition == 'provisional':
        fan_provisional.append({'name': name, 'candidate': candidate['id']})
    elif candidate is None:
        fan_unmatched.append({'name': name, 'reason': disposition})

wiki = json.loads((root / 'docs/content/wiki-inventory.json').read_text())
wiki_unmatched = []
wiki_provisional = []
for name in wiki['names']:
    candidate, disposition = resolve(name)
    if disposition == 'provisional':
        wiki_provisional.append({'name': name, 'candidate': candidate['id']})
    elif candidate is None:
        wiki_unmatched.append({'name': name, 'reason': disposition})

fan_ids = {candidate['id'] for name in fan['names'] if (candidate := resolve(name)[0])}
wiki_ids = {candidate['id'] for name in wiki['names'] if (candidate := resolve(name)[0])}
comparison = {
    'commonCandidates': len(fan_ids & wiki_ids),
    'fanOnlyCandidates': sorted(fan_ids - wiki_ids),
    'wikiOnlyCandidates': sorted(wiki_ids - fan_ids),
}

print(json.dumps({'comparison': comparison, 'wikiIndexExtract': {'source': wiki['source'], 'version': wiki['version'], 'names': len(wiki['names']), 'unmatched': wiki_unmatched, 'provisional': wiki_provisional, 'complete': False}, 'independentInventory': {'source': fan['source'], 'version': fan['version'], 'names': len(fan['names']), 'unmatched': fan_unmatched, 'provisional': fan_provisional, 'identityConflict': 'Body Slam is labeled Bop in the source detail and requires separate identification'}, 'seedRows': len(rows), 'unmatched': unmatched, 'provisional': provisional_rows, 'reverseLinksPresent': len(reverse_confirmed), 'reverseLinksNeedingReview': reverse_unresolved}, indent=2))
