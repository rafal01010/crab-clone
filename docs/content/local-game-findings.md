# Findings from the local game build

Inspected on 2026-11-16. This report compares the local distribution with `source-catalogue.json`, the reference bundle, `product-rules.md`, and the source-map notes in `experiments.md`. It prioritizes new evidence and corrections. The initial inspection was research only. The user-requested playtest corrections below now apply selected configuration to production gameplay; other catalogue entries retain their existing dispositions.

## Source and reliability

The inspected directory is `/Users/dave/Downloads/Everything.is.Crab.v1.2/Everything.is.Crab.v1.2.ALL.DLC`.

`globalgamemanagers` reports bundle version **1.2__9606** and Unity **6000.2.15f1**. This is direct evidence for that build, not proof of the project's pinned 1.2.1 behavior. The extracted global data holder links the evolution registry, world stats, enemy mappings, and POI mappings described below.

[local-game-evidence.json](local-game-evidence.json) records selected configuration, 109 evolution identities, asset filenames, path IDs, and SHA-256 hashes. Field names remain intact so values can be traced to the files. Decimal values below are rounded for readability.

The extraction decoded 1,683 selected gameplay objects and recorded 43 failures. Each accepted object consumed its full serialized byte count. Its script pointer also matched UnityPy's independently parsed object header. These checks support the decoding, but do not establish which settings runtime code overrides. Failed records are not treated as empty or absent.

Full extracted data is retained locally under the already ignored `hovercraft_codex_reference_bundle/local-game-data/` directory. It includes `objects.json`, `decode-errors.json`, `inventory.json`, `english-tables.json`, `evolution-localization.json`, and a hash manifest. Artwork and audio were not exported.

## Map generation

The gameplay scene's `MapGenerator`, `level7` path ID 12721, has the following settings.

| Setting                                    | Stored value                                   | Interpretation limit                                         |
| ------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------ |
| Region width and height                    | 15 × 10                                        | A region's cell dimensions, not the total world dimensions.  |
| Cells to create beside the player          | 16 per side                                    | A generation neighborhood, not a world boundary.             |
| Cells to create above and below the player | 10 in each direction                           | Exact inclusion of the center cell requires code inspection. |
| Water depth                                | Curve reaches depth 1 at five tiles from shore | Water slowdown also has a separate nonlinear depth curve.    |
| Food-provider placement near spawn         | X distance 3–5, Y distance 3–4                 | Placement constraints, not world dimensions.                 |

`Map Generation Config Data`, `sharedassets7.assets` path ID 9397, supplies heat and humidity terrain-selection rules. Its stored order is:

1. Water at humidity 0.95–1.
2. Sand at heat 0.85–1.
3. Snow at heat 0–0.30 and humidity 0–0.70.
4. Sand at heat 0.45–1 and humidity 0–0.60.
5. Water at heat 0–0.60 and humidity 0.51–1.
6. A degenerate rule with terrain ID 0, heat 0–0, and humidity 1–1. Its comment mentions snow, but the terrain ID does not identify the normal snow terrain. Do not translate this into a new biome rule without checking the code.
7. Grass fallback over the full heat and humidity ranges.

Heat and humidity Perlin scale modifiers are 73 and 43. Both redistribution powers are 1. The starting-area safety setting is the vector 11, 20. That vector alone does not establish the safe area's full width and height.

The settings support generation around a moving player using regions and noise fields. **A fixed overall map width, height, or radius has not been established. An infinite world has not been proven.** The noise scales describe generation inputs, not exact biome widths.

This is enough to design a closer map generator. It is not enough to quote an exact total source-map area. Camera scale, cell-to-world scale, generation method bodies, region disposal, and any distant boundary still need investigation before claiming traversal parity.

Before this map revision, `shared/arena.ts` constructed a fixed 60 × 60 square with four rectangular biome areas and seed-rotated starting biomes. Those four areas were not equivalent to the source's 15 × 10-cell generation regions. The replacement uses shared noise-based terrain, guaranteed grassy starts, and a user-selected 240 × 240 extent for playtesting. Its dimensions and unit mapping remain project estimates. See [the implementation and playthrough observations](../experiments.md#source-map-scale).

User clarification on 2026-11-16 establishes grassy starting regions as a project requirement for every player, with enough local content for early progression. Alternate starting biomes are reserved for a future Splicing design. This requirement is recorded in `product-rules.md` and implemented by the replacement generator. Its exact starting-area radius is a project estimate.

Region dimensions, biome shapes, and overall boundary shape are independent. Rectangular generation regions can contain pieces of several irregular biomes, and the match can impose a square or circular outer boundary over those regions. A finite outer boundary for our multiplayer match would be a project adaptation, not an established source-game measurement. All players would occupy one shared seeded world rather than separate maps centered on themselves.

### Four-player implications

The source's single-player generation neighborhood should become the union of neighborhoods around the active players on our authoritative host. Overlapping neighborhoods must share region state and entity identities. Widely separated players can require approximately four times one player's local simulation work under a comparable per-player loading policy. That is a planning estimate, not a measured cost.

A practical design uses one match seed, deterministic region coordinates, shared region state, and per-player visibility. Generate terrain when a player approaches it. Keep combat simulation active around every living player. Use reduced simulation for distant regions and preserve claimed POIs, consumed resources, and surviving entity state when regions become inactive. Reusing one region must not duplicate its rewards.

The source already exposes reduced-region simulation modifiers in `WorldStats`. Highly simulated regions have enemy food-consumption and food-provider-speed modifiers of 0.25. Lowly simulated regions use 0.10. The names and values establish separate simulation tiers. Their exact scheduling and the suitability of these values for multiplayer remain unverified.

This is an architectural consideration, not a reason to restrict the game to one player. Our shrinking finale is a project rule and will still need a finite playable boundary even if terrain generation can extend farther.

## Run schedule and time-dependent population

The gameplay `TimeManager`, `level7` path ID 17988, is serialized in the gameplay scene. Its `_timeManagementData` points to `TimeManagementData_FullRun`, `sharedassets7.assets` path ID 10000. That record points to `FullRun_16m_EventMomentsData`, path ID 9392.

| Source run time | Configured event                                     |
| --------------- | ---------------------------------------------------- |
| 30 seconds      | Unlock a splicing opportunity.                       |
| 240 seconds     | Random boss event.                                   |
| 480 seconds     | Random boss event.                                   |
| 720 seconds     | Random boss event, with support for multiple bosses. |
| 960 seconds     | Specific boss ID 1180.                               |

The scene's `_timeCanFlowWhenBossFightIsActive` is 0. The random boss events store 90-second timeout durations, and the final specific event stores 120 seconds. Timeout-result enum meanings and exact event handling still require code inspection.

This provides direct configuration evidence for 16 minutes of normal run-clock progression before the final boss. It does not establish a 16-minute wall-clock session. Our 18-minute pre-shrink allowance and 10-minute finale remain separate multiplayer adaptations.

`TimeManagementData_FullRun` also contains timed overrides for food rarity, food providers, enemy populations, enemy types, and other world parameters. Initial defaults include 5–7 enemies per region, 2–3 food providers per region, 5–8 seconds between provider spawns, and POI spawn chance 0.175 per region. Overrides start immediately, including a bracket labelled 0:01–0:09. These starting defaults must not be applied to an entire run without the override timeline.

## Evolution identities and catalogue corrections

`EvolutionAbilityData`, `resources.assets` path ID 54855, contains **109 registry entries**. This includes hidden starting actions and branching abilities. It is not a count of 109 normally selectable offers. The specialization registry at path ID 54856 contains 38 entries.

Internal IDs and localization keys were matched to English table entries using the shared localization key IDs. All 328 evolution localization entries matched through this method.

| Internal identity       | Display name in this build | Effect on existing research                                                                                                          |
| ----------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Resistant, ID 1021      | Immune System              | Already represented by the Immune System candidate. The separate provisionally unused Resistant candidate is an alias in this build. |
| Hyperkeratosis, ID 1204 | Fibroblasts                | Already represented by Fibroblasts. The separate provisionally unused Hyperkeratosis candidate is an alias in this build.            |
| Carrion, ID 785         | Scavenger                  | Confirms the existing provisional alias for this build.                                                                              |
| Hide, ID 403            | Turtle Down                | Confirms the existing provisional alias for this build.                                                                              |
| Starting attack, ID 100 | Bop                        | Separate from learned Body Slam, ID 241.                                                                                             |
| ID 300                  | Courting                   | Existing candidate is named Courting Display.                                                                                        |

Comparing normalized display names with the 112 catalogue candidates leaves only Courting unmatched on the file side. The catalogue side has Body Slam (Tail), Courting Display, Resistant, and Hyperkeratosis unmatched. The three extra records correspond to the tail duplicate candidate and the two aliases above. This reconciles the inventory at the identity level for the inspected build. It does not prove 1.2.1 availability or every candidate's eligibility.

Horns has `_hasSpecializations` set to 0. Turtle Down has two specialization IDs, 90 and 91, triggered at stored specialization level 3. Resistant and Hyperkeratosis each have three stored upgrades, contradicting the older zero-upgrade placeholder interpretation. Immune System's poison-resistance table and Fibroblasts' HP-related table decode successfully.

The files also expose structured prerequisites, bans, affinity links, minimum rarity, branching flags, and ranks. For example, `Spit_Constraint`, `resources.assets` path ID 54845, is an OR of three ability-level constraints. Stored operator and level conventions must be decoded before translating these into user-facing rank requirements. This report does not overwrite the existing prerequisite rule from web evidence.

## Numerical data that can replace estimates

| Area              | New direct evidence                                                                                                                        | Source location                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Player defaults   | Movement-speed stat 5, maximum HP 50, regeneration stat 3, Social stat 5                                                                   | `resources.assets`, WorldStats, path ID 54888. Regeneration units and interval are not established here.                 |
| Stat limits       | Size multiplier 0.4–5, dodge chance capped at 0.75, speed stat 0.5–40                                                                      | WorldStats `_originalPlayerStats`. These are stat limits, not collider dimensions or guarantees about final speed.       |
| Food rewards      | Common, rare, epic, legendary bite rewards 2, 6, 18, 55, with the same extra reward on the final bite                                      | WorldStats `_foodDataRarityMappings`.                                                                                    |
| Feeding timing    | Initial player bite 0.01 seconds, subsequent bites 0.7 seconds, enemy consumption 0.75 seconds                                             | WorldStats. Runtime modifiers can change these.                                                                          |
| Terrain penalties | Grass 0, sand 0.125, snow 0.20, water 0.75                                                                                                 | `sharedassets7.assets` terrain data at path IDs 9449, 9610, 9786, 9982. Water also depends on depth.                     |
| Offer rarity      | Level-dependent weight tables, with common weight zero at levels 5, 10, 15, 20, 25, and 30                                                 | WorldStats `_evolutionRarityDatas`. Boss weights and overlapping level ranges mean these are not standalone percentages. |
| Currency          | Ordinary reroll starts at 1 and increases by 1. Branch reroll and upgrade start at 10 and increase by 10. Specialization skip bonus is 10. | WorldStats. These confirm or refine existing research rather than introduce new mechanics.                               |
| Day and night     | Stored day duration 125 seconds, night duration 85, transition duration 15                                                                 | WorldStats `_resumableWorldStatsData`. Whether transitions are included in those durations needs code inspection.        |
| Enemy balance     | 94 basic enemy-stat records, with regular, alpha, mid, and late variants among them                                                        | Full local extraction. These are asset-record counts, not species counts.                                                |
| Enemy rewards     | 92 food-drop chance records                                                                                                                | Full local extraction.                                                                                                   |
| Ability balance   | 109 named ability-data objects with rank and rarity tables across the extracted files                                                      | Full local extraction. These are data-object counts, not an independently proven selectable total.                       |

Spit supplies a concrete example of the additional precision. `Default_Spit`, `sharedassets0.assets` path ID 17650, stores common damage multipliers of 0.5–0.7 at the first table entry, a cooldown of 1.5 seconds, and range entries 10, 12, 14, 16, and 20. Other rarity tables are present. These values are useful inputs, but the damage multiplier still needs the runtime damage formula and the range needs a source-to-project unit mapping.

Turtle Down's `Default_Hide`, path ID 17658, stores 0.75-second protection, 0.95 protected damage resistance, and 1.5-second stun. This confirms that its old internal Hide name does not describe a stealth ability.

## Applied playtest corrections

The follow-up implementation uses `scripts/extract-gameplay-tuning.py` to generate `server/content/source-gameplay.ts` from the retained decoded objects. It applies the population schedule, level-dependent rarity weights, four-bite food totals (10/30/90/275), 0.7-second later bites, friendship curves and timers, ally-capacity curve, firmware identification curve, mushroom bite settings, Horns damage tables and cooldown, and Tail Wag rank multipliers. Unweighted Unity curves use their stored Hermite tangents. This is implementation evidence; behavioral verification is pending.

The large map previously retained a small global population and wandering near the world origin. Wild animals now replenish around living players, wander around their own spawn, and despawn beyond every player's active neighborhood. Three source-region equivalents produce an estimated target of 10–24 nearby wild animals per neighborhood, with a shared cap of 64 wild animals and 96 total creatures. Nearby players share that population; widely separated players compete for the global cap. Replenishment is limited to three spawns per living player per second, at radii 14–22, with an aggro radius of 18. Half the role cycle consists of hunters. These scales, role proportions, caps, despawn policy, and elite schedule are multiplayer estimates, not decoded source rules or measured hardware budgets.

Ambient food is limited to four nearby provider resources, two new provider drops per five seconds, and three lifetime drops per provider. Enemies continue to drop food. Diet builds retain access to vegetation and aquatic food. The exact original kill-drop probabilities, experience curve indexing, and guaranteed-secondary acquisition rules remain unverified. The existing provisional level requirement is unchanged. Extracted rarity weights alone do not establish exact offer probabilities: eligibility, affinity weighting, rarity upgrades, and the incomplete selectable catalogue still affect outcomes. Horns starts at Rare, matching the source registry; an unused Common damage table does not establish Common availability.

`World.Burrows.Burrow`, `sharedassets0.assets` path ID 19567, was additionally decoded. It stores a 5.25-second normal-size lifetime, a 0.05 entry penalty while decay is below 0.9, and a size-based decay curve. We now share each hole's finite lifetime across entries, remove it when exhausted, let E enter and exit, hide the occupant, and stop thermal exposure while sheltered. Normal size leaves about five seconds after the first entry; larger players exhaust it faster. This replaces the old reusable 15-second shelter cooldown. The supplemental object is included in the evidence file without rewriting the initial extraction counts.

Firmware translates source mushrooms. Capsules now identify automatically using Senses, preserve appearance knowledge privately, and take four consumption stages with a 0.7-second base interval after the first. Each stage grants progress; finishing applies the appearance's effect. Their placement is independent of burrow holes. The existing 16 translated effects and their coefficients remain estimates: 14 source effect records failed the targeted decode. Source random effect delays and possible zero/two-effect rolls are not yet reproduced. Do not describe this as a complete mushroom parity pass.

Base friendship offers follow the post-1.1 interaction mechanic: occasional green creatures offer friendship, and approaching and interacting accepts the offer. Attacking cancels pending offers. The extracted reevaluation interval is 3–5 seconds, offer duration 8 seconds, and reoffer delay 20 seconds. Multiplication of the extracted social, distance, pacifism, ally-count, and pity curves is a reconstruction estimate. Evolution-driven charm remains automatic and separate from offers.

Tail Wag is now a selectable passive after Tail. Its source configuration attempts charm every five seconds and supplies rarity/rank multipliers: Rare 0.6–1, Epic 0.75–1.25, Legendary 0.9–1.6. It rolls for eligible nearby animals until ally capacity is filled, without an input or offer acceptance. A six-unit base radius scaled by attack area is an estimate. The provisional base chance is `InitialCharmChance × (1 + PlayerSocialStatToCharmImpact(Social))`, clamped to [0, 1], then multiplied by the evolution's rank multiplier and the source alpha multiplier of 0.3. The exact source chance assembly and time-dependent resistance remain unverified. Whining remains unavailable; generic runtime hooks are not proof that every charm evolution is implemented.

Horns now uses the melee strike path, physical damage, plating bypass, and a one-second own cooldown, instead of the movement-only charge path. Its source description calls it a headbutt dashing attack; the precise lunge motion remains unverified in this correction. Spur must be equipped and follows other manual attacks automatically. Primary and secondary track independent cooldowns with a brief shared recovery (200 ms normally, 300 ms for Horns). New attacks fill primary and then secondary, and replace secondary when both are occupied. Replacement is disclosed on the upgrade card. Existing learned attacks can still be rearranged during choices, consistent with the developer's [slot explanation](https://steamcommunity.com/app/3526710/discussions/0/572668602725034969/).

Solo death now produces “Run ended” instead of “Draw.” A last multiplayer survivor can keep playing. Boundary damage continues after collapse and increases rather than instantly ending the run; a living human is not stopped by a session timer. Simultaneous final multiplayer deaths can still draw. The reported 11m 28s result does not establish the cause of that death. The supplied Vite HMR/proxy logs do not contain a host exception, so the return-to-lobby ECONNRESET cause remains unconfirmed.

### Video observations

Short excerpts of [ThePauseMenu's patch 1.2 playthrough](https://www.youtube.com/watch?v=T_YJQ9Q7350) at 4:30–5:00, 10:00–10:30, 17:00–17:30, and 21:00–21:30 were sampled as frame montages. Gameplay excerpts show recurring nearby creatures, combat and drops; menu excerpts do not establish density. A 1:00–1:30 excerpt of [Gaming With Jeff's challenge run](https://www.youtube.com/watch?v=f5Dw39eQGYk) includes snow exploration and menus, so it is not treated as a normal-population measurement.

The user's [pacifist playthrough](https://www.youtube.com/watch?v=z_jOZPOd_wQ) was published on 2025-12-19, before the June 2026 1.1 friendship update. A 6:37–7:07 excerpt shows the pack-forming chapter, nearby wild and allied creatures, menus and visible area pulses. It supports the historical distinction, but these sampled frames do not prove the exact charm formula or that every pulse caused a successful charm. None of these observations is a full-video review or an exact enemy count measurement. The [1.1 patch notes](https://steamdb.info/patchnotes/23879270/) establish the newer base friendship-offer interaction.

## What remains uncertain

- Exact total world bounds and cell-to-world scale.
- Full runtime formulas, including stat stacking, damage resolution, and curve inputs.
- Runtime overrides from difficulty, unlocks, cosmetics, and other modes.
- Meaning of unresolved numeric enums and whether stored rank indices are zero-based.
- Behavior of the 43 records that failed decoding.
- Differences between this 1.2 build and the target 1.2.1 hotfix.

Further reconciliation should map the remaining implemented abilities to numeric data and inspect the unresolved runtime formulas. Existing multiplayer adaptations should remain explicit instead of being silently replaced by single-player source behavior.

## Reproducing the gameplay extraction

The decoder uses UnityPy 1.25.4 and TypeTreeGeneratorAPI 0.0.10 in `/private/tmp/crab-file-research-venv`. The extraction script reads assets and metadata without starting the executable.

```sh
/private/tmp/crab-file-research-venv/bin/python scripts/extract-unity-research.py \
  '/Users/dave/Downloads/Everything.is.Crab.v1.2/Everything.is.Crab.v1.2.ALL.DLC' \
  /private/tmp/crab-game-research
```

The script regenerates gameplay objects and decode errors. The retained localization tables, identity evidence, and manifest document this inspection separately. The script corrects assembly lookup, aligns Unity object headers, and resolves serialized reference types through the metadata. It records failures rather than accepting partial reads.

Regenerate the selected production tuning after placing the decoded objects at the retained ignored path:

```sh
python3 scripts/extract-gameplay-tuning.py
npx prettier --write server/content/source-gameplay.ts
```

## Complete configuration reconciliation

The later reconciliation retains every decoded record in [local-game-configuration.json](local-game-configuration.json), with task owners, scope decisions, actual configuration fields, and current consumer paths. It includes the three additional basic/HP-food components, bringing the decoded inventory to 1,687. The 43 earlier decoding failures remain separately assigned to the release audit. Older paragraphs in this report describe the earlier inspection and are superseded by this section where they describe implementation state.

The application now imports rank tables for 62 upgrades, source player base stats and limits, Bop/Dash tuning, 66 non-boss enemy profiles, weighted enemy drops, the enabled progression curve, and HP-food tuning. Every other usable field is retained as mandatory implementation work in its assigned task. [The content guide](README.md#configuration-imports-and-remaining-ownership) records consumers and formula limits.

The source localization identifies `Default_Resistant` as **Immune System** and `Default_Hyperkeratosis` as **Fibroblasts**. These identity matches supersede the earlier unused-name inference. The production imports use those mappings. Their older catalogue entries remain research candidates for the graph reconciliation owner to merge or disposition explicitly.

Ordinary food grants progress. Healing food is a subset, with source base chances of 7.5% for common and 5% for rare food, plus applicable Forager bonuses. Epic food has zero base healing chance; legendary food cannot heal. Healing uses 5 flat HP plus 0.125% maximum HP for a normal bite. The final bite uses 10 flat HP plus the normal 0.125% and an additional 0.25%. The flat replacement interpretation needs runtime confirmation. Base regeneration is 3 HP per 10 seconds in the current runtime. Food and regeneration values replace the earlier zero-regeneration and percentage-only healing estimates.

The generic enemy controller uses source HP, plating, and base physical damage. It does not reproduce original species attacks merely by importing their base stat. Current contact damage uses a reconstructed multiplier of one. Species-specific AI, attacks, and other unconsumed fields remain required follow-ups. No boss is enabled.
