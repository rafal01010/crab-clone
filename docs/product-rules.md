# Product rules

You Can Crab Everything is a four-player, free-for-all LAN hovercraft game. Its gameplay baseline is Everything is Crab version 1.2.1, adapted for multiplayer and the rules below. Version 1.3 and later source releases require an explicit scope change. The [reference bundle](../hovercraft_codex_reference_bundle/CODEX_CONVERSATION_HANDOFF.md) supplies research leads, not a complete verified catalogue.

## Match and controls

- Four humans play on desktop or laptop browsers with keyboard and mouse. The host may also play on the host laptop. The local Node host serves the game and assets without an internet connection during play.
- Players start as modest hovercraft with Standard's +15 maximum HP. There is no starting modifier offer or Splicing.
- WASD moves independently of mouse aim. Left and right mouse buttons attack, Space moves or dashes, Q uses the ultimate, and E interacts. Each player has an independent elevated three-quarter follow camera. Players can travel apart and leave one another’s view.
- PvP damage is possible immediately. Each player has one life, with no respawn or XP death penalty. Dead players enter restricted spectator mode.
- The last human alive wins after simultaneous damage is resolved. If no human survives that resolution, the match is a draw. There is no score victory.
- A disconnected craft remains vulnerable. Reconnection returns the player to that craft; death and deadlines still apply. There is no host migration or mid-match save recovery.
- Gameplay access is equal each match. Only local presentation and control preferences persist.

## Progression and world

- Preserve the broad applicable 1.2.1 upgrade graph and its supporting systems. Review omissions individually. Do not replace an unresolved ability with an invented generic bonus. The source catalogue and exact numerical effects still need reconciliation.
- Progression includes staged salvage, source-specific progress, levels, three randomized offers, ranks, rarities, prerequisites, exclusions, affinities, specializations, and scarce choice currency. Every twelfth level replaces the ordinary offer with a branch offer, without a boss reward.
- Learned and equipped upgrades are distinct. Equipment has two attacks, one movement action, and one ultimate. Automatic, passive, periodic, and reactive effects remain part of the game.
- Preserve distinct physical and ability stats, health, social and speed stats, damage, cooldowns, area, size, regeneration, plating, resistances, dodge, thermal and terrain adaptation, progress, salvage speed and reach, and senses.
- The map has grass, sand, snow, and water biomes with distinct terrain and resources. Day and night, visibility, regional weather, temperature buildup and recovery, and their bonuses affect play. Terrain and thermal adaptation remain separate.
- POIs are discoverable and globally usable once. Discovery and claiming are separate. Finite shelter supports entry and exit effects. Firmware modules have unknown positive and negative effects, per-run appearance mapping, scanning, and per-player knowledge. Viruses are harmful firmware effects.
- Bots persist into the final area. They have simplified behavior, timed tier escalation, biome roles, variants, elites, and useful rewards. Bot interactions support scavenging. Allies support charm, summons, commands, target priorities, ownership, caps, and lifecycle. Humans cannot be charmed.
- Carcinisation increases personal risk and resource rarity. Bots and humans can exploit the choosing player's vulnerability. Personal penalties replace source boss-enhancement thresholds.

## Choices and finale

The world continues during an upgrade choice. The choosing craft is stationary and invulnerable, cannot attack or salvage, and cannot deal offensive effects through owned entities. A short fixed window ends with a random displayed upgrade if no selection is made. Queued offers cannot provide continuous immunity.

There are no bosses. Shrinking territory replaces the final boss. Bots and meteors remain, and meteors land inside the playable area. Boundary pressure defeats shelter and choice protection. The current tuning candidates are shrink onset at 18 minutes, a tiny area at 25 minutes, and collapse by 28 minutes. These are untested project proposals, not source timings. The target is an approximately 20-minute whole match and a desired upper duration of 28 minutes; individual survival time is a separate measure.

## Architecture and presentation

One authoritative Match owns mutable world state, physics, clocks, random numbers, damage, rewards, and choices. Network adapters parse and queue player intents. A viewer-filtered observation drives the UI and world rendering. Clients may interpolate or predict local movement but do not decide outcomes. The stack is SvelteKit, Three.js, Rapier, Socket.IO, Node.js, and TypeScript.

The journey is title, lobby, loading, match, elimination and spectating when applicable, results, and return to lobby. Menu presentation follows [the design reference](../DESIGN.md). HUD and choice text need sufficient weight and black backing for readability. Rarity and warnings may use semantic colors with non-color labels.

Teams, teammate revival, extra starting modifiers, accounts, permanent power, online matchmaking, mobile, gamepad, challenges, Pressure progression, endless mode, host migration, and mid-match saves are deferred.

## Source evidence and open questions

| Evidence                                                                                                                                                           | Date and confidence                                                                                      | Scope                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Developer 1.2 patch notes](https://steamdb.info/patchnotes/24669494/)                                                                                             | 2026-08-13. High for the stated 1.2 changes.                                                             | Dated official changes, not a complete 1.2.1 data export.                        |
| [Evolution community table](https://everythingiscrab.wiki.gg/wiki/Evolution) and [Evolution Traits](https://www.neoseeker.com/everything-is-crab/Evolution_Traits) | Consulted in planning on 2026-11-12. Field-level confidence and version coverage require reconciliation. | Graph and numerical research leads. Neither was fully retrieved during planning. |
| [PC Gamer review](https://www.pcgamer.com/games/roguelike/everything-is-crab-review/)                                                                              | 2026-05-08. Secondary evidence for the release-era game, not proof of exact 1.2.1 timing.                | Reports recurring boss encounters at regular intervals.                          |
| [Boss guide](https://gemelog.jp/en/games/everything-is-crab/bosses/)                                                                                               | Updated 2026-05-12. Low confidence for timing.                                                           | Labels its own legacy spawn estimates and timer or level trigger as unchecked.   |
| [Local research CSV](../hovercraft_codex_reference_bundle/hovercraft_evolution_mapping.csv)                                                                        | Research snapshot around 2026-11-12. Unverified candidate union.                                         | Its 112 rows do not establish a count of distinct playable 1.2.1 abilities.      |

The exact final-boss trigger, timestamp, and clock accounting in version 1.2.1 remain unverified. The research above does not establish that the final boss appears at 18 minutes. Damage formulas, individual specialization effects, aliases, prerequisites, and the full versioned inventory also remain open until source reconciliation.

## Superseded reference suggestions

| Earlier suggestion                                                                  | Baseline decision                                                                             |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Score or timed-score victory, respawns, or teams.                                   | One-life FFA with last survivor or simultaneous-elimination draw.                             |
| Starting modifier choices, Splicing, or boss rewards for branches.                  | Standard only; branch offers occur every twelfth level.                                       |
| Pause the world, leave a chooser vulnerable, or allow indefinite choice protection. | The world continues under the bounded choice rules above.                                     |
| Optional finale event or no fixed match outcome.                                    | Shrinking territory and last-survivor resolution are required. The schedule remains untested. |
| Bosses, post-1.2.1 content, or a 112-row complete catalogue.                        | No bosses or later content. The CSV remains a research seed.                                  |
| Public use of source names or copied source assets.                                 | Source names are internal traceability only; use original hovercraft names and assets.        |
