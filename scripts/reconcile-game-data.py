"""Retain decoded configuration with task ownership and export supported balance tables."""

import csv
import hashlib
import json
import pathlib
import re
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parent.parent
INPUT = ROOT / 'hovercraft_codex_reference_bundle/local-game-data/objects.json'
OBJECTS = json.loads(INPUT.read_text())
RARITIES = ['common', 'rare', 'epic', 'legendary']
APPLIED = {}


def source(name, class_fragment=''):
    matches = [o for o in OBJECTS if o['name'] == name and class_fragment in o['class']]
    if len(matches) != 1:
        raise ValueError(f'Ambiguous source {name} {class_fragment}: {len(matches)}')
    return matches[0]


def use(obj, field, consumer):
    APPLIED.setdefault((obj['file'], obj['pathId']), {})[field] = consumer
    return obj['data'][field]


def rank_table(obj, field, scale=1, channel=None, damage=False, consumer='server/content/starter.ts'):
    rows = use(obj, field, consumer)
    result = {}
    for rarity in RARITIES + ['branching']:
        channel_name = channel or ('boss' if rarity == 'branching' else rarity)
        values = []
        for row in rows:
            item = row['_' + channel_name]
            if damage:
                item = item['Damage']
                item = (item['x'] + item['y']) / 2
            else:
                if 'Value' not in item:
                    raise ValueError(f'Non scalar {obj["name"]}.{field}: {item}')
                item = item['Value']
            values.append(round(item * scale, 6))
        result[rarity] = values
    return result


# Explicit units and identity translations. Unlisted fields remain owned follow-up work.
BINDINGS = {
    'omnivore': ('Omnivore', '_foodContributionMultiplierPerLevel', 100, {}),
    'vegan': ('Vegan', '_vegetationFoodContributionMultiplierPerLevel', 100, {}),
    'scavenger': ('Carrion', '_carrionContributionMultiplierPerLevel', 100, {}),
    'chonky': ('Chonky', '_sizeIncreasePerLevel', 100, {'physical': ('_basePhysicalDamageIncreasePerLevel', 1)}),
    'more-mass': ('MoreMass', '_sizeIncreasePerLevel', 100, {'physical': ('_basePhysicalDamageIncreasePerLevel', 1), 'health': ('_maxHpIncreasePerLevel', 1)}),
    'elusive': ('Elusive', '_dodgeChancePerLevel', 100, {'size': ('_sizeDecreasePerLevel', 100)}),
    'smol': ('Smol', '_movementSpeedIncreasePerLevel', 1, {'size': ('_sizeDecreasePerLevel', 100)}),
    'overwhelm': ('Overwhelm', '_platingPercentageDamageAddon', 1, {}),
    'agile': ('Agile', '_dodgeChancePerLevel', 100, {'penalty': ('_movementAttackPenaltyReductionPerLevel', 100)}),
    'dexterous': ('Dexterous', '_baseAbilityDamageIncreasePerLevel', 1, {'cooldown': ('_cooldownReductionPerLevel', 100)}),
    'scales': ('Scales', '_damageReductionPerLevel', 100, {'heat': ('_heatAdaptationPerLevel', 100)}),
    'carapace': ('Carapace', '_damageReductionPerLevel', 100, {'plating': ('_additionalPlatingPerLevel', 1)}),
    'shell': ('Shell', '_damageReductionPerLevel', 100, {}),
    'plated': ('Plated', '_additionalPlatingPerLevel', 1, {}),
    'spines': ('Spines', '_damageReturnedPercentagePerLevel', 100, {}),
    'exoskeleton': ('Exoskeleton', '_platingPerLevel', 1, {'social': ('_socialIncreasePerLevel', 1)}),
    'impervious': ('Impervious', '_maxHpIncreasePerLevel', 1, {}),
    'regenerative-tissue': ('RegenerativeTissue', '_hpRegenerationPerLevel', 1, {}),
    'fibroblasts': ('Hyperkeratosis', '_maxHpIncreasePerLevel', 1, {'healingInterval': ('_hpHealedBonusIntervalPerLevel', 1)}),
    'immune-system': ('Resistant', '_poisonResistanceIncreasePerLevel', 100, {}),
    'cheek-pouch': ('CheekPouch', '_cheekPouchCapacityPerLevel', 1, {}),
    'forager': ('Forager', '_foodChanceToBecomeHpModifierPerLevel', 100, {'resistance': ('_poisonResistanceIncreasePerLevel', 100)}),
    'reach': ('Reach', '_attackAreaIncreasePerLevel', 100, {}),
    'ruminant': ('Ruminant', '_affinityMultiplierProgressIncreasePerLevel', 1, {}),
    'herbivore': ('Herbivore', '_vegetationFoodContributionMultiplierPerLevel', 100, {}),
    'carnivore': ('Carnivore', '_meatFoodContributionMultiplierPerLevel', 100, {}),
    'piscivore': ('Piscivore', '_fishFoodContributionMultiplierPerLevel', 100, {}),
    'slow-metabolism': ('SlowMetabolism', '_progressToNextLevelReductionPercentagePerLevel', 100, {'speed': ('_movementSpeedDecreasePerLevel', 100)}),
    'saliva': ('Saliva', '_feedingSpeedIncreasePerLevel', 100, {'regeneration': ('_hpRegenerationPerLevel', 1)}),
    'muscular-tissue': ('MuscularTissue', '_basePhysicalDamageIncreasePerLevel', 1, {}),
    'stomach': ('Stomach', '_feedingSpeedIncreasePerLevel', 100, {}),
    'body-slam': ('BodySlam', '_maxHpAddonPerLevel', 100, {}),
    'slide': ('Slide', '_cooldownPerLevel', 1, {'distance': ('_distancesPerLevel', 1), 'duration': ('_timeSlideTakesPerLevel', 1)}),
    'sprint': ('Sprint', '_sprintSpeedIncreasePerLevel', 100, {'duration': ('_sprintDurationsPerLevel', 1), 'cooldown': ('_cooldownPerLevel', 1)}),
    'leap': ('Leap', '_cooldownPerLevel', 1, {'distance': ('_leapDistancePerLevel', 1)}),
    'scuttle': ('Scuttle', '_cooldownPerLevel', 1, {'distance': ('_distancesPerLevel', 1), 'duration': ('_timeScuttleTakesPerLevel', 1)}),
    'turtle-down': ('Hide', '_cooldownPerLevel', 1, {'duration': ('_hideDurationsPerLevel', 1), 'stun': ('_stunDurationPerLevel', 1)}),
    'arms': ('Arms', '_baseAbilityDamageIncreasePerLevel', 1, {'physical': ('_basePhysicalDamageIncreasePerLevel', 1), 'reach': ('_feedingDistanceIncreasePerLevel', 1)}),
    'tentacles': ('Tentacles', '_movementSpeedIncreasePerLevel', 1, {'ability': ('_baseAbilityDamageIncreasePerLevel', 1)}),
    'legs': ('Legs', '_movementSpeedPerLevel', 1, {}),
    'tail': ('Tail', '_baseAbilityDamageIncreasePerLevel', 1, {'social': ('_socialIncreasePerLevel', 1)}),
    'tail-wag': ('TailWag', '_charmChanceIncreasePerLevel', 1, {}),
    'prehensile-tail': ('PrehensileTail', '_feedingDistanceIncreasePerLevel', 1, {}),
    'more-legs': ('MoreLegs', '_movementSpeedIncreasePerLevel', 1, {}),
    'fin': ('Fin', '_waterTerrainAdaptationPerLevel', 100, {}),
    'hollow-bones': ('HollowBones', '_movementSpeedIncreasePerLevel', 1, {'resistanceCost': ('_damageReductionPerLevel', 100)}),
    'slithery': ('Slithery', '_movementSpeedIncreasePerLevel', 1, {'adaptation': ('_terrainAdaptationIncreasePerLevel', 100)}),
    'wings': ('Wings', '_movementSpeedPerLevel', 1, {'adaptation': ('_terrainAdaptationIncreasePerLevel', 100)}),
}
ATTACK_DETAILS = {
    'claws': {'cooldown': ('_cooldownPerLevel', 1)},
    'toe-beans': {'charm': ('_charmChanceIncreasePerLevel', 1)},
    'antlers': {'selfDamage': ('_selfDamagePercentagePerLevel', 100)},
    'jaws': {'salvageSpeed': ('_feedingSpeedIncreasePerLevel', 100)},
    'trunk': {'salvageReach': ('_feedingDistanceIncreasePerLevel', 1)},
    'beak': {'salvageSpeed': ('_feedingSpeedIncreasePerLevel', 100)},
    'spit': {'range': ('_maxDistancePerLevel', 1)},
    'projectile-tongue': {'cooldown': ('_cooldownPerLevel', 1), 'range': ('_tongueMaxDistancePerLevel', 1), 'stun': ('_stunDurationPerLevel', 1)},
    'leech': {'drain': ('_damageLeechPercentagePerLevel', 100)},
    'stinger': {'poison': ('_poisonDamageMultiplierPerLevel', 1)},
}
for attack in ['claws', 'pincer', 'toe-beans', 'antlers', 'jaws', 'horns', 'trunk', 'beak', 'spit', 'projectile-tongue', 'leech', 'stinger', 'spur']:
    field = {'jaws': '_jawsDamageMultiplierPerLevel', 'toe-beans': '_failedCharmDamageMultiplierPerLevel'}.get(attack, '_damageMultiplierPerLevel')
    BINDINGS[attack] = (''.join(p.title() for p in attack.split('-')), field, 1, ATTACK_DETAILS.get(attack, {}))

abilities = {}
for identity, (name, field, scale, details) in BINDINGS.items():
    obj = source('Default_' + name)
    if field not in obj['data']:
        raise ValueError(f'Missing {name}.{field}; available {list(obj["data"])}')
    damage_field = field if 'Damage' in obj['data'][field][0]['_common'] else None
    item = {'values': rank_table(obj, field, scale, damage=bool(damage_field)), 'details': {}}
    for label, (detail_field, detail_scale) in details.items():
        if not obj['data'][detail_field]:
            raise ValueError(f'Empty table {name}.{detail_field}')
        item['details'][label] = rank_table(obj, detail_field, detail_scale, damage='Damage' in obj['data'][detail_field][0]['_common'])
    if identity == 'body-slam':
        damage_field = '_damageMultiplierPerLevel'
        item['details']['physical'] = rank_table(obj, damage_field, damage=True)
    if damage_field:
        item['damageRanges'] = {rarity: [row['_' + rarity]['Damage'] for row in obj['data'][damage_field]] for rarity in RARITIES}
    if '_cooldownPerLevel' in obj['data']:
        item['cooldownMs'] = rank_table(obj, '_cooldownPerLevel', 1000, consumer='server/match/upgrade-effects.ts')
    if '_globalCooldown' in obj['data']:
        item['recoveryMs'] = use(obj, '_globalCooldown', 'server/match/upgrade-effects.ts') * 1000
    abilities[identity] = item

stoner = source('Default_Stoner')
abilities['stoner'] = {
    'values': rank_table(stoner, '_damageMultiplierPerLevel', damage=True),
    'damageRanges': {rarity: [row['_' + rarity]['Damage'] for row in stoner['data']['_damageMultiplierPerLevel']] for rarity in RARITIES},
    'details': {name: rank_table(stoner, field) for name, field in {'ammo': '_maxAmmoPerLevel', 'chargeSeconds': '_chargeTimeToMaxPerLevel', 'statBonus': '_pdAdIncreasePerLevel'}.items()},
    'cooldownMs': rank_table(stoner, '_cooldownPerLevel', 1000),
    'recoveryMs': use(stoner, '_globalCooldown', 'server/match/upgrade-effects.ts') * 1000,
}
charge_rows = use(stoner, '_damageMultiplierRangeBasedOnChargePerLevel', 'server/match/match.ts')
abilities['stoner']['details']['chargedDamage'] = {
    rarity: [value * charge_rows[min(index, len(charge_rows) - 1)]['_' + rarity]['y'] for index, value in enumerate(values)]
    for rarity, values in abilities['stoner']['values'].items() if rarity in RARITIES
}

actions = {}
for identity, fragment in [('bop', 'BasicStartingAttack_'), ('dash', 'BasicStartingDash_')]:
    obj = source('Default_BasicStarting', fragment)
    actions[identity] = {'cooldownMs': rank_table(obj, '_cooldownPerLevel', 1000)['common'][0]}
    if identity == 'bop':
        use(obj, '_damageMultiplierPerLevel', 'server/match/match.ts')
        actions[identity]['damageRange'] = obj['data']['_damageMultiplierPerLevel'][0]['_common']['Damage']
        actions[identity]['recoveryMs'] = use(obj, '_globalCooldown', 'server/match/match.ts') * 1000
    else:
        actions[identity]['distance'] = use(obj, '_distance', 'server/match/upgrade-effects.ts')
        actions[identity]['durationMs'] = use(obj, '_time', 'server/match/upgrade-effects.ts') * 1000

robust = source('Default_Robust')
actions['robust'] = {'sizeToHealth': use(robust, '_sizeToBonusHpMultiplier', 'server/match/match.ts')}
shifty = source('Default_Shifty')
actions['shifty'] = {field: rank_table(shifty, field)['legendary'][0] for field in ['_dodgeMultiplierPerLevel', '_damageMultiplierPerLevel']}

# These are current generic craft profiles, not a claim that original species AI is implemented.
enemies = {}
for species in ['Beeware', 'Blobfish', 'HatBirb', 'Mimic', 'Pantther', 'Sandshark', 'SnowHare', 'Spiderfrog', 'Spitfish', 'Thief', 'Turtoid']:
    enemies[species] = {}
    for stage, suffix in [('early', ''), ('mid', '_Mid'), ('late', '_Late')]:
        for alpha in [False, True]:
            name = species + suffix + ('_Alpha' if alpha else '') + '_EnemyStats'
            obj = source(name)
            stats = obj['data']['_stats']
            names = {'health': 'MaxHp', 'plating': 'MaxPlating', 'physical': 'BasePhysicalDamage'}
            values = {key: stats[field]['_currentFlatValue'] for key, field in names.items()}
            for field in names.values():
                APPLIED.setdefault((obj['file'], obj['pathId']), {})['_stats.' + field] = 'server/match/bots.ts'
            # This build has no named late-alpha HatBirb loot record. Reuse its mid-alpha table.
            drop_name = name.replace('HatBirb_Late_Alpha', 'HatBirb_Mid_Alpha').replace('_EnemyStats', '_FoodDropChancesData')
            drops = source(drop_name)
            values['loot'] = {
                'rarities': {rarity: drops['data']['_foodRarityDropMappings']['_' + rarity]['_weightedChanceToDrop'] for rarity in RARITIES},
                'counts': use(drops, '_howMuchFoodToDropWeights', 'server/match/bots.ts'),
                'currency': use(drops, '_howManyMutagenToDropWeights', 'server/match/bots.ts'),
            }
            for rarity in RARITIES:
                APPLIED.setdefault((drops['file'], drops['pathId']), {})['_foodRarityDropMappings._' + rarity + '._weightedChanceToDrop'] = 'server/match/bots.ts'
            enemies[species][stage + ('Alpha' if alpha else '')] = values

# Flat and percentage stat domains are kept separate during conversion.
STAT_NAMES = {
    'physical': 'BasePhysicalDamage', 'ability': 'BaseAbilityDamage', 'maximumHealth': 'MaxHp', 'social': 'Social', 'speed': 'MovementSpeed',
    'damage': 'GeneralDamageMultiplier', 'cooldowns': 'CooldownModifier', 'attackArea': 'AttackAreaModifier', 'attackPenalty': 'MovementAttackPenaltyReduction',
    'size': 'Size', 'regeneration': 'HpRegeneration', 'plating': 'MaxPlating', 'damageResistance': 'DamageReductionPercentage', 'poisonResistance': 'PoisonReductionPercentage',
    'dodge': 'DodgeChance', 'heatAdaptation': 'HeatAdaptation', 'coldAdaptation': 'ColdAdaptation', 'progress': 'ProgressGainMultiplier',
    'salvageSpeed': 'FeedingSpeed', 'salvageReach': 'FeedingDistance', 'terrainAdaptation': 'TerrainAdaptation', 'senses': 'Senses',
    'sandAdaptation': 'SandTerrainAdaptation', 'snowAdaptation': 'SnowTerrainAdaptation', 'waterAdaptation': 'WaterTerrainAdaptation',
    'sprintSpeed': 'SprintSpeedMultiplier', 'sprintRecovery': 'SprintRecoveryImpactSpeedMultiplier', 'dashCooldown': 'DashCooldownModifier', 'poisonDamage': 'PoisonDamageMultiplier',
    'shieldedResistance': 'ShieldedStatusDamageResistance', 'soakAdaptation': 'SoakAdaptation', 'stunResistance': 'StunReductionPercentage', 'stunDuration': 'StunDurationMultiplier',
    'cataclysmResistance': 'CataclysmReductionPercentage', 'healthFoodMaximumHealth': 'MaxHpIncreaseFromHpFood', 'additionalPoisonTicks': 'NumExtraPoisonTics',
    'poisonTickSpeed': 'PoisonTicksSpeedModifier', 'alphaDamage': 'AdditionalDamageToAlphas', 'effectArea': 'EffectAreaSize', 'statChange': 'StatChangeMultiplier',
}
world = source('WorldStats')
base = {}
limits = {}
for target, original in STAT_NAMES.items():
    entry = world['data']['_originalPlayerStats'][original]
    percentage = '_currentPercentageValue' in entry
    scale = 100 if percentage or target == 'stunDuration' else 1
    base[target] = round(entry['_currentPercentageValue' if percentage else '_currentFlatValue'] * scale, 6)
    limits[target] = [round(entry['_minMaxRange'][key] * scale, 6) for key in ['x', 'y']]
    APPLIED.setdefault((world['file'], world['pathId']), {})['_originalPlayerStats.' + original] = 'server/match/stats.ts'

# Do not export prefabs or original art into the application.
header = '''// Generated by scripts/reconcile-game-data.py from build 1.2__9606.
export type SourceRankTable = Readonly<Record<string, readonly number[]>>;
export type SourceAbilityTuning = {
  values: SourceRankTable;
  details: Readonly<Record<string, SourceRankTable>>;
  damageRanges?: Readonly<Record<string, readonly { x: number; y: number }[]>>;
  cooldownMs?: SourceRankTable;
  recoveryMs?: number;
};
'''
output = header + 'export const SOURCE_ABILITIES: Readonly<Record<string, SourceAbilityTuning>> = ' + json.dumps(abilities, indent=2) + ';\n'
output += 'export const SOURCE_BASE_STATS = ' + json.dumps(base, indent=2) + ' as const;\n'
output += 'export const SOURCE_STAT_LIMITS = ' + json.dumps(limits, indent=2) + ' as const;\n'
output += 'export const SOURCE_ACTIONS = ' + json.dumps(actions, indent=2) + ' as const;\n'
output += '''export type SourceWeights = { m_keys: readonly number[]; m_values: readonly number[] };
export type SourceLoot = { rarities: Readonly<Record<string, number>>; counts: SourceWeights; currency: SourceWeights };
export type SourceEnemyProfile = { health: number; plating: number; physical: number; loot: SourceLoot };
export const SOURCE_ENEMIES: Readonly<Record<string, Readonly<Record<string, SourceEnemyProfile>>>> = ''' + json.dumps(enemies, indent=2) + ';\n'
(ROOT / 'server/content/source-balance.ts').write_text(output)

catalogue = json.loads((ROOT / 'docs/content/source-catalogue.json').read_text())
coverage = {r['content_id']: r['owner'] for r in csv.DictReader((ROOT / 'docs/content/coverage.tsv').read_text().splitlines(), delimiter='\t')}
localization = json.loads((INPUT.parent / 'evolution-localization.json').read_text())
def normalize(value):
    return re.sub('[^a-z0-9]', '', value.lower())
identities = {}
for record in catalogue['records']:
    for name in [record['id'], record['sourceName'], *record.get('sourceAliases', [])]:
        identities[normalize(name)] = record['id']
for identity, (name, *_rest) in BINDINGS.items():
    identities[normalize(name)] = identity
for key, value in localization.items():
    if key.endswith('_TITLE') and normalize(value) in identities:
        identities[normalize(key.split('_')[-2])] = identities[normalize(value)]
identities['courting'] = 'courting-display'

GROUP_OWNERS = {
    'MapGeneration': ['YCCE-033', 'YCCE-034'], 'Biomes': ['YCCE-033', 'YCCE-034', 'YCCE-038'],
    'Stats': ['YCCE-020', 'YCCE-035', 'YCCE-036', 'YCCE-080'], 'AI': ['YCCE-035', 'YCCE-036'],
    'Characters': ['YCCE-035', 'YCCE-036'], 'BehaviourTreeManagement': ['YCCE-035', 'YCCE-036'],
    'TimeManagement': ['YCCE-035', 'YCCE-037', 'YCCE-080'], 'Items': ['YCCE-023', 'YCCE-024', 'YCCE-024B'],
    'POIs': ['YCCE-040', 'YCCE-041', 'YCCE-041A', 'YCCE-041B', 'YCCE-042C'], 'HeatAndCold': ['YCCE-038A'],
    'Mushrooms': ['YCCE-042', 'YCCE-042B'], 'Burrows': ['YCCE-043'], 'Evolutions': ['YCCE-068'],
    'WorldStats': ['YCCE-020', 'YCCE-024', 'YCCE-025', 'YCCE-026A', 'YCCE-080'],
    'CarcinisationEffects': ['YCCE-046', 'YCCE-047', 'YCCE-067', 'YCCE-080'],
    'Damage': ['YCCE-021'], 'GlobalGameDataHolder': ['YCCE-080'], 'Extensions': ['YCCE-080'],
}
NON_GAMEPLAY = {'UI', 'Achievements', 'ContextualDeathTipsBatch', 'StatNameMappings', 'TmpFontLocaleMappings', 'TutorialStepsInfoHolder', 'BossScreenShakeProfile', 'ContextualDeathTipsMappings', 'Holograms', 'CursorSpriteMappingHolder', 'CosmeticDataMappings', 'PlayIntroSplashScreen'}
OMITTED = {'Genetics', 'Difficulties', 'Challenges', 'EICLevelSelector', 'PurchaseableDataMappings'}


def config(value):
    if isinstance(value, list):
        return [config(v) for v in value]
    if isinstance(value, dict):
        return {k: config(v) for k, v in value.items() if k not in {'m_GameObject', 'm_Script', 'm_Name', 'm_Enabled'}}
    return value

records = []
for obj in sorted(OBJECTS, key=lambda o: (o['class'], o['name'], o['file'], o['pathId'])):
    group = obj['class'].split('.')[1]
    identity_name = re.sub(r'_Constraint$', '', obj['name'].removeprefix('Default_'))
    identity = identities.get(normalize(identity_name))
    if 'BasicStartingAttack_' in obj['class']:
        identity = 'bop'
    elif 'BasicStartingDash_' in obj['class']:
        identity = 'basic-dash'
    owners = [coverage[identity]] if identity in coverage else GROUP_OWNERS.get(group, ['YCCE-082'])
    status = 'required-follow-up'
    reason = 'Apply remaining fields in the owning task. Resolve units, references and formulas before binding.'
    if group in NON_GAMEPLAY:
        status = 'reference-only'
        reason = 'Presentation, localization or tutorial metadata. Not a gameplay balance setting.'
    elif group in OMITTED:
        status = 'outside-approved-scope'
        reason = 'Meta progression, difficulty presets, challenges or purchases are not enabled by this import. Retain for an explicit future scope decision.'
    elif re.search(r'Boss|Aquaconda|Clawdia|Crabtaur|Krabaroo|Shellephant|Krabken', obj['class'] + ' ' + obj['name'], re.I):
        status = 'outside-approved-scope'
        reason = 'Boss content is excluded by the agreed game rules. Preserve these settings only as reference; do not implement a boss task.'
    applied = APPLIED.get((obj['file'], obj['pathId']), {})
    records.append({'key': f"{obj['file']}:{obj['pathId']}", 'class': obj['class'], 'name': obj['name'], 'contentId': identity, 'owners': owners, 'disposition': status, 'reason': reason, 'appliedFields': applied, 'configuration': config(obj['data'])})

# Existing gameplay exports predate this reconciliation and remain authoritative consumers.
for record in records:
    field_map = {
        'WorldStats': {'_evolutionRarityDatas.nonBossWeights': 'server/match/offers.ts', '_foodDataRarityMappings.biteXp/healingChance': 'server/match/economy.ts', 'PlayerSocialStatCharmCap': 'server/match/match.ts', 'PlayerSocialStatToCharmImpact': 'server/match/match.ts'},
        'TimeManagementData_FullRun': {'_timeBracketDatas.NumEnemiesSpawned/NormalizedMaxEnemiesAllowed': 'server/match/match.ts'},
        'PassiveCharmData': {'social/distance/pacifism/allies/pity/capacity curves': 'server/match/match.ts'},
        'MushroomManagerData': {'_mushroomNumBitesRequired': 'server/match/match.ts', '_mushroomConsumptionTimePerBite': 'server/match/match.ts', '_mushroomStaticXpPerBite': 'server/match/match.ts', '_mushroomDynamicXpPerBite': 'server/match/match.ts', '_sensesToIdentifyingChance': 'server/match/firmware.ts'},
        'EvolutionAbilityData': {'_evoPointsCurve': 'server/match/economy.ts'},
        'Default_Stoner': {'_damageMultiplierChargeCurve': 'server/match/match.ts', '_distanceChargeCurve': 'server/match/match.ts', '_distanceRangeBasedOnChargePerLevel': 'server/match/match.ts'},
    }.get(record['name'], {})
    record['appliedFields'].update(field_map)
    if record['class'] == 'World.Items.HpFood':
        record['appliedFields'].update({k: 'server/match/economy.ts' for k in record['configuration'] if 'HealWith' in k})
    if record['class'] == 'World.Burrows.Burrow':
        record['appliedFields'].update({k: 'server/match/match.ts' for k in ['_decayLengthAtNormalPlayerSize', '_decayEntryPenalty', '_maxDecayToApplyEntryPenalty', '_decayContributionPerSecondBasedOnPlayerSize']})

counts = Counter(r['disposition'] for r in records)
plan = (ROOT / 'IMPLEMENTATION_PLAN.md').read_text()
known_owners = set(re.findall(r'### (YCCE-[\w-]+)\.', plan))
unknown_owners = {owner for record in records for owner in record['owners'] if owner not in known_owners}
if unknown_owners:
    raise ValueError(f'Unknown task owners {sorted(unknown_owners)}')
retained = {'schemaVersion': 1, 'sourceBuild': '1.2__9606', 'inputSha256': hashlib.sha256(INPUT.read_bytes()).hexdigest(), 'policy': 'Every decoded record is retained. appliedFields names current consumers only; every other configuration field remains assigned to owners. A decoded number does not prove its runtime formula. Bosses remain excluded even where configurations share a record with normal gameplay.', 'counts': dict(counts), 'decodeFailures': json.loads((INPUT.parent / 'decode-errors.json').read_text()), 'decodeFailureOwner': 'YCCE-082', 'records': records}
(ROOT / 'docs/content/local-game-configuration.json').write_text(json.dumps(retained, indent=2, ensure_ascii=False) + '\n')

# Attach actual local tables to existing records instead of leaving numericalTables unresolved.
for record in catalogue['records']:
    canonical = {'resistant': 'immune-system', 'hyperkeratosis': 'fibroblasts', 'body-slam-tail': 'body-slam'}.get(record['id'], record['id'])
    matching = [r for r in records if r['contentId'] == canonical]
    if matching:
        record['localConfiguration'] = {'build': '1.2__9606', 'file': 'local-game-configuration.json', 'keys': [r['key'] for r in matching], 'owner': record['owner'], 'canonicalContentId': canonical, 'policy': 'Use decoded configuration before estimates. Unconsumed fields remain implementation work; source runtime formulas and version parity are not verified.'}
        record['candidateFields']['numericalTables'] = {'source': 'local-game-configuration.json', 'keys': [r['key'] for r in matching]}
    if record['id'] in ['resistant', 'hyperkeratosis']:
        record['identityDecision'] = f"The local 1.2__9606 localization identifies this internal name as {canonical}. Use that canonical upgrade's numeric records, not a separate selectable upgrade. The earlier unused-name inference is superseded; graph reconciliation and 1.2.1 parity remain pending."
(ROOT / 'docs/content/source-catalogue.json').write_text(json.dumps(catalogue, indent=2, ensure_ascii=False) + '\n')
print(json.dumps({'retainedRecords': len(records), 'boundAbilities': len(abilities), 'dispositions': counts}))
