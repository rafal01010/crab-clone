# Presentation checkpoint evidence

YCCE-TEST-11 covers the production journey and presentation work from YCCE-069 through YCCE-075A. The test revision is `bfd1f8cfe6ab816fa43e393ea2fa930b134718e0` plus the presentation worktree changes. The checkpoint passed on 2026-11-18 with the user’s waiver of independent first-time-player observation.

## Reproduce the checks

Run `npm run build`, then `node --test tests/scenarios/checkpoint11-browser.test.js`. The tests use Chrome and the Playwright video encoder. Set `CHROME_PATH` for a Chrome installation outside the standard location. The host binds to loopback and each player uses a separate browser profile. The test-only fixture positions craft, stages combat and progression, and advances the match clock. The production client renders the resulting viewer-specific observations.

All four production Chrome scenarios passed together in a 95-second run. The evidence includes a [screenshot overview](../../test-results/checkpoint11/screenshots.png), a [journey recording](../../test-results/checkpoint11/journey.mp4), and the [full screenshot set and scenario logs](../../test-results/checkpoint11). The laptop and desktop viewports are 1366 × 768 and 1920 × 1080 CSS pixels. The runner uses Chrome 157 on an Apple M4 Mac mini with 32 GB of memory.

## Interface checklist

| Surface                       | Observed behavior                                                                                                                                                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Title and lobby               | The title wraps at laptop size. Keyboard focus is visible. Four players fill the room, and a fifth profile sees the disabled join button at desktop size.                                                                                                                                                    |
| Loading and connection        | A 503 for the local font returns every player to the lobby with an error. Restoring the font allows countdown and play. Blocking the socket shows the unavailable-host state. Stopping the host shows loss of connection.                                                                                    |
| Spectating and results        | An eliminated player can switch between two survivors. Simultaneous elimination produces a draw. The results show the final builds and return the room to the lobby.                                                                                                                                         |
| Guidance and build            | A fresh browser profile found the optional guide before readiness. During play, the build panel matched 54 displayed stat totals against the safe projection, with display rounding, and the hull bar matched projected maximum health. The craft remained in active play during inspection.                 |
| Offers                        | Common, rare, epic, and legendary use explicit labels and distinct badge treatments. Captures show ranks, branching, specialization skip, current and next effects, and the boundary warning. The deadline and warning stay visible while scrolling at 125% UI scale.                                        |
| Equipment and choice recovery | Replacing an occupied slot keeps the former ability learned and preserves the deadline. The UI shows a rejected stale revision, accepts a current selection, displays a queued decision, and advances after expiry. Skipping a specialization grants 10 currency.                                            |
| Site claims                   | Two clients race for one claim. The loser sees the reserved state. Disconnect releases the claim and the second racer can redeem it. The seeded route visits all 12 site types and shows all 13 reward classes. A purchase becomes unavailable after the wallet balance drops while the reservation is open. |
| Firmware and shelter          | The identified browser sees the effect, while the other browser sees unknown and receives no effect field. Consumption applies to its owner. The burrow shows forced exit, and boundary damage continues inside.                                                                                             |
| Local settings                | The settings journey exercises 125% UI scale, a separate 75% render scale, both quality presets, reduced motion, and optional numbers. Reload retains validated settings. Injected storage failures leave settings usable for the session.                                                                   |
| Rebinding                     | All nine rebound actions produced the expected outbound control in Chrome. The editor handles conflicts, swaps, cancellation, reset, held-input release, and focus loss. In-world site prompts show the rebound key.                                                                                         |

The journey exposed blank scale selections and an overlap between the settings button and the ability strip at 125%. The scale controls now match the string values of their options. The HUD reserves the button's space, wraps radar hints, and prioritizes meteor and boundary warnings above radar.

## Combat feedback

| Encounter                                        | Verified cue                                                                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Manual Basic strike and Spit against moving bots | The host reports contact and projectile damage. The target shows an impact cue and the attacker sees the outcome.                       |
| Swing into an empty lane                         | The cooldown starts and no attack success cue appears.                                                                                  |
| Plating absorption and break                     | Host results distinguish plating damage from hull damage. The HUD identifies absorption and break separately.                           |
| Hit during protection                            | The host records zero damage and the attacker sees Blocked.                                                                             |
| Repeated corrosion                               | Distinct authorized hull-damage ticks feed one local HUD cue.                                                                           |
| Lethal damage                                    | The bot is eliminated and the local attacker sees the outcome in low quality with reduced motion and with sound and damage numbers off. |

The combat replay stages the absorption, protection, corrosion, and lethal inputs through the production damage and status APIs. Manual contact and projectile hits and the miss use real browser controls.

## Audio and visibility

The browser recorded the four local cues for pickup, hit, confirmed upgrade, and danger. In the [audio recording](../../test-results/checkpoint11/match-cues.webm), Chrome started 33 tones and the probe observed up to two concurrent oscillators against the six-voice implementation cap. Muted play still showed the lethal hit. The master volume adjustment persisted. The shared match reached collapse, results, and a fresh starter build after returning to the lobby.

Headless Chrome kept the first page visible when a second tab opened. The test dispatched the page visibility transition and verified that the real audio context suspended, cues did not replay, and a fresh trusted keypress resumed audio. At night the same out-of-range peer remained hidden through both quality settings. A staged hit on that peer changed the host's hull value without producing a projected hit event or a hit sound in the attacker's browser.

## Assets and rendering

| Asset roles                  | Inspection                                                                                                                                                                                                                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hull and mounts              | The early build shows the basic jet. Learned structures and equipped weapons add separate silhouettes. The minimum and maximum craft radii observed in the production view are 0.20 and 1.50. A separate scenario verifies private mounts and unchanged collision geometry from stat-only upgrades.                   |
| Biomes and world landmarks   | The arena uses distinct grass, water, sand, and snow palettes and shapes. Obstacles use the server box extents. The site journey exercises the landmark states for available, reserved, and claimed rewards. The burrow uses an exit wedge and the firmware capsules preserve their public appearance across viewers. |
| Bots, resources, and hazards | Body shapes and windups distinguish bot roles. Tier diamonds, resource shapes, rarity marks, the healing cross, and simple danger rings supplement color. The captures include day and night combat, boundary warnings, and the final circle.                                                                         |

The [asset inventory and frame budgets](../../DESIGN.md) cover the original procedural geometry, glyphs, animation, and materials. Inter is bundled locally under the [SIL Open Font License](../../static/fonts/OFL.txt). The four audio cues are original Web Audio oscillators with short envelopes. The browser logs the complete request URL set and checks that each request shares the host origin.

| Sample frame              | Draw calls | Submitted triangles |
| ------------------------- | ---------: | ------------------: |
| Starter, low              |         25 |               1,678 |
| Crowded daytime rain, low |         78 |               2,118 |
| Crowded night, low        |         59 |               2,418 |
| Crowded night, balanced   |         59 |               2,754 |

The WebGL probe counts draw calls and submitted triangles for representative gameplay frames. Counts depend on the entities and effects visible in each sampled frame. YCCE-079A owns the frame-rate and capacity measurements on Intel HD 620-class hardware.

## Earlier scenarios

Production build, lint, typecheck, targeted formatting, and diff whitespace checks passed. The focused verification passed nine older scenarios covering weather, POI eligibility and claims, private firmware, burrow damage and expiry, module privacy and geometry, authoritative hit events, and ability retention. The module test now compares stat-only upgrades against the actual starter modules. The starter jet is intentional.

The broader run of 84 older scenarios also reported failures. Many reproduce at the committed base revision, and some randomized cases change between runs. The raw logs record both the [worktree run](../../test-results/checkpoint11/selected-older-scenarios.log) and [committed-base run](../../test-results/checkpoint11/older-scenarios-base.log). The worktree log predates the corrected starter-module assertion.

## First-time-player observation

The user waived the independent playtest on 2026-11-18. The automated walkthrough verified that a fresh profile could find the guide, enter the match, move, attack, inspect the build, and reach results. The build panel matched all 54 displayed stat totals against the server’s safe projection. No first-time-player comprehension findings were collected.
