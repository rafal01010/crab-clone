# Source catalogue

This directory contains internal research for the pinned Everything is Crab 1.2.1 baseline. Source names identify mechanics for comparison. They are not product names or permission to reuse source assets.

`source-catalogue.json` replaces the old CSV as the working reconciliation record. It retains every seed candidate's disposition, canonical candidate ID, evidence, proposed hovercraft translation, and unresolved questions. `coverage.tsv` maps abilities and specialization options to implementation owners. Neither file is a production gameplay registry. Every record remains research-only until its required fields are resolved and its behavior is verified.

## Field meanings

- `candidateFields` holds reported research values. It does not establish version fidelity. Partial numerical examples retain their older-reference label.
- `availability.prerequisites` represents all-of, any-of, minimum rank, and specialization conditions. `unresolved` differs from an explicit `none` condition.
- `availability.exclusions` contains normalized symmetric candidate bans. Conditional rank caps remain in `rankConstraints`; converting those caps to whole-ability bans would lose acquisition-order behavior.
- `bundleRelationships` preserves the seed's original prerequisite, exclusion, and reverse-unlock text so a correction cannot erase its source.
- `questions` names the source fields still requiring confirmation. Each question has an owner. A missing table or empty candidate field is not a zero effect or evidence of no prerequisite.
- `specializations` has a separate identity for each known option. Names do not justify invented effects. The parent owns each option's trigger, permanence, skip transaction, and numerical behavior.
- `releaseState` prevents research status from being mistaken for approval. A production content release must reject required unresolved fields rather than fill them with generic bonuses.

## Inventory reconciliation

The seed combines an older 103-ID inventory, six additions reported in developer patch notes, and three wiki candidates. These are different inventories, not an arithmetic proof of a current playable total. The record preserves 112 seed dispositions. Its 112 canonical candidates include a separate Bop and a provisional Carrion-to-Scavenger mapping. The equal counts are incidental.

The [older inventory](https://hinamizawa.ai/everything-is-crab/evolutions/) labels the hidden starting attack as Body Slam while its detail names Bop. Learned Body Slam scales with maximum HP. The two must remain distinct. The tail-labelled variant has its own identity question and cannot silently become another starting action.

The [Neoseeker reference](https://www.neoseeker.com/everything-is-crab/Evolution_Traits) reports Turtle Down with Hide-prefixed fields. The current canonical candidate is Turtle Down, with timed protection and contact-block stun. The legacy stealth description is rejected. Its alias mapping still needs versioned confirmation before release. Basic Dash is another hidden starting action rather than a normal offer.

Subcutaneous Fat is a candidate missing under that name from the CSV. The Fat mapping remains provisional. Carrion and Scavenger also need versioned ID comparison. Resistant and Hyperkeratosis remain individually owned unresolved records. No candidate has been declared retired or omitted merely because its current behavior is unknown.

The [Spit card](https://everythingiscrab.wiki.gg/wiki/Spit) supports the previously missing Beak-rank-two, Jaws, or Saliva prerequisite. Synapse's Cortex-rank-three requirement appears in the bundle crosswalk and indexed wiki. Both now have structured candidate edges. Leap's Bouncy and Heavy options are retained separately. Older Horns imagery suggests Goat, but the [Horns card](https://everythingiscrab.wiki.gg/wiki/Horns) lists no specialization. That remains an explicit identity question.

The [1.1 notes](https://steamdb.info/patchnotes/23879270/) and local crosswalk identify Tracker, Lick Wounds, and later specialization and rarity changes. The [1.2 notes](https://steamdb.info/patchnotes/24669494/) add Projectile Tongue, Pedal Glands, Spinnerets, and Jet. The [1.2.1 hotfix](https://steamdb.info/patchnotes/24809473/) corrects concurrent branch-fruit and regular level rewards. No later preview content enters the catalogue.

Extremophile and Strength in Numbers remain finale candidates. Their source final-boss eligibility must map explicitly to the shrinking-area finale. An old endless label is not a reason to remove them.

## Evidence limits

Research on 2026-11-14 retrieved the older inventory and official patch archives. Direct wiki and Neoseeker requests returned 403. Indexed excerpts, individual-card searches, and the local bundle supplied the available comparisons. A full versioned Codex export was not available. The record therefore does not claim a complete verified 1.2.1 inventory.

Remaining source work includes complete rank-by-rarity tables, all specialization effects and trigger ranks, account-gate removal for equal match access, rank caps, acquisition-order exceptions, and conflicts in rarity and affinity. The catalogue records individual questions instead of selecting conflicting values silently. The checkpoint owns independent inventory comparison, reachability and reverse-edge audits, and behavioral evidence. Production bindings must resolve their required source questions before release.

The [starting skills reference](https://hinamizawa.ai/everything-is-crab/darwin/) reports Bop and Basic Dash values from game assets. It does not identify the game version for those assets. These values are useful research, but they do not establish the pinned 1.2.1 behavior or an implemented hovercraft effect. Both records remain blocked.

Run `node scripts/audit-catalogue.mjs` to check catalogue identities, ownership, evidence references, field-level evidence or owned questions, prerequisite targets, specialization targets, and symmetric exclusions. Its reachability calculation treats unresolved prerequisites as potentially satisfiable and ignores acquisition-order restrictions and exclusions. It detects some broken references and cycles but does not prove a legal build or establish source accuracy.

The host also registers the project's fixed Standard starting configuration. The agreed rule gives each player a +15 maximum-health bonus; it is not a selectable evolution. The Match records the bonus once per player. Health totals, damage, and healing are implemented by the later health work, so this is not evidence of complete combat behavior. The source upgrade records remain research-only.

Run `python3 scripts/audit-inventory.py` to compare the seed rows with the research catalogue and inspect reverse unlocks. All 112 seed names map to a candidate, with Carrion to Scavenger still provisional. The comparison finds 44 reverse links represented in the candidate graph and three that need interpretation. The seed links Burrower to Hibernation and Ambush, but its own Ambush row calls that relationship a synergy rather than a hard prerequisite. The [community evolution table](https://everythingiscrab.wiki.gg/wiki/Evolution) lists Fur as Hibernation's prerequisite and no in-run prerequisite for Ambush. It does not independently establish the pinned version. The seed also links Plated to Overwhelm without a matching prerequisite in Overwhelm's row. The [1.1 developer notes](https://steamdb.info/patchnotes/23879270/) describe Pressure-based account unlocks for Hibernation, Burrower, Ambush, and Overwhelm; they do not establish those disputed in-run edges. Preserve these as unresolved rather than converting synergy or account unlocks into mandatory in-run requirements.

The inventory audit also compares a 103-name older fan listing with a 101-name partial search-index extract of the community table. The saved name snapshots include their source and retrieval date. The lists share 94 candidate identities after provisional mappings. The fan listing has nine candidate identities absent from the extract, and the extract has seven absent from the fan listing. These differences are leads for review, not evidence that an ability was added or removed: the community extract is incomplete, neither snapshot establishes its game version, and the fan's Body Slam detail identifies the starting Bop. The audit reports the exact candidate names and tentative mappings.

The indexed [Jaws card](https://everythingiscrab.wiki.gg/wiki/Jaws) and [Neoseeker trait table](https://www.neoseeker.com/everything-is-crab/Evolution_Traits) agree on several damage and feeding values, but disagree on the Epic rank-two upper damage multiplier: 1.6 versus 1.5. Neither indexed source establishes its game version. The Jaws research record selects the wiki value by user decision and preserves both observations. The gameplay effect remains unimplemented.

The version-scoped [Plated guide](https://everythingiscrab.org/evolutions/plated/) describes a Common passive that increases plating but does not publish a rank table. The indexed [wiki card](https://everythingiscrab.wiki.gg/wiki/Plated) reports Common rank one as +5 plating, while [Neoseeker](https://www.neoseeker.com/everything-is-crab/Evolution_Traits) reports +4. Their tables differ for every rank and rarity. The user selected the wiki when it conflicts with Neoseeker. The research record uses the wiki table and retains the Neoseeker table for comparison. Available dates do not establish which specific table is newer or which matches the pinned version. The gameplay effect remains unimplemented.

When the community wiki and Neoseeker disagree, use the wiki value by user decision. This preference does not establish either source’s historical version or make an unimplemented effect selectable.
