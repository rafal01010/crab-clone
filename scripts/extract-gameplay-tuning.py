"""Export selected decoded configuration as production tuning, without game assets."""

import json
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent.parent
objects = json.loads((root / 'hovercraft_codex_reference_bundle/local-game-data/objects.json').read_text())


def data(name):
    matches = [obj for obj in objects if obj['name'] == name]
    if len(matches) != 1:
        raise ValueError(f'Expected exactly one {name}, found {len(matches)}')
    return matches[0]['data']


def curve(value):
    if any(point['weightedMode'] for point in value['m_Curve']):
        raise ValueError('Weighted curves need a different evaluator')
    return [{key: point[key] for key in ['time', 'value', 'inSlope', 'outSlope']} for point in value['m_Curve']]


world = data('WorldStats')
run = data('TimeManagementData_FullRun')
references = {item['rid']: item for item in run['references']['RefIds']}
state = run['_startingData']
population = state['NumEnemiesSpawned']['_numEnemiesPerRegion']
density = state['NormalizedMaxEnemiesAllowed']['_normalizedMaxEnemiesAllowed']
timeline = []
elapsed = 0
for bracket in run['_timeBracketDatas']:
    if elapsed > 960:
        break
    changed = False
    for pointer in bracket['_timeDataOverrides']:
        item = references[pointer['rid']]
        if item['type']['class'] == 'NumEnemiesSpawned_TimeDataOverride':
            population = item['data']['_numEnemiesPerRegion']
            changed = True
        if item['type']['class'] == 'NormalizedMaxEnemiesAllowed_TimeDataOverride':
            density = item['data']['_normalizedMaxEnemiesAllowed']
            changed = True
    if changed:
        timeline.append({'atMs': elapsed * 1000, 'minimum': population['x'], 'maximum': population['y'], 'density': round(density, 4)})
    elapsed += bracket['_duration']

passive = data('PassiveCharmData')
mushrooms = data('MushroomManagerData')
horns = data('Default_Horns')
tail_wag = data('Default_TailWag')
burrow = next(obj['data'] for obj in objects if obj['class'] == 'World.Burrows.Burrow')
hp_food = next(obj['data'] for obj in objects if obj['class'] == 'World.Items.HpFood')
evolutions = data('EvolutionAbilityData')
stoner = data('Default_Stoner')
if not evolutions['_determineEvolutionPointsViaCurve']:
    raise ValueError('Source build no longer enables the XP curve')
rarities = ['common', 'rare', 'epic', 'legendary']
result = {
    'build': '1.2__9606',
    'enemyPopulation': timeline,
    'offerRarities': [{'minimumLevel': row['_allowedPlayerLevels']['x'], 'maximumLevel': row['_allowedPlayerLevels']['y'], 'weights': {rarity: row['_evolutionWeightedRarities']['_' + rarity] for rarity in rarities}} for row in world['_evolutionRarityDatas']],
    'passiveCharm': {
        'reevaluateMs': {key: value * 1000 for key, value in passive['_timeRangeBetweenReevaluations'].items()},
        'durationMs': passive['_timeToOfferPassiveCharmingChanceRange']['x'] * 1000,
        'reofferMs': passive['_minTimeBetweenReofferingToSameEnemy'] * 1000,
        'minimumChance': passive['_absoluteMinimumChanceToOfferPassiveCharming'] / 100,
        'alphaMultiplier': passive['_alphaChanceMultiplier'],
        'social': curve(passive['_socialStatChanceMultiplierCurve']),
        'distance': curve(passive['_distanceScalingChanceMultiplierCurve']),
        'pacifism': curve(passive['_pacifistPlaystyleChanceMultiplierCurve']),
        'allies': curve(passive['_currentNumCharmedAlliesMultiplierCurve']),
        'pity': curve(passive['_pityTimerChanceMultiplierCurve']),
        'capacity': curve(world['PlayerSocialStatCharmCap']),
        'maximumCapacity': world['_defaultMaxCharmCap'],
    },
    'evolutionCharm': {'initialChance': world['InitialCharmChance'], 'socialImpact': curve(world['PlayerSocialStatToCharmImpact']), 'alphaMultiplier': world['AlphaEnemyResistanceToCharmMultiplier']},
    'tailWag': {'intervalMs': tail_wag['_timeBetweenTailWagsPerLevel'][0]['_rare']['Value'] * 1000, 'multipliers': {rarity: [round(row['_' + rarity]['Value'], 2) for row in tail_wag['_charmChanceIncreasePerLevel']] for rarity in rarities[1:]}},
    'burrow': {'lifetimeMs': burrow['_decayLengthAtNormalPlayerSize'] * 1000, 'entryPenalty': burrow['_decayEntryPenalty'], 'maximumEntryPenaltyDecay': burrow['_maxDecayToApplyEntryPenalty'], 'sizeContribution': curve(burrow['_decayContributionPerSecondBasedOnPlayerSize'])},
    'mushroom': {'bites': mushrooms['_mushroomNumBitesRequired'], 'biteMs': mushrooms['_mushroomConsumptionTimePerBite'] * 1000, 'staticXp': mushrooms['_mushroomStaticXpPerBite'], 'dynamicXp': mushrooms['_mushroomDynamicXpPerBite']},
    'firmwareIdentification': curve(mushrooms['_sensesToIdentifyingChance']),
    'progression': {'requirements': curve(evolutions['_evoPointsCurve']), 'minimumModifiedLevel': world['MinLevelForProgressNeededToLevelUpMultiplierToAffect']},
    'stoner': {'damageCharge': curve(stoner['_damageMultiplierChargeCurve']), 'distanceCharge': curve(stoner['_distanceChargeCurve']), 'distances': {rarity: [row['_' + rarity] for row in stoner['_distanceRangeBasedOnChargePerLevel']] for rarity in rarities}, 'multipliers': {rarity: [row['_' + rarity] for row in stoner['_damageMultiplierRangeBasedOnChargePerLevel']] for rarity in rarities}},
    'food': {
        'totals': {rarity: world['_foodDataRarityMappings']['_' + rarity]['BaseEvolutionPointsGivenWithEachBite']['x'] * hp_food['_numBitesRequired'] + world['_foodDataRarityMappings']['_' + rarity]['ExtraBaseEvolutionPointsGivenWithFinalBite']['x'] for rarity in rarities},
        'healingChance': {rarity: world['_foodDataRarityMappings']['_' + rarity]['ChanceToBecomeHp'] for rarity in rarities},
        'minimumLevel': {rarity: world['_foodDataRarityMappings']['_' + rarity]['MinEvolutionLevelBeforeSpawning'] for rarity in rarities},
        'healing': {'flatPerBite': hp_food['_flatHpToHealWithEachBite'], 'fractionPerBite': hp_food['_percentageOfMaxHpToHealWithEachBite'], 'finalFlat': hp_food['_flatHpToHealWithFinalBite'], 'finalExtraFraction': hp_food['_extraPercentageOfMaxHpToHealWithFinalBite']},
        'subsequentBiteMs': world['_subsequentPlayerBitesEdibleConsumptionTime'] * 1000,
    },
    'horns': {'damageRanges': {rarity: [row['_' + rarity]['Damage'] for row in horns['_damageMultiplierPerLevel']] for rarity in rarities}, 'cooldownMs': horns['_cooldownPerLevel'][0]['_common']['Value'] * 1000},
}
target = root / 'server/content/source-gameplay.ts'
serialized = json.dumps(result, indent=2)
# Python and JavaScript can choose different shortest spellings for the same binary float.
serialized = re.sub(r'(?m)(?<=: )(-?\d+\.\d+(?:e[-+]?\d+)?)(?=,?$)', lambda match: format(float(match[0]), '.17g'), serialized)
target.write_text('// Generated by scripts/extract-gameplay-tuning.py from local build 1.2__9606.\nexport const SOURCE_GAMEPLAY = ' + serialized + ' as const;\n')
