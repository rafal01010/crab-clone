# Build You Can Crab Everything

Execute this plan to deliver a complete, playable, four-player LAN hovercraft game.
Preserve the applicable Everything is Crab upgrade graph and its supporting mechanics.
Use SvelteKit, Three.js, Rapier, Socket.IO, Node.js, and TypeScript.
The original plan has 216 tasks. Four later source-reconciliation tasks and one multi-room task use stable suffix IDs. Execute implementation batches and checkpoints under Appendix I.
Suffix tasks are separate work units. Individual dependency IDs name exact tasks. Task ranges include suffix tasks within the range.
The first playable milestone is YCCE-032. The complete delivery target is YCCE-084.
This document authorizes no implementation by itself.

## How to read this

One box is one unit of work. Each task names the evidence required before completion. Check a box only when its evidence exists and the user has reviewed the task. Keep stable IDs when revising descriptions. Add an ID with a suffix if a task must split. Never renumber completed tasks.

Use the local, sequential adaptation of `poteto-mode/playbooks/multi-phase-plan.md` described here. Implement a requested task under `playbooks/feature.md`, or its narrower applicable playbook. The user requests and reviews each task separately. Finish its verification, report its evidence, and stop. Do not start the next task automatically. No autopilot, PR, push, merge, deployment, or background audit loop is part of this plan.

Dependencies name direct technical prerequisites. Document execution order adds a review dependency on every preceding task. A later task cannot silently excuse unfinished acceptance conditions in an earlier task. Research and experiment tasks produce decisions and evidence. They do not require artificial unit tests.

All component paths below are proposed. The repository currently contains reference documents, not an application. Establish the actual layout in YCCE-004. Update affected component pointers if the layout changes without changing task identity or scope.

### Find the next task

| Phase | Delivery checkpoint |
|---|---|
| 0 | Versioned rules, a reconciled catalogue, and measurable experiments. |
| 1 | One authoritative host, browser client, and repeatable verification. |
| 2 | Proven movement, networking, selection timing, and UI direction. |
| 3 | Real starter upgrades and an earned four-player match from lobby to rematch. |
| 4 | Complete environmental, exploration, firmware, shelter, and ally systems. |
| 5 | Complete progression rules and individual acceptance of every applicable upgrade. |
| 6 | Finished original assets, feedback, interfaces, guidance, and settings. |
| 7 | Reliable, measured, complete, offline production delivery. |

A suffix such as YCCE-020A is its own separately requested task. The early starter catalogue introduces eight real abilities. Their later individual completion tasks reuse those handlers and close full-graph, world, and presentation obligations. They do not implement competing copies.

### Apply the completion rule to every task

Tests alone are not sufficient verification. A local task is complete only when its applicable automated checks, direct observation, and performance assessment have evidence.

For a document task, direct observation means reading its actual records and checking its references. For simulation work, run its deterministic scenario against the actual Match. For an interaction, drive the browser and inspect the authoritative result. Compiler success alone cannot establish gameplay correctness. An unavailable check remains blocked or inconclusive.

Record the following in a task receipt, using proposed `docs/evidence/YCCE-NNN/receipt.md` after implementation begins.

- Record the base revision, reviewed revision or diff, commands, environment, seed, expected result, actual result, and artifact paths.
- Attach screenshots for visible changes. Attach a short video when motion, timing, physics, or interaction needs it.
- Run relevant automated checks and the task's direct scenario. Recheck existing behavior that the change can affect.
- Assess performance. Measure runtime changes using the workload and budgets from YCCE-003. For a document or static data change with no runtime effect, record that reason.
- For a new feature, record that the previous revision lacks it. Use an absolute budget instead of a speed ratio between different workloads.
- List unresolved findings, deliberate source deviations, and any changed assumptions. A task cannot pass with a broken required behavior.
- Present the result in chat and stop for the user's review. Record review acceptance before checking the task's completion box.

Keep the execution decision trail under the show-me-your-work skill once implementation starts. During this planning turn, keep the trail inside Appendix E because the user requested one document only.

### Apply the content completion rule

Use the best available evidence when exact, version-specific sources are unavailable. Look beyond exact source records for useful references, including related mechanics, gameplay observations, community reports, and comparable behavior, to inform a practical approximation or estimate. Use judgment to choose and implement the best estimate rather than blocking on exact confirmation. Record the references, assumptions, and confidence, distinguish estimates from confirmed source behavior, and revise them when stronger evidence or playtesting warrants it.

Every enabled upgrade needs a canonical source record, source confidence, eligibility rules, complete rank and rarity behavior, specialization behavior, an actual server effect, a client representation, and an observable verification scenario. A displayed name, generic bonus, or stub does not count.

Each content-family task includes every verified member and specialization assigned to that family by YCCE-002. Names in the task descriptions are the current research candidates. They are not a claim that every name is a distinct current ability. If reconciliation retires a named identity, record its canonical replacement or individual reviewed omission instead of inventing content for its task. Preserve source names internally for traceability. Use original hovercraft names, descriptions, models, icons, and audio in the product.

YCCE-002 must assign newly discovered applicable content to an individual task before implementation reaches it. If a discovery requires another subsystem, insert an explicit task with a stable suffix before that family. Do not hide missing content inside the closing audit. An omission needs an individual reason and user review. Difficulty alone is not an automatic permission to cut an upgrade.

## Program checklist

### Arm the program

- [ ] Obtain the user's request for a specific task before implementing it.
- [ ] Read this plan, `DESIGN.md`, the task's source records, and previous relevant receipts.
- [ ] Inspect local changes before editing. Preserve unrelated work.
- [ ] Name the task's data shapes, authoritative owner, observable result, and verification method before implementation.
- [ ] Stop after reporting that task. Leave later tasks untouched.

### Assign one local owner

Use one implementation owner at a time. The user reviews each completed task. Read-only helpers may investigate or review when requested or required by an invoked skill. They do not authorize parallel implementation or shared-file edits.

Throughput checkpoint for this workflow follows.

- [ ] Blocking first steps. Settle the source baseline, catalogue reconciliation, and empirical budgets before dependent production work.
- [ ] Independent workstreams. None execute concurrently. Component boundaries still keep each task small enough to review.
- [ ] Shared mutable state. One Match owns physics, clocks, RNG, entities, rewards, and choices. Network callbacks enqueue commands.
- [ ] Smallest safe decomposition. One owner and one requested task preserve local review boundaries. Split a task if its evidence cannot be reviewed as one result.

### Keep local change mechanics

- [ ] Use one working checkout. Do not create PRs or branches merely to satisfy the original playbook template.
- [ ] Run the established formatter, type checks, relevant tests, and production build when applicable.
- [ ] Review the actual diff and remove dead paths, placeholder behavior, and unexplained workarounds.
- [ ] Save evidence with the task ID. Keep private diagnostics outside player-visible payloads.
- [ ] Update the requirement and catalogue coverage records when the task changes them.

### Review and complete each task

- [ ] Report changes, acceptance results, evidence, source deviations, and limitations.
- [ ] Give the user the screenshots or video needed to review an interaction.
- [ ] Fix task findings before completion. Re-run checks affected by the fix.
- [ ] Record the user's review outcome. Do not infer acceptance from silence.

### Boot the real application for verification

Before YCCE-008, verify the produced document or command directly. After YCCE-008, boot the Node host. After YCCE-009, drive the browser. Establish repeatable commands in YCCE-004 and YCCE-010 rather than inventing results here.

For multiplayer checks, use separate browser contexts with distinct player identities. Use actual separate LAN devices for production delivery, latency, and capacity acceptance. Four tabs on one machine are useful diagnostics but do not prove four-device LAN delivery. Include the host laptop's playing browser in capacity checks.

## Phase 0. Reconcile the source and define measurable experiments

### YCCE-001. Freeze the product rules and source baseline

- [ ] Complete YCCE-001 and record user review.

**Depends on.** None.

**Components.** Proposed `docs/product-rules.md`, `docs/source-evidence.md`, and `docs/decisions.tsv`.

**Work.** Transcribe the agreed rules in Appendix D. Pin source gameplay to version 1.2.1. Separate verified source behavior, agreed adaptations, and untested tuning. Resolve stale bundle suggestions through the latest session decisions. Research boss triggering and final-boss timing without claiming the proposed shrink schedule is sourced.

**Observable outcome.** An implementer can identify the rule and evidence behind each required behavior.

**Acceptance conditions.** Standard alone, one life, four-player FFA, persistent bots, no bosses, and the broad applicable upgrade graph are explicit. No score mode, respawn, Splicing, or 1.3 content enters the baseline.

**Verification steps.** Compare the rule document with this plan, the handoff, and dated references. Record unresolved formulas without invented precision.

**Evidence required.** A source table with dates and confidence, a contradiction disposition list, and a reviewed rules diff.

### YCCE-002. Reconcile a complete versioned upgrade catalogue

- [ ] Complete YCCE-002 and record user review.

**Depends on.** YCCE-001.

**Components.** Proposed `docs/content/source-catalogue.*`, `docs/content/coverage.*`, and source-to-hovercraft crosswalk.

**Work.** Reconcile the community Evolution table, Neoseeker trait tables, official patch changes, all bundle relationship fields, and individual-card evidence. Search beyond the 112 CSV rows. Separate playable abilities, specializations, hidden starting actions, aliases, retired records, and genuinely inapplicable content. Investigate Turtle Down versus Hide and Bop versus Body Slam. Check missing Spit and Synapse prerequisites. Assign each applicable ability and specialization to YCCE-052 through YCCE-067, or an explicit inserted task.

**Observable outcome.** A versioned, auditable catalogue replaces the CSV as the implementation authority.

**Acceptance conditions.** Every CSV candidate has a disposition. Newly found entries have owners. Rank, rarity, pool, prerequisites, exclusions, affinity, trigger, numerical tables, and specializations have evidence or a named unresolved question. An advertised count is not the completeness test. Do not remove finale-gated abilities merely because an old CSV calls them endless passives.

**Verification steps.** Compare independent inventories by canonical identity. Inspect missing and conflicting rows. Audit all-of and any-of edges, reverse unlock links, reachability, aliases, and source version changes.

**Evidence required.** Catalogue diff, inventory comparison, per-entry provenance, unresolved-field report, and a content-to-task assignment with no unowned applicable entry.

### YCCE-003. Define experiment procedures and delivery budgets

- [ ] Complete YCCE-003 and record user review.

**Depends on.** YCCE-001, YCCE-002.

**Components.** Proposed `docs/experiments.md`, `docs/performance-budgets.md`, and workload definitions.

**Work.** Define procedures for movement, network response, selection abuse, UI readability, host capacity, pacing, and build viability. Record the target host and client hardware, browser versions, LAN setup, entity populations, and measurement method. Use Appendix A's proposed values as initial candidates.

**Observable outcome.** Later tasks have explicit pass and failure conditions before collecting results.

**Acceptance conditions.** No estimate is described as measured. Set numerical frame, tick, input, deadline, and loading budgets on recorded hardware. Keep match duration and individual survival time as separate measurements. Define how failed experiments lead to parameter changes or a reviewed design revision.

**Verification steps.** Walk each experiment through its setup, independent variables, repetitions, observations, and decision rule. Confirm its owning task exists.

**Evidence required.** Reviewed experiment matrix and budget table. No fabricated prototype screenshots or benchmark results.

## Phase 1. Establish the authoritative application foundation

### YCCE-004. Create the repository structure and local commands

- [ ] Complete YCCE-004 and record user review.

**Depends on.** YCCE-003.

**Components.** Proposed package manifest, lockfile, SvelteKit configuration, TypeScript configuration, `server/`, `shared/`, `src/lib/`, and `tests/`.

**Work.** Create the selected stack with pinned dependencies and a supported Node runtime. Establish install, development, production build, production start, format, lint, typecheck, and test commands. Keep server modules out of browser imports.

**Observable outcome.** A clean checkout builds and starts a local application with documented commands.

**Acceptance conditions.** Dependency versions and runtime requirements are reproducible. No game feature or substitute framework is introduced. Source documents remain intact.

**Verification steps.** Install from the lockfile, run checks, build, start, and inspect the page and server output.

**Evidence required.** Exact successful commands, runtime versions, browser screenshot, and reviewed file tree.

### YCCE-005. Encode Match ownership and lifecycle states

- [ ] Complete YCCE-005 and record user review.

**Depends on.** YCCE-004.

**Components.** `server/match/`, server identity types, and shared public state types.

**Work.** Model Lobby, Running, Finished, and Aborted phases. Separate connection state from Alive or Eliminated life state. Give living players Playing, Selecting, or AwaitingChoiceWindow activity. Establish Match create, accept, advance, and viewer-specific view operations. Keep mutable tables, Rapier, clocks, and RNG private.

**Observable outcome.** A deterministic scenario transitions through a match lifecycle through the public Match operations.

**Acceptance conditions.** Eliminated players cannot also select or act. Socket code cannot mutate match entities. No general ECS framework or full rule scripting language is required.

**Verification steps.** Run valid and rejected phase transitions, including disconnect while alive and after elimination.

**Evidence required.** State transition results, ownership map, and the reviewed public contracts.

### YCCE-006. Build the canonical content registry and release gate

- [ ] Complete YCCE-006 and record user review.

**Depends on.** YCCE-002, YCCE-005.

**Components.** `server/content/`, safe public content projections, and catalogue validation.

**Work.** Encode canonical identity, rank and rarity tables, requirements, exclusions, pools, affinities, effect bindings, and specialization links. Derive eligibility indexes and player-facing descriptions from the same definitions. Track implemented, blocked, and omitted dispositions separately from selectable release content.

**Observable outcome.** A small verified catalogue loads. Invalid or unfinished selectable records fail validation.

**Acceptance conditions.** Unknown references, impossible ranks, missing handlers, and conflicting aliases fail clearly. Private tables and per-match secrets do not enter browser bundles. A prototype subset cannot be labeled the complete release catalogue.

**Verification steps.** Load valid records and deliberately invalid fixtures. Inspect the safe public projection.

**Evidence required.** Validation output, rejected fixture results, and a catalogue coverage report.

### YCCE-007. Define validated intents and filtered observations

- [ ] Complete YCCE-007 and record user review.

**Depends on.** YCCE-005, YCCE-006.

**Components.** `shared/protocol/`, `server/network/`, and `server/match/view.*`.

**Work.** Define control, choice, equipment, interaction, ready, and resume messages. Include identity, match identity, sequence, offer identity, and revision where needed. Define acknowledgments and timestamped observations. Apply per-viewer filtering to snapshots and events.

**Observable outcome.** Valid intents enter a queue. Invalid or unauthorized commands receive bounded rejection. Hidden fixture entities never appear in unauthorized packets.

**Acceptance conditions.** Clients cannot submit authoritative positions, damage, rewards, or claimed hidden effects. Secret RNG state, firmware mappings, hidden targets, and private content are absent from public payloads.

**Verification steps.** Submit malformed, duplicate, stale, oversized, and out-of-phase messages. Inspect serialized observations and event references.

**Evidence required.** Protocol scenario results and negative packet assertions.

### YCCE-008. Serve the production application and simulation from one host

- [ ] Complete YCCE-008 and record user review.

**Depends on.** YCCE-004, YCCE-005, YCCE-007.

**Components.** `server/index.*`, HTTP integration, Socket.IO setup, Rapier initialization, and shutdown handling.

**Work.** Run the production SvelteKit handler and realtime endpoint on one LAN-reachable Node server. Initialize server physics without a renderer. Load WASM locally. Print usable LAN addresses and the port. Fail clearly on occupied ports and startup errors.

**Observable outcome.** Another device opens the host's production URL and connects while the host has no GPU dependency for simulation.

**Acceptance conditions.** No hard-coded client localhost endpoint, runtime CDN, or development server dependency remains in production boot.

**Verification steps.** Start the built host, visit it from a second device, inspect requests, and stop the process cleanly.

**Evidence required.** Production boot log, remote connection screenshot, local asset request log, and shutdown result.

### YCCE-009. Connect Svelte and Three.js to one client session

- [ ] Complete YCCE-009 and record user review.

**Depends on.** YCCE-007, YCCE-008.

**Components.** `src/lib/game-client/`, `src/lib/net/`, session store, and canvas lifecycle.

**Work.** Consume one observation stream for UI and world rendering. Render timestamped entities with bounded interpolation. Handle appearance, disappearance, match replacement, viewport resize, and canvas teardown.

**Observable outcome.** The browser renders the authoritative fixture world and shows the same match state in Svelte.

**Acceptance conditions.** Hidden or removed entities also lose their labels, sounds, and interpolation history. A reconnect can replace client state atomically.

**Verification steps.** Add, move, conceal, and remove fixture entities. Resize and remount the view. Compare UI state with the server observation.

**Evidence required.** Browser recording, state comparison, and resource teardown observations.

### YCCE-010. Establish repeatable scenarios and task evidence commands

- [ ] Complete YCCE-010 and record user review.

**Depends on.** YCCE-005 through YCCE-009.

**Components.** `tests/scenarios/`, browser automation, development-only diagnostics, and evidence recipes.

**Work.** Add deterministic seeded Match fixtures and browser journeys for lobby, combat, choices, privacy, and results as those behaviors become available. Establish event capture and metrics needed by later experiments. Keep fixture controls unavailable in the production player interface.

**Observable outcome.** One command repeats a known scenario and produces a readable pass or failure report.

**Acceptance conditions.** Fixtures drive real Match operations. Browser checks drive actual controls. Debug grants cannot be called by a production client.

**Verification steps.** Repeat a seeded scenario, inject a deliberate failing predicate, and inspect the generated evidence.

**Evidence required.** Reproduction commands, deterministic outputs, failure demonstration, and evidence directory convention.

## Phase 2. Resolve handling and interaction uncertainty

### YCCE-011. Compare and choose stable hovercraft physics

- [ ] Complete YCCE-011 and record user review.

**Depends on.** YCCE-009, YCCE-010.

**Components.** `server/match/physics/`, handling parameters, and collision-course fixture.

**Work.** Compare constrained dynamic hover movement with spring-supported hover movement using the same obstacle course. Include acceleration, stopping, diagonal motion, walls, other craft, knockback, and size changes. Retain the simplest stable choice that meets the experiment criteria. Gameplay movement and collision remain on the X/Z plane; hover and height are visual presentation.

**Observable outcome.** A craft traverses the course predictably without jitter, tunneling, or uncontrolled rotation.

**Acceptance conditions.** Rapier remains authoritative. Movement is frame-rate independent. Collision layers and stable entity references are defined. Do not claim a movement model was selected before comparing it.

**Verification steps.** Run the course at several render frame rates and repeat seeded collisions. Record physics and response measurements.

**Evidence required.** Comparison videos, parameter sets, measured failures, and selection rationale.

### YCCE-012. Establish the elevated camera and independent aiming

- [ ] Complete YCCE-012 and record user review.

**Depends on.** YCCE-011.

**Components.** Client camera, aim projection, cursor, and scene occlusion treatment.

**Work.** Implement an elevated three-quarter follow camera. Project mouse aim onto the playable world independently of movement and camera rotation. Handle viewport changes, foreground obstacles, and differently sized craft.

**Observable outcome.** A player circles a target while aiming continuously at it.

**Acceptance conditions.** Camera framing keeps nearby hazards readable. Aim does not jump when a model or effect crosses the cursor. Camera movement does not alter the server's visibility rules.

**Verification steps.** Drive the same aim course at 1366 by 768 and 1920 by 1080. Inspect target alignment and wall occlusion.

**Evidence required.** Aim-course recordings and viewport screenshots.

### YCCE-013. Implement keyboard and mouse input lifecycle

- [ ] Complete YCCE-013 and record user review.

**Depends on.** YCCE-007, YCCE-012.

**Components.** Input mapping, focus handling, client control intents, and server input expiry.

**Work.** Map WASD movement, left and right mouse attacks, Space movement ability, Q ultimate, and E interaction. Clear held controls on blur, disconnect, elimination, and UI capture. Prevent browser actions from consuming game controls. Expire stale server input.

**Observable outcome.** Controls remain predictable when switching tabs, opening a choice, or losing the connection.

**Acceptance conditions.** No stuck movement or firing. Text entry cannot steer the craft. Input sends bounded normalized directions, not trusted world positions.

**Verification steps.** Hold controls through blur, menu opening, socket loss, and return. Check diagonal input and secondary-click behavior.

**Evidence required.** Browser interaction recording and authoritative input-expiry log.

### YCCE-014. Choose interpolation and local prediction behavior

- [ ] Complete YCCE-014 and record user review.

**Depends on.** YCCE-010 through YCCE-013.

**Components.** Snapshot buffering, optional local prediction, reconciliation, and network probes.

**Work.** Compare interpolation alone with local prediction under the delay, jitter, and loss profiles from YCCE-003. Reconcile only against server state. Keep the chosen approach and remove the rejected prototype.

**Observable outcome.** Movement responds within the recorded budget without persistent divergence or remote craft jitter.

**Acceptance conditions.** Prediction never decides hits, damage, rewards, or visibility. Death and concealment override interpolation. Time references remain consistent across clients.

**Verification steps.** Repeat the same route under each profile. Measure input response, correction size, snapshot age, and stale-input duration.

**Evidence required.** Comparative traces, videos, chosen limits, and unresolved network limitations.

### YCCE-015. Prove bounded protected choice behavior

- [ ] Complete YCCE-015 and record user review.

**Depends on.** YCCE-005, YCCE-010, YCCE-013.

**Components.** Selection state prototype, authoritative deadlines, and queued reward fixture.

**Work.** Exercise the proposed ten-second window with rapid XP, multiple pending offers, rerolls, specialization prompts, disconnects, and a closing boundary. Keep a fixed deadline. Give follow-up prompts remaining time only when displayed. Queue unseen prompts until a later window with a defined exposed interval.

**Observable outcome.** A stationary craft receives a choice without pausing other players or gaining continuous immunity.

**Acceptance conditions.** Boundary harm bypasses protection. Passive XP continues. Movement, salvage, attacks, reactive offense, existing offensive fields, and owned allies cannot deal harm or control during protection. Expiration randomly selects only from the displayed offer. Define auto-resolution for every other displayed prompt type explicitly.

**Verification steps.** Run the abuse scenarios and compare several exposed-interval values. Check stale choices and deadline preservation through reconnect.

**Evidence required.** State traces, browser prototype recording, and reviewed timing and queue rules.

### YCCE-016. Prove readable menus and upgrade choices

- [ ] Complete YCCE-016 and record user review.

**Depends on.** YCCE-006, YCCE-009, YCCE-015.

**Components.** UI tokens, local font trial, title composition, choice layout, and HUD prototype.

**Work.** Compare two choice compositions using long real upgrade text. Apply `DESIGN.md` to menus. Test three whitespace-separated offers, keyboard shortcuts, costs, deadline, live minimap, and boundary warning. Compare HUD contrast treatments over bright, dark, and crowded scenes.

**Observable outcome.** Players can understand and choose an upgrade within the proposed window on a laptop screen.

**Acceptance conditions.** Use black, white, restrained gray, one filled violet primary action, and amber warnings. Use local Inter unless licensed PPNeueMontreal files exist. Normalize teal to `#15846e`. Record the gameplay text-weight and contrast exceptions. No filled card dashboard replaces the agreed style.

**Verification steps.** Review 1366 by 768 and 1920 by 1080 screenshots and timed choice attempts. Test reduced motion.

**Evidence required.** Competing layouts, screenshots, readability observations, and selected UI treatment.

## Phase 3. Deliver the first complete match loop with a verified subset

### YCCE-017. Build the four-player lobby and identity flow

- [ ] Complete YCCE-017 and record user review.

**Depends on.** YCCE-008, YCCE-013, YCCE-016.

**Components.** Lobby state, player identity and resume tokens, title and lobby views.

**Work.** Let clients join the printed LAN address, choose bounded display names, occupy four slots, and ready. Show host and connection status. Start only when four players are ready. Reserve identities for reconnects. Reject a fifth active participant and new entrants during a running match.

**Observable outcome.** Four distinct clients join one lobby with Standard displayed for everyone.

**Acceptance conditions.** No starting-modifier selector or Splicing flow. The browser does not claim to start a Node host process. Names render as text. A duplicate connection cannot control two craft or steal another identity.

**Verification steps.** Join, ready, unready, leave, reconnect, and attempt a fifth join.

**Evidence required.** Four-client lobby capture and identity edge-case results.

### YCCE-017A. Host multiple isolated rooms

- [ ] Complete YCCE-017A and record user review.

**Depends on.** YCCE-008, YCCE-017.

**Components.** Host room registry, match routing, room creation and selection, room-scoped sessions, and host configuration.

**Work.** Let one LAN host create and run multiple rooms concurrently. Each room owns an independent Match and its own four-player lobby. Route joins, reconnect tokens, intents, observations, loading, results, and cleanup to the correct room. Add a configurable positive room limit, with two rooms as the initial unmeasured default. Reject room creation clearly when the limit is reached and allow a new room after an ended room is cleaned up. Show available rooms and their occupancy to clients on the LAN.

**Observable outcome.** More than four people can play on the same host by joining separate rooms, with at most four players in each match.

**Acceptance conditions.** A player or reconnect token belongs to one room and cannot access another room's match or private data. A full or running room does not prevent joining another eligible room. One room's start, stop, failure, or cleanup does not change another room's state. The configured limit is enforced without advertising unmeasured hardware capacity. No online matchmaking or account service is required.

**Verification steps.** Run two simultaneous rooms with distinct clients. Exercise the four-player limit per room, cross-room intent and reconnect rejection, room-limit rejection, and room cleanup followed by creation. Verify that starting or aborting one match leaves the other unchanged.

**Evidence required.** Room lifecycle and isolation results, configuration and limit checks, and an observed two-room browser journey. Capacity on the target host remains subject to the later hardware acceptance work.

### YCCE-018. Coordinate asset loading and match start

- [ ] Complete YCCE-018 and record user review.

**Depends on.** YCCE-017A.

**Components.** Loading state, local asset manifest, readiness acknowledgments, and countdown.

**Work.** Preload required assets on every client before the server starts the match clock. Show progress, useful failures, and retry. Handle disconnect during loading and a client that never becomes ready.

**Observable outcome.** All four players enter the same match from a synchronized countdown.

**Acceptance conditions.** No participant takes damage before loading completes. Loading readiness remains separate from player life state. A failure returns to a recoverable lobby state instead of hanging indefinitely.

**Verification steps.** Delay one client, fail an asset, disconnect during loading, and retry successfully.

**Evidence required.** Countdown recording, shared start timestamps, and failure-recovery capture.

### YCCE-019. Create the initial arena and fair spawn placement

- [ ] Complete YCCE-019 and record user review.

**Depends on.** YCCE-011, YCCE-018.

**Components.** Seeded initial map, collision geometry, spawn selection, and match reset.

**Work.** Create a small valid arena with obstacles and four separated grass-region starts. Provide escape routes and nearby resources. Recreate the same layout from the same public terrain seed while keeping secret gameplay randomness separate.

**Observable outcome.** Four modest craft spawn in traversable positions and can encounter each other.

**Acceptance conditions.** No overlap, trapped start, immediate environmental death, or shared secret seed. PvP is enabled immediately. Spawn separation does not create an invulnerability period.

**Verification steps.** Inspect repeated seeds and drive every spawn's exits. Compare client geometry with server collisions.

**Evidence required.** Spawn map, route recordings, and seeded placement checks.

### YCCE-020. Compute canonical derived stats

- [ ] Complete YCCE-020 and record user review.

**Depends on.** YCCE-006, YCCE-019.

**Components.** Stat definitions, modifier tables, and diagnostic stat projection.

**Work.** Implement the complete source stat vocabulary, base values, modifier composition, caps, and deterministic recomputation. Keep source units distinct while using hovercraft labels.

**Observable outcome.** Changing a build produces the exact expected derived stats.

**Acceptance conditions.** Equivalent builds agree regardless of acquisition order. Terrain, thermal, sensing, physical, and ability stats remain distinct.

**Verification steps.** Compare controlled builds and recompute repeatedly with additions and removals.

**Evidence required.** Source-to-stat mapping, formula comparisons, and recomputation results.

### YCCE-020A. Implement hull, plating, level growth, and regeneration

- [ ] Complete YCCE-020A and record user review.

**Depends on.** YCCE-020.

**Components.** Hull and plating state, repair events, and regeneration.

**Work.** Apply Standard +15 maximum HP, reconciled level growth, plating absorption and refill, regeneration, and maximum-HP change policy. Distinguish attempted healing, actual healing, and full-health repair consumption.

**Observable outcome.** Hits deplete plating and hull correctly and valid repair restores the intended amount.

**Acceptance conditions.** One level refills plating exactly once. Stat changes cannot accidentally heal or revive.

**Verification steps.** Damage and repair at full, partial, and zero hull. Cross several levels in one update.

**Evidence required.** Health and plating ledgers and boundary-value scenarios.

### YCCE-020B. Implement typed damage eligibility and mitigation

- [ ] Complete YCCE-020B and record user review.

**Depends on.** YCCE-020, YCCE-020A.

**Components.** Damage channels, dodge, resistance, vulnerability, and bypass rules.

**Work.** Implement the authoritative damage order for direct, contact, corrosion, self, environmental, and boundary harm. Define eligible dodge and source-specific plating bypass.

**Observable outcome.** A controlled attack produces the documented mitigated result.

**Acceptance conditions.** Damage channels remain distinct. Boundary harm defeats protection and final-collapse defenses.

**Verification steps.** Run each channel against plating, dodge, resistance, vulnerability, and immunity combinations.

**Evidence required.** Damage-order matrix and numerical comparison results.

### YCCE-020C. Implement status stacking and timed recovery

- [ ] Complete YCCE-020C and record user review.

**Depends on.** YCCE-020B.

**Components.** Status instances, tick cadence, refresh and stacking policies, and status projection.

**Work.** Implement poison or corrosion, slow, stun, heat, and cold effect machinery. Define duration, refresh, stacking, immunity, cleanup, and effect ownership. Weather exposure is added in YCCE-038A.

**Observable outcome.** A status applies, ticks, refreshes, expires, and leaves correct stats.

**Acceptance conditions.** Repeated application never duplicates a removed modifier or creates negative cooldowns.

**Verification steps.** Apply and remove overlapping statuses, eliminate the target, and clear the match.

**Evidence required.** Status timelines and stacking and cleanup checks.

### YCCE-021. Implement manual attacks, windup, and recovery

- [ ] Complete YCCE-021 and record user review.

**Depends on.** YCCE-013, YCCE-020B, YCCE-020C.

**Components.** Manual action dispatch, hit queries, windup, recovery, and cooldown.

**Work.** Implement verified baseline manual attacks with source movement penalties and damage queries. Connect authoritative controls to actual hit and cooldown events.

**Observable outcome.** Two players can aim and exchange valid baseline attacks.

**Acceptance conditions.** The client cannot claim a hit. One action follows its source timing and hit limit.

**Verification steps.** Fight moving and stationary targets at range boundaries. Hold and release inputs during recovery.

**Evidence required.** Combat video and authoritative action and damage trace.

### YCCE-021A. Implement projectiles, contact hits, and physical impulses

- [ ] Complete YCCE-021A and record user review.

**Depends on.** YCCE-011, YCCE-021.

**Components.** Projectile motion, collision queries, contact deduplication, and knockback.

**Work.** Implement projectile lifetimes, hit filtering, collision layers, duplicate-contact limits, and bounded impulses. Include wall blocking and self-contact exclusions.

**Observable outcome.** Projectiles and physical attacks collide with the same world players see.

**Acceptance conditions.** Repeated physics events cannot multiply a single intended hit.

**Verification steps.** Fire through obstacles, collide repeatedly, and strike moving targets at different frame rates.

**Evidence required.** Collision recordings, hit counts, and projectile lifetime checks.

### YCCE-021B. Attribute damage and batch simultaneous deaths

- [ ] Complete YCCE-021B and record user review.

**Depends on.** YCCE-021, YCCE-021A.

**Components.** Causal ownership, reflected and delayed hits, damage batches, and death events.

**Work.** Retain owner credit across projectiles, allies, statuses, reflections, and delay. Bound reaction recursion. Resolve a complete damage batch before emitting final survivor candidates.

**Observable outcome.** Simultaneous lethal hits produce consistent credited death events.

**Acceptance conditions.** No early winner from iteration order and no infinite reactive loop.

**Verification steps.** Run simultaneous hits, reflected chains, ownership changes, and delayed lethal events.

**Evidence required.** Causal event ledger, batch-order checks, and reaction-limit proof.

### YCCE-022. Implement learned abilities and equipped slots

- [ ] Complete YCCE-022 and record user review.

**Depends on.** YCCE-006, YCCE-021.

**Components.** Learned ability state, equipment state, action dispatch, and initial slot UI.

**Work.** Support two attack slots, one movement slot, and one ultimate slot. Keep passive and learned-but-unequipped benefits separate. Bind only manual abilities to controls. Define equipment changes during allowed selection interactions, including slot replacement and cooldown carryover.

**Observable outcome.** A player equips an acquired action and uses the matching control.

**Acceptance conditions.** Unequipping cannot reset cooldowns or erase retained passive benefits. Automatic follow-up effects do not consume manual slots. Empty slots and replacement cancellation have defined behavior.

**Verification steps.** Learn, equip, replace, and unequip test abilities. Repeat while cooling down and during elimination.

**Evidence required.** Equipment state assertions and browser slot demonstration.

### YCCE-023. Add baseline bots and combat rewards

- [ ] Complete YCCE-023 and record user review.

**Depends on.** YCCE-019 through YCCE-022.

**Components.** Bot entities, basic wander and chase states, attacks, tiers, and death rewards.

**Work.** Add readable bot silhouettes, attack tells, target selection, and simple combat. Define initial HP, damage, speed, aggro, reward, and spawn parameters. Keep bot-bot hostility representable for scavenging provenance.

**Observable outcome.** Players can avoid, fight, and defeat a bot for wreckage.

**Acceptance conditions.** Bots use authoritative combat. They cannot attack through walls or repeatedly spawn on players. Reward creation occurs once per death.

**Verification steps.** Observe bot movement, aggro, attacks, death, and reward attribution with two competing players.

**Evidence required.** Bot encounter recording and reward-count assertions.

### YCCE-024. Implement staged and parallel salvage processing

- [ ] Complete YCCE-024 and record user review.

**Depends on.** YCCE-020, YCCE-023.

**Components.** Resource stages, range, speed, progress events, and processing timers.

**Work.** Implement four stages with the first immediate and final double. Process several nearby resources in parallel. Apply source-informed totals, feeding speed, and range.

**Observable outcome.** A player sees partial collection and can interrupt and resume it.

**Acceptance conditions.** The four stages conserve the resource total. Collection remains distinct from instantaneous XP.

**Verification steps.** Compare speed and range values and interruption at each stage.

**Evidence required.** Collection timelines and total-progress assertions.

### YCCE-024A. Resolve contested salvage and preserve source provenance

- [ ] Complete YCCE-024A and record user review.

**Depends on.** YCCE-024, YCCE-021B.

**Components.** Atomic stage claims, source tags, kill ownership, rarity, and expiration.

**Work.** Consume each global resource stage once under competing collectors. Preserve vegetation, meat, aquatic, own kill, ally kill, and third-party provenance. Add bounded density and expiration.

**Observable outcome.** Two players contest wreckage without duplicating progress.

**Acceptance conditions.** All diet and scavenger distinctions survive partial collection.

**Verification steps.** Race collectors and compare resources from every killer and source category.

**Evidence required.** Conservation ledger, race results, and provenance matrix.

### YCCE-024B. Implement repair resources and full-health consumption

- [ ] Complete YCCE-024B and record user review.

**Depends on.** YCCE-020A, YCCE-024A.

**Components.** Repair flags, pickup effects, actual-healing events, and full-health events.

**Work.** Keep repair pickups separate from resource rarity. Apply healing at the correct stage and emit actual recovery and full-health consumption events for later builds.

**Observable outcome.** A repair resource heals correctly while a legendary nonrepair resource does not.

**Acceptance conditions.** No repeated healing from contested stages and no counted overheal.

**Verification steps.** Consume each resource type at full, partial, and nearly lethal hull under competition.

**Evidence required.** Healing ledger and pickup recordings.

### YCCE-024C. Implement the authoritative currency wallet

- [ ] Complete YCCE-024C and record user review.

**Depends on.** YCCE-006, YCCE-024A.

**Components.** Wallet state, reward grants, atomic spending, and idempotent receipts.

**Work.** Introduce the scarce source choice currency before POIs and later offer purchases. Validate grants and spends through Match. Keep cost escalation and offer-local rarity logic in YCCE-049 and YCCE-049A.

**Observable outcome.** A player earns and spends currency once through validated transactions.

**Acceptance conditions.** No negative balance, duplicate grant, or duplicate spend.

**Verification steps.** Race valid and insufficient spends, retry acknowledgments, and reset the match.

**Evidence required.** Wallet conservation results and transaction trace.

### YCCE-025. Implement XP, levels, and pending rewards

- [ ] Complete YCCE-025 and record user review.

**Depends on.** YCCE-024.

**Components.** XP thresholds, level advancement, passive progress, and pending offer queue.

**Work.** Convert resource progress into levels. Handle multiple levels from one reward and later passive XP events. Apply level HP growth and plating refill exactly once. Replace each twelfth level's ordinary offer with a branching offer.

**Observable outcome.** Gathering fills the progress bar and creates the correct pending choice sequence.

**Acceptance conditions.** A twelfth-level reward never adds both pools. Overflow progress is preserved. Elimination prevents further progression. Passive progress is not disabled to simplify choice protection.

**Verification steps.** Cross one and several thresholds, including levels 12 and 24. Repeat while selecting and with changed XP requirements.

**Evidence required.** XP ledger, level-event counts, and boundary-level scenario results.

### YCCE-025A. Enable verified Muscular Tissue in the starter catalogue

- [ ] Complete YCCE-025A and record user review.

**Depends on.** YCCE-006, YCCE-020, YCCE-025.

**Components.** Verified source record, numeric effect binding, safe description, and starter release manifest.

**Work.** Implement source physical growth with verified rank and rarity tables as the first real offerable passive. Use a simple authoritative stat handler that YCCE-047 retains. Later YCCE-060A completes its cross-system and visual acceptance without rewriting it.

**Observable outcome.** A validated scenario grant increases actual physical damage in the Match and browser.

**Acceptance conditions.** This is real source content, not a fixture-only or generic bonus. Every enabled rank has a handler.

**Verification steps.** Compare damage and stats at available ranks and rarities through validated scenario grants. Normal earned acquisition is verified by YCCE-027A and YCCE-032 after offers exist.

**Evidence required.** Source comparison, direct effect proof, and starter manifest entry.

### YCCE-025B. Enable verified Stomach salvage progression

- [ ] Complete YCCE-025B and record user review.

**Depends on.** YCCE-025A, YCCE-024.

**Components.** Stomach source record, salvage-speed modifier, and starter catalogue.

**Work.** Implement the verified source salvage-speed effect at its supported ranks and rarities. Preserve the staged processing model. YCCE-058A later closes complete family integration and presentation.

**Observable outcome.** Acquisition measurably changes collection time in the actual Match.

**Acceptance conditions.** No instantaneous pickup shortcut or duplicated stage progress.

**Verification steps.** Compare collection timelines and modifier recomputation at several source values.

**Evidence required.** Source table and collection-time comparison.

### YCCE-025C. Enable verified Plated defense progression

- [ ] Complete YCCE-025C and record user review.

**Depends on.** YCCE-025B, YCCE-020A.

**Components.** Plated source record, plating modifier, and starter catalogue.

**Work.** Implement the verified plating increase and one-time level refill interaction. YCCE-061 later closes full defense integration and presentation.

**Observable outcome.** The upgrade changes actual plating and absorbed damage.

**Acceptance conditions.** Every offered rank and rarity has correct behavior and level refills occur once.

**Verification steps.** Acquire, take damage, level several times, and compare the plating ledger.

**Evidence required.** Source comparison, damage checks, and starter manifest entry.

### YCCE-025D. Enable verified Body Slam combat progression

- [ ] Complete YCCE-025D and record user review.

**Depends on.** YCCE-025C, YCCE-021B.

**Components.** Body Slam source record, maximum-HP attack handler, and initial equipment binding.

**Work.** Implement the learned source attack distinctly from starting Bop. Preserve verified HP scaling, action timing, and rank and rarity behavior. YCCE-053 later closes tail identity, graph, and final visual integration.

**Observable outcome.** A player acquires and equips a real source-derived attack.

**Acceptance conditions.** No renamed Bop or generic damage multiplier substitutes for Body Slam.

**Verification steps.** Compare different maximum HP, direct hits, cooldowns, and equipment replacement.

**Evidence required.** Source and attack comparison, equipment scenario, and recording.

### YCCE-025E. Enable verified Dash and starter movement

- [ ] Complete YCCE-025E and record user review.

**Depends on.** YCCE-025D, YCCE-011, YCCE-022.

**Components.** Dash source record, baseline movement action, and cooldown.

**Work.** Bind the verified source short dash to Space and the movement slot. Keep server authority and collision behavior. YCCE-057 later closes comparison with the complete movement catalogue.

**Observable outcome.** A real movement ability works in the first playable release.

**Acceptance conditions.** No client teleport or wall traversal outside the source movement rule.

**Verification steps.** Use the collision course and compare cooldown and distance across render rates.

**Evidence required.** Movement timing checks and recording.

### YCCE-025F. Enable the Arms branching route

- [ ] Complete YCCE-025F and record user review.

**Depends on.** YCCE-025E, YCCE-020.

**Components.** Arms source record, branch classification, and stat and reach handlers.

**Work.** Implement verified source rank and rarity effects for Arms in the starter branching pool. Retain unlock edges for later enabled children. YCCE-052 closes the complete graph and visuals.

**Observable outcome.** A real branch choice changes physical, ability, and reach behavior.

**Acceptance conditions.** Enabled branch effects work even while unavailable child abilities remain correctly absent from the starter release.

**Verification steps.** Compare stats, salvage reach, and canonical branch eligibility.

**Evidence required.** Source comparison, handler coverage, and starter branch manifest.

### YCCE-025G. Enable the Slithery branching route

- [ ] Complete YCCE-025G and record user review.

**Depends on.** YCCE-025F.

**Components.** Slithery source record, speed modifier, and terrain adaptation binding.

**Work.** Implement its verified movement and adaptation effects and Legs exclusion. Use a queryable terrain fixture before the full four-biome world arrives. YCCE-052C closes full world and child-route integration.

**Observable outcome.** A second real branch changes movement and terrain response.

**Acceptance conditions.** No placeholder card or Legs-compatible illegal state.

**Verification steps.** Compare movement, adaptation fixture behavior, and both acquisition exclusion orders.

**Evidence required.** Source comparison, terrain scenario, and branch eligibility checks.

### YCCE-025H. Enable the Wings branching route

- [ ] Complete YCCE-025H and record user review.

**Depends on.** YCCE-025G.

**Components.** Wings source record, source mobility benefits, and third starter branch.

**Work.** Implement verified source mobility and adaptation effects without inventing unrestricted flight. Complete the three-option starter branch pool. YCCE-052D closes full world integration and presentation.

**Observable outcome.** The first playable can offer three actual legal branching alternatives.

**Acceptance conditions.** No source specialization is left selectable without a handler. The small release stays explicitly labeled a subset.

**Verification steps.** Validate three distinct starter branch records through catalogue fixtures and compare each implemented mobility effect. YCCE-026A owns actual randomized offer generation.

**Evidence required.** Starter catalogue validation, branch offer proof, and source comparisons.

### YCCE-026. Evaluate upgrade prerequisites and exclusions

- [ ] Complete YCCE-026 and record user review.

**Depends on.** YCCE-006, YCCE-025, YCCE-025H.

**Components.** Requirement evaluator, rank gates, pool eligibility, and max-rank removal.

**Work.** Implement all-of, any-of, rank, specialization, and world-condition requirements. Enforce symmetric availability exclusions, pool separation, and rank caps.

**Observable outcome.** A build exposes only legal next upgrades.

**Acceptance conditions.** No account unlock blocks applicable content and no stale CSV gap removes a prerequisite.

**Verification steps.** Enumerate representative graph states, both exclusion orders, and depleted pools.

**Evidence required.** Eligibility and reachability report with rejected illegal cases.

### YCCE-026A. Generate weighted offers and track affinities

- [ ] Complete YCCE-026A and record user review.

**Depends on.** YCCE-026.

**Components.** Offer RNG, rarity selection, repeat weights, affinity totals, and offer revisions.

**Work.** Generate three distinct legal options when available. Apply reconciled affinity and repeated-rank weighting, source rarity rules, and a bounded depleted-pool fallback. Keep personal-risk counting separate.

**Observable outcome.** Different builds receive different valid offers from the same pool.

**Acceptance conditions.** No invented filler upgrade, duplicate option, or unsupported rarity.

**Verification steps.** Compare seeded offers across build states and audit affinity changes after repeated ranks.

**Evidence required.** Seeded offer samples, weighting checks, and fallback results.

### YCCE-027. Apply protected stationary selection activity

- [ ] Complete YCCE-027 and record user review.

**Depends on.** YCCE-015, YCCE-022, YCCE-026A.

**Components.** Activity transitions, immobilization, invulnerability, and offensive suppression.

**Work.** Integrate actual selection with stationary protection. Stop salvage, manual attacks, contact offense, reactive offense, ongoing owned fields, and offensive allies. Keep passive XP and all clocks running.

**Observable outcome.** One player selects safely while the other three continue.

**Acceptance conditions.** The protected craft cannot block or push others offensively. Boundary damage still applies.

**Verification steps.** Open a choice during every relevant action and inspect all owned offensive entities.

**Evidence required.** Four-client recording and protection matrix.

### YCCE-027A. Commit choices and bound pending selection windows

- [ ] Complete YCCE-027A and record user review.

**Depends on.** YCCE-027.

**Components.** Offer IDs, revisions, transaction acknowledgment, deadline, and queue.

**Work.** Prove normal earned acquisition of the real starter upgrades from YCCE-025A through YCCE-025H. Commit one selected result exactly once. Randomly select a displayed option on expiry. Preserve fixed deadlines across rerolls, rerenders, retries, and reconnects. Apply the exposed-interval and unseen-prompt rules from YCCE-015.

**Observable outcome.** Queued levels resolve without lost choices or continuous immunity.

**Acceptance conditions.** A stale offer cannot spend, select, or extend a window.

**Verification steps.** Stress rapid passive levels, specialization and equipment prompts, expiry races, and duplicate requests.

**Evidence required.** Choice transaction ledger and queue timing proof.

### YCCE-028. Implement personal Carcinisation risk and reward

- [ ] Complete YCCE-028 and record user review.

**Depends on.** YCCE-020, YCCE-024, YCCE-026, YCCE-027.

**Components.** Experimental-tech counter, vulnerability modifiers, reward rarity influence, and risk UI.

**Work.** Count qualifying distinct acquisitions and explicit specialization bonuses. Increase the choosing player's risk against both bots and humans. Preserve the resource-rarity reward. Replace source boss-enhancement thresholds with documented personal penalties. Reconcile the conflicting rarity coefficient before binding production values.

**Observable outcome.** An experimental build visibly earns better resource opportunities and takes its own additional risk.

**Acceptance conditions.** Repeated ranks do not count as new distinct cards. Other players' bot difficulty is unchanged. A shared resource is not globally upgraded for everyone by one player's personal perk. Define claimant-relative rewards or another reviewed ownership-safe adaptation.

**Verification steps.** Compare bot and human hits against choosing and non-choosing players. Sample reward decisions with fixed seeds and ownership races.

**Evidence required.** Counter tests, risk/reward comparison, and reviewed threshold adaptations.

### YCCE-029. Implement one-life elimination and spectating

- [ ] Complete YCCE-029 and record user review.

**Depends on.** YCCE-007, YCCE-021, YCCE-027.

**Components.** Elimination transition, player wreckage, survivor count, and spectator controls.

**Work.** Eliminate on lethal damage, cancel pending actions, remove offensive ownership effects according to lifecycle rules, and create ordinary wreckage without transferring the build. Let the eliminated player follow a living player's permitted view.

**Observable outcome.** Death ends participation in that match and starts spectating.

**Acceptance conditions.** No respawn or death XP penalty. Reconnect does not revive. Spectators cannot reveal a broader world view, command units, or interact. Elimination is final even when delayed damage and healing occur in one update.

**Verification steps.** Eliminate during attack, salvage, selection, and disconnect. Inspect spectator UI and serialized observations.

**Evidence required.** Death-to-spectator recording and forbidden-action and privacy checks.

### YCCE-030. Implement scheduled shrinking territory and lethal collapse

- [ ] Complete YCCE-030 and record user review.

**Depends on.** YCCE-027A, YCCE-028, YCCE-029.

**Components.** Boundary geometry, wall-clock schedule, boundary damage, and warnings.

**Work.** Implement configurable 18-minute start, tiny 25-minute area, and full 28-minute collapse as untested initial tuning. Make collapse defeat every stall build through boundary harm. Keep live bots inside usable territory.

**Observable outcome.** The playable area contracts and forces living players together.

**Acceptance conditions.** Selection, shelter, extreme hull, and regeneration cannot postpone collapse. Simulation backlog does not silently stretch the schedule.

**Verification steps.** Run accelerated stages, a real-time schedule, overload, and extreme-defense scenarios.

**Evidence required.** Geometry and deadline traces and stall-case recordings.

### YCCE-030A. Implement in-area meteor threats and resistance

- [ ] Complete YCCE-030A and record user review.

**Depends on.** YCCE-030, YCCE-020B.

**Components.** Meteor scheduler, telegraphs, impacts, and damage channel.

**Work.** Spawn meteors in the current playable region with readable advance warnings. Preserve a separate meteor damage channel for catastrophe-resistance upgrades.

**Observable outcome.** Players can see, evade, or resist meteor impacts during the finale.

**Acceptance conditions.** Meteor resistance does not confer boundary immunity and impacts do not fall only in abandoned territory.

**Verification steps.** Shrink during meteor scheduling and compare protected, resistant, and ordinary targets.

**Evidence required.** Impact-location checks, damage comparisons, and meteor video.

### YCCE-030B. Resolve winner, draw, and final outcome once

- [ ] Complete YCCE-030B and record user review.

**Depends on.** YCCE-021B, YCCE-029, YCCE-030A.

**Components.** Survivor accounting, batched outcome resolution, and final result.

**Work.** Declare the last human alive after all relevant deaths in the update. Declare a draw when simultaneous final elimination leaves none. Ignore bot survivors when choosing the human winner.

**Observable outcome.** Every completed finale produces one consistent result.

**Acceptance conditions.** No score tiebreak, duplicate result, or ordering-dependent winner.

**Verification steps.** Run one-survivor, zero-survivor, simultaneous hit, meteor, and boundary endings.

**Evidence required.** Outcome matrix, event counts, and final-result recordings.

### YCCE-031. Show the complete first-match HUD and warnings

- [ ] Complete YCCE-031 and record user review.

**Depends on.** YCCE-016, YCCE-020 through YCCE-030.

**Components.** HUD, minimap, slot indicators, status display, and interaction prompts.

**Work.** Show hull, plating, XP, level, affinity and personal risk, two attacks, movement, ultimate, cooldowns, survivors, match phase, clock, salvage stages, and boundary alerts. Reserve room for temperature and sensing. Use observed information only.

**Observable outcome.** A player understands their state and the next required action without diagnostics.

**Acceptance conditions.** The central combat area remains clear. Warnings are readable during a choice. Rarity and danger have text or shape cues as well as color. Unavailable slots do not imply usable actions.

**Verification steps.** Drive a complete encounter and selection at laptop resolution. Check dense combat and warning priority.

**Evidence required.** HUD screenshots, interaction video, and an information-to-source checklist.

### YCCE-032. Finish the first playable match and rematch loop

- [ ] Complete YCCE-032 and record user review.

**Depends on.** YCCE-017 through YCCE-031.

**Components.** Results view, survivor resolution, return-to-lobby flow, and first playable scenario.

**Work.** Display the winner or draw, elimination order, builds, and meaningful match statistics. Return everyone to a clean lobby and start another match. Keep server shutdown distinct from a normal result.

**Observable outcome.** Four players join, grow through the real starter catalogue from YCCE-025A through YCCE-025H, fight, select upgrades, reach a finale, see a result, and play again.

**Acceptance conditions.** This milestone is labeled a verified-subset playable, not the complete application. Everyone starts the next match with equal access and Standard. No permanent gameplay advantage carries over.

**Verification steps.** Run a complete four-client match, including one reconnect and spectator transition, then a second match in the same host process.

**Evidence required.** End-to-end recording, result ledger, reset comparison, and an explicit remaining-content report.

## Phase 4. Build the world systems required by the upgrade graph

### YCCE-033. Implement four biome mechanics and water depth

- [ ] Complete YCCE-033 and record user review.

**Depends on.** YCCE-019, YCCE-020, YCCE-032.

**Components.** Terrain queries, biome definitions, depth fields, movement modifiers, and client ground rendering.

**Work.** Implement grass, sand, snow, and water as queryable terrain. Apply reconciled movement penalties and adaptation. Represent meaningful water depth if confirmed by the pinned source. Keep traction and movement penalties separate from thermal exposure.

**Observable outcome.** The same craft handles differently across terrain, and adaptation changes those differences.

**Acceptance conditions.** Biome benefits are mechanical. Low-adaptation players retain escape routes. Client ground boundaries agree with server queries. Quality settings cannot remove terrain penalties.

**Verification steps.** Time the same route across each terrain with several adaptation values. Check biome transitions and depth edges.

**Evidence required.** Route comparisons, query checks, and biome demonstration video.

### YCCE-034. Generate varied, fair, fully traversable maps

- [ ] Complete YCCE-034 and record user review.

**Depends on.** YCCE-033.

**Components.** Seeded region layout, obstacles, resource placement, POI sockets, and navigation queries.

**Work.** Expand the initial arena into varied four-biome maps. Distribute resources, elites, shelter sites, and POI locations. Provide alternative resource routes from each start and a valid final region. Validate geometry before allowing a match to start.

**Observable outcome.** Repeated matches have different navigable routes and recognizable biome identities.

**Acceptance conditions.** No isolated player start, unreachable required interaction, permanently trapped bot, or final zone inside impassable terrain. Generation has a bounded retry and useful failure path.

**Verification steps.** Check a recorded seed suite automatically. Drive representative extreme layouts and final-zone routes.

**Evidence required.** Seed report, route maps, failed-seed handling, and representative browser captures.

### YCCE-035. Implement the timed bot population director

- [ ] Complete YCCE-035 and record user review.

**Depends on.** YCCE-023, YCCE-030, YCCE-034.

**Components.** Population director, tier and variant definitions, elite placement, and entity budgets.

**Work.** Escalate threats and rewards with match time. Preserve early, middle, and late roles, biome restrictions, variants, and Alpha or elite equivalents. Maintain useful bot populations inside shrinking territory without spawning directly on players.

**Observable outcome.** Bot encounters become more threatening and rewarding while remaining present during the finale.

**Acceptance conditions.** Difficulty is not secretly tied to the strongest player's level. The director respects workload caps and surviving usable area. A bot migration or despawn cannot grant duplicate loot.

**Verification steps.** Observe each scheduled stage and the closing area at several player levels. Inspect counts, spawn distances, and reward progression.

**Evidence required.** Population timeline, parameter table, finale recording, and capacity assessment.

### YCCE-036. Preserve bot roles and scavenging opportunities

- [ ] Complete YCCE-036 and record user review.

**Depends on.** YCCE-024, YCCE-035.

**Components.** Simple bot behavior states, faction hostility, foraging, fleeing, and kill provenance.

**Work.** Add the minimal wander, forage, pursue, attack, and flee behavior needed by source builds. Allow bot-bot encounters and identifiable third-party wreckage. Define when bots consume public resources. Keep complex ecosystem simulation outside scope.

**Observable outcome.** A player can progress through scavenging and resource routes as well as direct kills.

**Acceptance conditions.** Bot decisions remain bounded. Diet and scavenger provenance survive ownership changes. Charmed allies will not steal the owner's salvage contrary to reconciled source behavior.

**Verification steps.** Observe a bot-bot kill, a player scavenging it, resource competition, and disengagement.

**Evidence required.** Behavior recordings, provenance ledger, and AI workload measurements.

### YCCE-037. Implement day, night, and mutable phase duration

- [ ] Complete YCCE-037 and record user review.

**Depends on.** YCCE-020, YCCE-034.

**Components.** Server world clock, day and night phases, schedule changes, and client lighting.

**Work.** Implement source-informed phases and transitions. Support changes to future phase duration from upgrades and POIs without resetting the match clock. Expose current phase and next transition consistently.

**Observable outcome.** Players see the same day and night phase, and relevant conditions can trigger real bonuses.

**Acceptance conditions.** Light rendering is separate from gameplay visibility. Schedule changes have deterministic accumulation rules. The final boundary uses its own match timeline.

**Verification steps.** Cross transitions, modify both phase durations, reconnect, and compare all client clocks.

**Evidence required.** Phase timeline, schedule-change assertions, and synchronized scene captures.

### YCCE-038. Schedule regional weather and visible warnings

- [ ] Complete YCCE-038 and record user review.

**Depends on.** YCCE-033, YCCE-037.

**Components.** Weather events, biome schedules, intensity, phase timing, and client feedback.

**Work.** Schedule rain, heatwaves, and blizzards with source-informed behavior and explicit tuning parameters. Synchronize start, warnings, duration, and recovery conditions.

**Observable outcome.** Each biome presents its expected weather at the same time on all clients.

**Acceptance conditions.** Weather scheduling does not alter match or choice deadlines.

**Verification steps.** Cross event transitions and reconnect while regional weather is active.

**Evidence required.** Weather schedule traces and synchronized scene captures.

### YCCE-038A. Apply heat, cold, adaptation, and recovery

- [ ] Complete YCCE-038A and record user review.

**Depends on.** YCCE-020C, YCCE-038.

**Components.** Exposure state, thermal modifiers, penalties, damage, and temperature HUD.

**Work.** Implement buildup, night-cold interaction where verified, thermal adaptation, consequences, and recovery outside exposure. Keep terrain adaptation independent.

**Observable outcome.** Adapted and unadapted craft experience visibly different thermal risk.

**Acceptance conditions.** Weather damage and plating bypass follow the source ledger.

**Verification steps.** Compare exposure curves by biome, phase, adaptation, and escape route.

**Evidence required.** Thermal curves, damage ledger, and warning-to-recovery recording.

### YCCE-039. Enforce viewer-specific spotting and concealment

- [ ] Complete YCCE-039 and record user review.

**Depends on.** YCCE-007, YCCE-009, YCCE-029, YCCE-037, YCCE-038A.

**Components.** Visibility queries, night range, filtered events, and spectator projections.

**Work.** Compute permitted observations on the server and remove concealed entities and dependent references from every outbound event. Clear old client traces when spotting ends.

**Observable outcome.** An unauthorized player cannot see or receive a hidden opponent.

**Acceptance conditions.** Graphics settings and spectator changes cannot expand permitted information.

**Verification steps.** Inspect packets, labels, sounds, projectiles, and interpolation across concealment transitions.

**Evidence required.** Negative packet assertions and actual browser visibility captures.

### YCCE-039A. Implement senses-based radar and navigation indicators

- [ ] Complete YCCE-039A and record user review.

**Depends on.** YCCE-039.

**Components.** Minimap, radar, elite and POI edge indicators, and sensing modifiers.

**Work.** Reveal only source-permitted indicators with distance and senses rules. Distinguish a radar hint from exact entity visibility. Preserve the one-observation UI model.

**Observable outcome.** Better sensing improves navigation and target discovery legitimately.

**Acceptance conditions.** Markers cannot expose precise hidden positions or undiscovered effect identities.

**Verification steps.** Compare sensing levels, day and night, target categories, and spectator follow.

**Evidence required.** Indicator comparison screenshots and authorized-payload checks.

### YCCE-040. Implement contested POI discovery and transactions

- [ ] Complete YCCE-040 and record user review.

**Depends on.** YCCE-027, YCCE-034, YCCE-039.

**Components.** POI entities, discovery events, interaction range, reservation and claim transactions, and choice UI.

**Work.** Separate first discovery from claiming a reward. Make POIs globally one-use. Validate position, costs, prerequisites, claim ownership, and cancellation. Apply bounded selection rules to POI prompts and define reservation expiry without permanent denial.

**Observable outcome.** Two players can discover a terminal, but only one valid claim commits its reward.

**Acceptance conditions.** No global pause, double purchase, permanent reservation, out-of-range claim, or resettable protection. Discovery-dependent passives trigger once per eligible discovery even if another player claims the terminal.

**Verification steps.** Race claims, disconnect while reserved, lose eligibility, retry a transaction, and revisit a discovered POI.

**Evidence required.** Claim race ledger, UI recording, and discovery-event counts.

### YCCE-041. Implement repair, progression, and stat POI rewards

- [ ] Complete YCCE-041 and record user review.

**Depends on.** YCCE-040, YCCE-020A.

**Components.** Canonical POI inventory, repair choices, progression rewards, and stat effects.

**Work.** Reconcile every applicable POI and assign each reward to this task or the following POI tasks. Implement immediate repair versus regeneration and XP versus permanent-stat tradeoffs.

**Observable outcome.** Players receive distinct real survival or progression outcomes from terminals.

**Acceptance conditions.** Each applicable POI reward has a named owner and reconciled costs.

**Verification steps.** Exercise each implemented choice, depleted funds, invalid eligibility, and repeated use.

**Evidence required.** POI assignment table and reward transaction results.

### YCCE-041A. Implement currency and upgrade POI rewards

- [ ] Complete YCCE-041A and record user review.

**Depends on.** YCCE-024C, YCCE-041, YCCE-026A.

**Components.** Currency reward, random stats, paid upgrade offers, and reward transactions.

**Work.** Implement source-derived currency-versus-stat and paid rare-upgrade choices. Reuse eligibility, revision, and atomic spending rules. Use the wallet from YCCE-024C. Offer reroll escalation remains owned by YCCE-049 and is not offered here.

**Observable outcome.** A contested terminal offers a real economy tradeoff.

**Acceptance conditions.** No free purchase, banned card grant, duplicate currency, or placeholder reward.

**Verification steps.** Race purchases, exhaust currency, and compare offer eligibility with ordinary progression.

**Evidence required.** Wallet ledger, reward coverage, and POI recording.

### YCCE-041B. Implement POI world-clock changes

- [ ] Complete YCCE-041B and record user review.

**Depends on.** YCCE-041, YCCE-037.

**Components.** Day and night POI choices and schedule mutation.

**Work.** Implement source-derived changes to day and night durations with authoritative one-use claims and defined accumulation.

**Observable outcome.** A claimed terminal changes later world phases for all clients.

**Acceptance conditions.** Match time and final-area deadlines do not reset or diverge.

**Verification steps.** Claim opposing clock choices and reconnect during the revised schedule.

**Evidence required.** World-clock comparison and claim ledger.

### YCCE-042. Map firmware appearances privately for each match

- [ ] Complete YCCE-042 and record user review.

**Depends on.** YCCE-024A, YCCE-039, YCCE-041.

**Components.** Firmware entities, private mapping, appearances, and per-match generation.

**Work.** Create unknown module appearances with one consistent effect mapping per run. Keep mappings and secret randomness out of client bundles and public seeds.

**Observable outcome.** Identical appearances within a match identify the same hidden effect.

**Acceptance conditions.** A new match resets the mapping and player knowledge.

**Verification steps.** Compare repeated appearances, two matches, and serialized creation payloads.

**Evidence required.** Mapping consistency and secrecy assertions.

### YCCE-042A. Implement firmware scanning and player knowledge

- [ ] Complete YCCE-042A and record user review.

**Depends on.** YCCE-042, YCCE-039A.

**Components.** Scan actions, identification rules, knowledge records, and UI.

**Work.** Apply senses and source identification modifiers. Reveal only the identified effect to the entitled player. Validate interaction range and item lifetime.

**Observable outcome.** One player can identify a module while another still sees it as unknown.

**Acceptance conditions.** No global knowledge leak, stale item scan, or client-claimed identification.

**Verification steps.** Compare two players, several sensing values, reconnect, and a new match.

**Evidence required.** Knowledge-scope checks and scan interaction recording.

### YCCE-042B. Implement positive firmware effects and viruses

- [ ] Complete YCCE-042B and record user review.

**Depends on.** YCCE-042A, YCCE-020C.

**Components.** Complete reconciled effect inventory, use transactions, and consumable feedback.

**Work.** Implement every applicable source mushroom effect as firmware, including harmful viruses. Preserve persistent, temporary, progress, healing, and status consequences and their immunities.

**Observable outcome.** Risking an unknown module creates its actual source-derived consequence.

**Acceptance conditions.** Every effect has a disposition and scenario. No generic random bonus replaces unverified behavior.

**Verification steps.** Use every effect at relevant hull and status boundaries and race use against removal.

**Evidence required.** Consumable coverage, effect ledgers, and representative recordings.

### YCCE-042C. Integrate firmware-related POI choices

- [ ] Complete YCCE-042C and record user review.

**Depends on.** YCCE-042B, YCCE-041.

**Components.** Firmware POI reward definitions and scanner, status, and spawn modifiers.

**Work.** Complete source POI choices that influence identification, poison, or mushroom-equivalent spawning. Reuse authoritative item and reward rules.

**Observable outcome.** A research terminal changes a real firmware-system capability.

**Acceptance conditions.** No POI option remains a dormant placeholder after this task.

**Verification steps.** Claim each choice and compare scanning, effect, or generation behavior directly.

**Evidence required.** Final firmware POI coverage and before/after scenarios.

### YCCE-043. Implement finite shelter and entry-exit events

- [ ] Complete YCCE-043 and record user review.

**Depends on.** YCCE-020, YCCE-027, YCCE-030, YCCE-034.

**Components.** Shelter occupancy, duration, size rules, attack restrictions, and entry-exit effects.

**Work.** Preserve finite source-style shelter immunity with size-dependent duration and forced exit. Implement map shelters and the creation hook for Burrower. Define cooldown, occupancy, and safe placement. Expose actual shelter state for Ambush and Hibernation.

**Observable outcome.** A craft retreats into shelter temporarily and exits visibly.

**Acceptance conditions.** No permanent immunity or offensive firing from shelter. The boundary bypasses shelter. Selection and shelter timers cannot restart one another. Disconnected craft still leave when their duration expires.

**Verification steps.** Enter and exit at several sizes. Chain with selection, passive XP, meteor exposure, and final-area collapse.

**Evidence required.** Shelter timeline, immunity matrix, and escape-versus-boundary recording.

### YCCE-044. Implement charm eligibility and atomic ownership transfer

- [ ] Complete YCCE-044 and record user review.

**Depends on.** YCCE-021B, YCCE-036, YCCE-039.

**Components.** Charm checks, owner identity, capacity, and transfer transaction.

**Work.** Recruit eligible bots through source-derived charm. Define owner categories, capacity, hostility, transfer, and attribution. Prevent human conversion.

**Observable outcome.** An eligible bot becomes the correct player's ally exactly once.

**Acceptance conditions.** Competing charms cannot duplicate entities or exceed verified limits.

**Verification steps.** Race transfers, fill capacity, and charm ineligible bots and humans.

**Evidence required.** Ownership ledger, eligibility matrix, and transfer recording.

### YCCE-044A. Implement companion follow, targeting, and combat

- [ ] Complete YCCE-044A and record user review.

**Depends on.** YCCE-044.

**Components.** Ally behavior, owner follow, priorities, attacks, and protection suppression.

**Work.** Make recruited bots follow and fight using source command and tracking rules. Preserve owner salvage rights and stop offensive action during protected selection.

**Observable outcome.** The recruited ally contributes useful bot and PvP combat.

**Acceptance conditions.** Targets respect visibility and ownership. Allies do not steal owner salvage contrary to source rules.

**Verification steps.** Fight bots and players, mark targets, choose upgrades, and eliminate the owner.

**Evidence required.** Ally combat recording and damage and lifecycle attribution checks.

### YCCE-044B. Integrate ally recruitment POI rewards

- [ ] Complete YCCE-044B and record user review.

**Depends on.** YCCE-041, YCCE-044A.

**Components.** Ally POI choices, paid recruitment, and spawn placement.

**Work.** Complete source POI recruitment outcomes with actual ally entities, capacity checks, safe placement, and atomic costs.

**Observable outcome.** A terminal produces a functioning companion with correct ownership.

**Acceptance conditions.** No reward can exceed caps or spawn an invalid ally inside obstacles.

**Verification steps.** Claim at capacity, race purchases, and inspect follow and combat after recruitment.

**Evidence required.** Recruitment transaction results and final POI coverage report.

### YCCE-045. Implement summons, decoys, and bounded ally lifecycles

- [ ] Complete YCCE-045 and record user review.

**Depends on.** YCCE-035, YCCE-043, YCCE-044.

**Components.** Summon and decoy entities, delayed spawns, separate caps, inherited stats, and cleanup.

**Work.** Distinguish charmed allies, summoned Darwee equivalents, decoys, and delayed offspring. Preserve source-specific limits and inherited stats. Enforce a measured total entity budget without silently replacing source caps. Implement shelter, boundary, disconnect, and owner-death behavior.

**Observable outcome.** A test summon and a charm can coexist with their correct independent limits.

**Acceptance conditions.** Delayed offspring cannot spawn after invalid owner or match teardown. No unbounded exponential spawning. Pending summons and decoys follow protection and causal-credit rules.

**Verification steps.** Reach each cap, expire fields, disconnect and eliminate owners, and close the map around a large ally group.

**Evidence required.** Lifecycle and cap assertions, late-area recording, and entity-cost measurements.

### YCCE-046. Update size, mass, colliders, and reach safely

- [ ] Complete YCCE-046 and record user review.

**Depends on.** YCCE-011, YCCE-021A, YCCE-033, YCCE-043, YCCE-045.

**Components.** Collider updates, mass, hit geometry, model scale, and shelter-size rules.

**Work.** Apply source growth and shrinkage to relevant physical and visual properties. Preserve entity identity when replacing geometry and resolve nearby obstacles safely.

**Observable outcome.** Large and small craft have meaningful visible and physical tradeoffs.

**Acceptance conditions.** No duplicate contact damage, overlapping trapped craft, or independently trusted client collider.

**Verification steps.** Change size near walls and other craft and compare reach and shelter interaction.

**Evidence required.** Size-to-physics checks and collision-course video.

### YCCE-046A. Implement pulling and mass-relative displacement

- [ ] Complete YCCE-046A and record user review.

**Depends on.** YCCE-046.

**Components.** Pull constraints, impulse rules, target mass comparison, and cleanup.

**Work.** Implement target-pulled, owner-pulled, and mutual-pull cases needed by Sticky and related source abilities. Define cancellation, collision response, and maximum duration.

**Observable outcome.** The direction of a pull changes with the source-defined mass relationship.

**Acceptance conditions.** No permanent tether, wall penetration, or invalid surviving constraint after death.

**Verification steps.** Pull smaller, larger, and similar-mass targets through obstacles and eliminate each endpoint.

**Evidence required.** Pull comparison video and constraint cleanup checks.

## Phase 5. Complete progression semantics and every applicable upgrade family

### YCCE-047. Complete the typed effect and trigger runtime

- [x] Complete YCCE-047 and record user review.

**Depends on.** YCCE-020 through YCCE-030, YCCE-036 through YCCE-046.

**Components.** Effect handlers, trigger events, persistent modifiers, temporary effects, and causal chain limits.

**Work.** Complete the finite effect families required by the reconciled catalogue. Cover attack, contact, damage, dodge, actual healing, pickup, kill, interval, chase, movement, discovery, shelter entry and exit, and phase change. Add dedicated handlers for unusual mechanics instead of arbitrary per-card callbacks or a general scripting language.

**Observable outcome.** Representative manual, periodic, passive, and reactive effects execute through consistent ownership and attribution.

**Acceptance conditions.** Trigger recursion is bounded. Timers, delayed damage, and effect cleanup survive selection and disconnect correctly. No disabled effect accumulates offensive work for an immediate burst after protection.

**Verification steps.** Exercise every trigger kind, reflected damage loops, delayed lethal damage, and teardown.

**Evidence required.** Trigger coverage matrix, causal event traces, and representative live demonstrations.

### YCCE-048. Complete equipment transactions and retained benefits

- [x] Complete YCCE-048 and record user review.

**Depends on.** YCCE-022, YCCE-027, YCCE-047.

**Components.** Equipment selection UI, replacement transactions, learned modifiers, and cooldown state.

**Work.** Complete the agreed slot-change interaction for new and previously learned abilities. Explain replacement consequences. Preserve passive benefits of learned attacks where the source does. Define cancellation and selection-time auto-resolution without granting a new deadline.

**Observable outcome.** A player changes their active loadout and retains the correct underlying build.

**Acceptance conditions.** No unrestricted combat swapping, cooldown reset exploit, lost learned ability, or duplicated modifier. Slot decisions use the same authoritative revision and acknowledgment discipline as offers.

**Verification steps.** Swap every action category during cooldown, queue multiple acquisition prompts, time out, and reconnect.

**Evidence required.** Equipment transaction scenarios and before/after stat and cooldown records.

### YCCE-049. Implement currency wallets and reroll transactions

- [x] Complete YCCE-049 and record user review.

**Depends on.** YCCE-026A, YCCE-027A, YCCE-040, YCCE-047.

**Components.** Wallet, ordinary and branch rerolls, offer revisions, and cost escalation.

**Work.** Implement source-informed reroll costs, escalation, per-offer reset, and branching restrictions. Spend and replace offers atomically without changing the protection deadline.

**Observable outcome.** A player rerolls and sees the exact next cost and legal revised offer.

**Acceptance conditions.** Duplicate, stale, and insufficient-funds commands cannot spend or extend protection.

**Verification steps.** Run cost chains, new offers, timeout races, and repeated delivery.

**Evidence required.** Wallet conservation and reroll transaction results.

### YCCE-049A. Implement temporary rarity purchases and reroll resets

- [x] Complete YCCE-049A and record user review.

**Depends on.** YCCE-049.

**Components.** Offer-local rarity changes, cost chain, selected result, and reset policy.

**Work.** Apply escalating rarity purchases to the current offer. Persist only the selected result. Reroll clears temporary improvements and resets their upgrade chain.

**Observable outcome.** Purchased rarity changes the chosen card without altering unselected inventory.

**Acceptance conditions.** Rank and rarity commute. Branch restrictions and maximum rarity hold.

**Verification steps.** Buy repeatedly, reroll, select, time out, and compare equivalent acquisition orders.

**Evidence required.** Rarity transaction matrix and final-stat comparisons.

### YCCE-050. Implement branching ranks and graph reachability

- [x] Complete YCCE-050 and record user review.

**Depends on.** YCCE-025, YCCE-026, YCCE-048, YCCE-049A.

**Components.** Branch pool, periodic replacement rule, rank-sensitive edges, and reachability checks.

**Work.** Complete the every-twelfth-level replacement and all branch rank transitions. Validate paths to all applicable children without boss or account unlocks.

**Observable outcome.** A branch choice opens the documented next build paths.

**Acceptance conditions.** No ordinary-plus-branch double reward, unreachable required card, or conflicting material path.

**Verification steps.** Reach levels 12 and 24 and enumerate canonical branch states.

**Evidence required.** Branch recordings and graph reachability report.

### YCCE-050A. Implement specialization prompts and skip rewards

- [x] Complete YCCE-050A and record user review.

**Depends on.** YCCE-050, YCCE-027A.

**Components.** Specialization identity, eligibility, choices, skip currency, and timeout policy.

**Work.** Offer specializations at verified parent ranks. Keep them distinct from rarity. Preserve source skip-for-currency and fixed-deadline queue behavior. Use real handlers as individual ability tasks complete them.

**Observable outcome.** A specialization prompt commits one fork or a valid skip result.

**Acceptance conditions.** No name-only selectable specialization and no extra immunity window from repeated prompts.

**Verification steps.** Select, skip, time out, reconnect, and attempt stale or repeated choices.

**Evidence required.** Prompt transaction checks and specialization routing recording.

### YCCE-051. Bind upgrade effects to modular visuals and feedback

- [x] Complete YCCE-051 and record user review.

**Depends on.** YCCE-046 through YCCE-050.

**Components.** Visual attachment registry, effect cues, animation events, icon references, and safe content descriptions.

**Work.** Define how acquired modules, rank, specialization, projectiles, fields, and performance changes appear. Support attachment points and scale without requiring a unique model for every numerical modifier. Connect feedback to authoritative events.

**Observable outcome.** A growing build visibly changes its chassis, equipment, or emitted effects.

**Acceptance conditions.** Combat silhouettes remain readable. Pure stat upgrades receive accurate feedback without false hardware claims. Attachments do not change collision independently. Hidden upgrades do not leak through unauthorized rendering.

**Verification steps.** Apply conflicting and compatible modules to small and large craft. Compare effect timing with hit events.

**Evidence required.** Visual mapping table, growth recording, and geometry comparison.

### YCCE-052. Complete Arms

- [ ] Complete YCCE-052 and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Arms record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Reuse the implementation from YCCE-025F. Complete its remaining source, graph, cross-system, and presentation obligations without a parallel handler. Preserve physical, ability, and salvage-reach benefits and the verified rank gate for limb weapons. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Arms acquisition produces its source-defined effect in play. Compare stat gains and unlock a limb weapon at the required rank.

**Acceptance conditions.** The child stays unavailable before its rank gate.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-052A. Complete Tentacles

- [ ] Complete YCCE-052A and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Tentacles record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve movement and ability benefits, limb unlocks, and rank-sensitive competition with Arms. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Tentacles acquisition produces its source-defined effect in play. Acquire a compatible route and attempt the prohibited competing route.

**Acceptance conditions.** Requirements and exclusions follow canonical rank rules.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-052B. Complete Legs

- [ ] Complete YCCE-052B and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Legs record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve locomotion gains and both Arthropod and Bipedal specializations. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Legs acquisition produces its source-defined effect in play. Compare both specialization choices and their unlocked movement routes.

**Acceptance conditions.** Arthropod grants its explicit personal-risk point once.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-052C. Complete Slithery

- [ ] Complete YCCE-052C and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Slithery record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Reuse the implementation from YCCE-025G. Complete its remaining source, graph, cross-system, and presentation obligations without a parallel handler. Preserve speed, terrain adaptation, and the alternate locomotion route. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Slithery acquisition produces its source-defined effect in play. Cross each biome and inspect Slide and secretion eligibility.

**Acceptance conditions.** Legs incompatibility works in both acquisition orders.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-052D. Complete Wings

- [ ] Complete YCCE-052D and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Wings record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Reuse the implementation from YCCE-025H. Complete its remaining source, graph, cross-system, and presentation obligations without a parallel handler. Preserve source mobility and terrain adaptation without inventing unrestricted flight. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Wings acquisition produces its source-defined effect in play. Compare biome routes and obstacle interaction at each verified rank.

**Acceptance conditions.** Wings preserve planar obstacle collision and source movement effects. Any airborne appearance is visual only.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-052E. Complete Tail

- [ ] Complete YCCE-052E and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Tail record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Resolve its current pool and preserve command, ability, and tail-child unlocks. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Tail acquisition produces its source-defined effect in play. Acquire tail children and compare legal ordinary or branch offers.

**Acceptance conditions.** Pool classification follows evidence rather than an old label.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-052F. Complete Prehensile Tail

- [ ] Complete YCCE-052F and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-052E.

**Components.** Canonical Prehensile Tail record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve salvage reach and verified Arboreal and Thrower behavior. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Prehensile Tail acquisition produces its source-defined effect in play. Compare reach, mobility, throwing, and alternative Stoner eligibility.

**Acceptance conditions.** Both specializations have real effects rather than names only.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-052G. Complete More Legs

- [ ] Complete YCCE-052G and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-052B.

**Components.** Canonical More Legs record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve speed and the Legs-rank plus Arthropod prerequisite. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal More Legs acquisition produces its source-defined effect in play. Attempt acquisition before and after the complete prerequisite.

**Acceptance conditions.** The extra module and risk bookkeeping apply exactly once.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-052H. Complete Fin

- [ ] Complete YCCE-052H and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Fin record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve water adaptation and verified rank cap and body exclusions. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Fin acquisition produces its source-defined effect in play. Traverse shallow and deep water with and without Fin.

**Acceptance conditions.** The effect changes terrain mechanics and not thermal resistance.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-052I. Complete Hollow Bones

- [ ] Complete YCCE-052I and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Hollow Bones record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve the movement benefit and resistance cost. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Hollow Bones acquisition produces its source-defined effect in play. Compare equal hits and timed movement before and after acquisition.

**Acceptance conditions.** Both sides of the tradeoff use the canonical formula.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-053. Complete Body Slam

- [ ] Complete YCCE-053 and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Body Slam record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Reuse the implementation from YCCE-025D. Complete its remaining source, graph, cross-system, and presentation obligations without a parallel handler. Distinguish the hidden starting Bop from the learned maximum-HP attack. Resolve the tail variant by canonical identity. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Body Slam acquisition produces its source-defined effect in play. Compare several maximum-HP values, ranks, rarities, and legal tail origins.

**Acceptance conditions.** A legacy Body Slam label cannot replace the source starting action.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-053A. Complete Claws

- [ ] Complete YCCE-053A and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-052.

**Components.** Canonical Claws record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve repeated physical strikes and limb-rank prerequisites. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Claws acquisition produces its source-defined effect in play. Strike moving targets and compare cadence and physical scaling.

**Acceptance conditions.** The correct conflicting limb attacks become unavailable.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-053B. Complete Pincers

- [ ] Complete YCCE-053B and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-052.

**Components.** Canonical Pincers record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve the ability-damage limb attack and its Pistol Pincer unlock. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Pincers acquisition produces its source-defined effect in play. Compare ability and physical scaling and try both exclusion orders.

**Acceptance conditions.** Pincer and Pincers aliases do not create duplicate abilities.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-053C. Complete Toe Beans

- [ ] Complete YCCE-053C and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-052.

**Components.** Canonical Toe Beans record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve the manual attack and source charm chance. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Toe Beans acquisition produces its source-defined effect in play. Hit eligible bots, capped allies, and human targets.

**Acceptance conditions.** Humans take the correct attack effect but cannot be converted.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-053D. Complete Body Slam tail identity

- [ ] Complete YCCE-053D and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical source record, graph rules, effect binding where applicable, and presentation.

**Work.** Resolve Body Slam (Tail) against learned Body Slam and hidden Bop using versioned IDs. If distinct and applicable, implement the tail behavior and every rank, rarity, and graph rule. Otherwise record the canonical mapping and individual omission rationale for review. Do not create a duplicate handler.

**Observable outcome.** The source identity has an auditable disposition and any distinct applicable behavior is available through the legal graph.

**Acceptance conditions.** No unresolved legacy candidate disappears or becomes an invented generic upgrade. No duplicate alias is selectable.

**Verification steps.** At the assigned checkpoint, compare the versioned identity and all implemented effects with source evidence through Match behavior and the browser.

**Evidence required.** Source identity disposition, graph and behavior results where applicable, and user review of any omission.

### YCCE-054. Complete Antlers

- [ ] Complete YCCE-054 and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Antlers record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve high physical damage and capped self-damage. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Antlers acquisition produces its source-defined effect in play. Attack at full and nearly depleted hull with several ranks.

**Acceptance conditions.** Self-damage follows source caps and the shared death rules.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-054A. Complete Jaws

- [ ] Complete YCCE-054A and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Jaws record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve stunned-target damage and retained salvage benefits. Complete Neck Bite, Stalker from confirmed effects. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Jaws acquisition produces its source-defined effect in play. Compare stunned and unstunned hits, unequip, and test both specializations.

**Acceptance conditions.** Neck Bite and Stalker use confirmed behavior.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-054B. Complete Horns

- [ ] Complete YCCE-054B and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Horns record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve the charge attack and plating bypass. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Horns acquisition produces its source-defined effect in play. Charge plated and unplated targets near obstacles.

**Acceptance conditions.** A collision does not multiply hits beyond source intent.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-054C. Complete Trunk

- [ ] Complete YCCE-054C and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Trunk record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve its hybrid swipe, salvage reach, and equipment tradeoffs. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Trunk acquisition produces its source-defined effect in play. Compare physical and ability inputs and collect near the reach boundary.

**Acceptance conditions.** Mouth exclusions and retained benefits match the source record.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-055. Complete Stoner

- [ ] Complete YCCE-055 and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-052.

**Components.** Canonical Stoner record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve limited ammunition, Training kill growth, and Signal tracking. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Stoner acquisition produces its source-defined effect in play. Deplete ammunition, earn kills, and observe tracked ally targeting.

**Acceptance conditions.** No-ammo firing fails and permanent gains occur once per eligible kill.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-055A. Complete Beak

- [ ] Complete YCCE-055A and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Beak record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve ranged ability damage, salvage speed, Sharp, and Long. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Beak acquisition produces its source-defined effect in play. Compare both specializations and Spit eligibility at the required rank.

**Acceptance conditions.** Range, passive benefits, and exclusions remain distinct.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-055B. Complete Spit

- [ ] Complete YCCE-055B and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-054A.

**Components.** Canonical Spit record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve the ranged projectile and all source prerequisite alternatives. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Spit acquisition produces its source-defined effect in play. Verify every prerequisite alternative against canonical fixture states. Acquire through the live Beak and Jaws routes. YCCE-068 proves the Saliva route after YCCE-058B.

**Acceptance conditions.** Missing CSV prerequisite fields do not make it universally available.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-055C. Complete Projectile Tongue

- [ ] Complete YCCE-055C and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Projectile Tongue record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve stun, extension rooting, Whiplash, and Sticky pulling. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Projectile Tongue acquisition produces its source-defined effect in play. Pull smaller, larger, and similar-mass targets and compare salvage-speed scaling.

**Acceptance conditions.** Root cancellation, pull direction, and hit attribution agree across clients.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-056. Complete Leech

- [ ] Complete YCCE-056 and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Leech record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve drain, Anaesthetic no-aggro behavior, and Vasodilators scaling. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Leech acquisition produces its source-defined effect in play. Compare bot aggro, actual damage, hull recovery, and salvage speed.

**Acceptance conditions.** Healing and no-aggro conditions follow the verified source.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-056A. Complete Stinger

- [ ] Complete YCCE-056A and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-052E.

**Components.** Canonical Stinger record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve the physical hit and corrosion application. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Stinger acquisition produces its source-defined effect in play. Compare direct damage and status ticks against resistances.

**Acceptance conditions.** Detachable Tail incompatibility works in either order.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-056B. Complete Spur

- [ ] Complete YCCE-056B and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-052E.

**Components.** Canonical Spur record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve automatic follow-ups, Marking, and saved-currency Primal scaling. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Spur acquisition produces its source-defined effect in play. Attack with several weapons and currency balances.

**Acceptance conditions.** Follow-ups do not occupy a manual slot or recursively trigger themselves.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-057. Complete Dash

- [ ] Complete YCCE-057 and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Dash record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Reuse the implementation from YCCE-025E. Complete its remaining source, graph, cross-system, and presentation obligations without a parallel handler. Preserve the baseline short burst and its source cooldown. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Dash acquisition produces its source-defined effect in play. Repeat movement near walls at several rendering frame rates.

**Acceptance conditions.** Distance and cooldown are authoritative and stable.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-057A. Complete Slide

- [ ] Complete YCCE-057A and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-052C.

**Components.** Canonical Slide record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve the Slithery-gated longer low-cooldown movement. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Slide acquisition produces its source-defined effect in play. Compare it with Dash on the same route and terrain.

**Acceptance conditions.** Acquisition requires the reconciled locomotion path.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-057B. Complete Sprint

- [ ] Complete YCCE-057B and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Sprint record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve temporary speed duration, cooldown, and stacking rules. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Sprint acquisition produces its source-defined effect in play. Measure travel during activation, expiry, and overlapping modifiers.

**Acceptance conditions.** Expiry removes the bonus without altering permanent stats.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-057C. Complete Leap

- [ ] Complete YCCE-057C and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Leap record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve obstacle traversal and source-defined immunity timing. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Leap acquisition produces its source-defined effect in play. Cross enemies and obstacles on the gameplay plane while attacks and meteors occur, and finish at a clear landing point within the arena.

**Acceptance conditions.** Leap immunity never defeats the final boundary.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-057D. Complete Scuttle

- [ ] Complete YCCE-057D and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-052B.

**Components.** Canonical Scuttle record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve the Legs-gated quick burst and personal-risk contribution. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Scuttle acquisition produces its source-defined effect in play. Acquire through its legal rank route and compare short movement.

**Acceptance conditions.** Repeated acquisition cannot duplicate a unique risk contribution.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-058. Complete Slow Metabolism

- [ ] Complete YCCE-058 and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Slow Metabolism record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve slower movement and cheaper progress thresholds. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Slow Metabolism acquisition produces its source-defined effect in play. Apply it with partial XP and compare route speed and level thresholds.

**Acceptance conditions.** Threshold changes conserve earned progress and do not loop levels.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-058A. Complete Stomach

- [ ] Complete YCCE-058A and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Stomach record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Reuse the implementation from YCCE-025B. Complete its remaining source, graph, cross-system, and presentation obligations without a parallel handler. Preserve source salvage-speed progression. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Stomach acquisition produces its source-defined effect in play. Collect several nearby resources with different ranks and rarities.

**Acceptance conditions.** First and final stage semantics remain unchanged.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-058B. Complete Saliva

- [ ] Complete YCCE-058B and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Saliva record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve salvage-speed and regeneration benefits and downstream unlocks. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Saliva acquisition produces its source-defined effect in play. Compare collection, recovery, and Poisonous Saliva eligibility.

**Acceptance conditions.** Regeneration and actual healing events use shared rules.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-058C. Complete Forager

- [ ] Complete YCCE-058C and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Forager record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve repair-food conversion and poison resistance. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Forager acquisition produces its source-defined effect in play. Sample source-tagged drops and apply corrosion before and after acquisition.

**Acceptance conditions.** Conversion and resistance are separate effects.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-058D. Complete Cheek Pouch

- [ ] Complete YCCE-058D and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Cheek Pouch record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Implement stored consumption and both Provider and Storage specializations. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Cheek Pouch acquisition produces its source-defined effect in play. Fill storage, move away from resources, consume reserves, and test overflow.

**Acceptance conditions.** Storage is not approximated as increased collection radius.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-058E. Complete Reach

- [ ] Complete YCCE-058E and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Reach record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve verified attack-area or reach behavior at every supported size. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Reach acquisition produces its source-defined effect in play. Hit and salvage at measured boundaries as the canonical effect requires.

**Acceptance conditions.** Client geometry matches actual server reach.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-058F. Complete Ruminant

- [ ] Complete YCCE-058F and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Ruminant record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve affinity-based passive progress and interruption after damage. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Ruminant acquisition produces its source-defined effect in play. Take damage, wait through interruption, and gain levels during choices.

**Acceptance conditions.** Passive XP remains enabled and cannot create permanent protection.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-059. Complete Herbivore

- [ ] Complete YCCE-059 and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Herbivore record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve vegetation progress and source affinity tradeoffs. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Herbivore acquisition produces its source-defined effect in play. Compare vegetation with combat and aquatic sources.

**Acceptance conditions.** Only the intended source gains its bonus.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-059A. Complete Carnivore

- [ ] Complete YCCE-059A and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Carnivore record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve meat or land-combat progress and exclusions. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Carnivore acquisition produces its source-defined effect in play. Compare owner kills, third-party kills, and other resource sources.

**Acceptance conditions.** Diet scaling does not erase kill provenance.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-059B. Complete Piscivore

- [ ] Complete YCCE-059B and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Piscivore record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve aquatic resource progress. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Piscivore acquisition produces its source-defined effect in play. Collect matched land and water resources with several ranks.

**Acceptance conditions.** Aquatic identity survives collection and storage.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-059C. Complete Omnivore

- [ ] Complete YCCE-059C and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-059A, YCCE-059, YCCE-059B.

**Components.** Canonical Omnivore record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve the complete Carnivore, Herbivore, and Piscivore all-of chain. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Omnivore acquisition produces its source-defined effect in play. Attempt acquisition with zero, one, two, and all required diets.

**Acceptance conditions.** All three prerequisites are required and their combined effect is correct.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-059D. Complete Vegan

- [ ] Complete YCCE-059D and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-059.

**Components.** Canonical Vegan record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve the Herbivore rank gate and loss of alternative food routes. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Vegan acquisition produces its source-defined effect in play. Collect every source type before and after acquisition.

**Acceptance conditions.** Forbidden diet routes and source rewards follow canonical rules.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-059E. Complete Scavenger

- [ ] Complete YCCE-059E and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Scavenger record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Resolve Carrion naming and preserve progress from animals the player did not kill. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Scavenger acquisition produces its source-defined effect in play. Collect owner, bot, ally, and another human kill rewards.

**Acceptance conditions.** Canonical aliases cannot double rewards and provenance remains accurate.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-060. Complete Chonky

- [ ] Complete YCCE-060 and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Chonky record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve size and physical gains. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Chonky acquisition produces its source-defined effect in play. Compare collider, mass, visuals, and physical hits at several ranks.

**Acceptance conditions.** Growth changes the shared authoritative size model.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-060A. Complete Muscular Tissue

- [ ] Complete YCCE-060A and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Muscular Tissue record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Reuse the implementation from YCCE-025A. Complete its remaining source, graph, cross-system, and presentation obligations without a parallel handler. Preserve physical scaling across all verified ranks and rarities. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Muscular Tissue acquisition produces its source-defined effect in play. Compare physical attacks with unaffected ability attacks.

**Acceptance conditions.** Only the source-defined stats change.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-060B. Complete More Mass

- [ ] Complete YCCE-060B and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical More Mass record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve size, physical, and hull changes with verified formulas. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal More Mass acquisition produces its source-defined effect in play. Grow near walls and compare maximum and current hull policy.

**Acceptance conditions.** No collider replacement duplicate hit or accidental healing occurs.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-060C. Complete Elusive

- [ ] Complete YCCE-060C and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Elusive record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve smaller size and dodge. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Elusive acquisition produces its source-defined effect in play. Compare hit geometry and seeded eligible-hit avoidance.

**Acceptance conditions.** Environmental harm does not gain an unintended dodge path.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-060D. Complete Smol

- [ ] Complete YCCE-060D and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Smol record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve speed, smaller size, and affinity tradeoffs. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Smol acquisition produces its source-defined effect in play. Compare movement, collision gaps, and affinity bookkeeping.

**Acceptance conditions.** Negative size modifiers use the actual canonical scale.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-060E. Complete Overwhelm

- [ ] Complete YCCE-060E and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Overwhelm record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve offense based on active plating. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Overwhelm acquisition produces its source-defined effect in play. Attack with full, partial, empty, and refilled plating.

**Acceptance conditions.** Current plating is not substituted with maximum plating.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-060F. Complete Agile

- [ ] Complete YCCE-060F and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Agile record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve dodge and reduced attack movement slowdown. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Agile acquisition produces its source-defined effect in play. Move while attacking with several windup and recovery lengths.

**Acceptance conditions.** The modifier does not remove unrelated root or stun effects.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-060G. Complete Dexterous

- [ ] Complete YCCE-060G and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Dexterous record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve ability and cooldown benefits. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Dexterous acquisition produces its source-defined effect in play. Compare ability damage and repeated action timing.

**Acceptance conditions.** Unequip and recompute cannot duplicate its benefit.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-060H. Complete Robust

- [ ] Complete YCCE-060H and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-060, YCCE-060D.

**Components.** Canonical Robust record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve maximum-HP scaling with size. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Robust acquisition produces its source-defined effect in play. Combine growth and shrinkage in different acquisition orders.

**Acceptance conditions.** Equivalent final builds produce equivalent final stats.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-061. Complete Plated

- [ ] Complete YCCE-061 and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Plated record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Reuse the implementation from YCCE-025C. Complete its remaining source, graph, cross-system, and presentation obligations without a parallel handler. Preserve plating growth and source refill behavior. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Plated acquisition produces its source-defined effect in play. Absorb hits, gain a level, and compare plating once.

**Acceptance conditions.** One level refills exactly once even with multiple pending prompts.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-061A. Complete Scales

- [ ] Complete YCCE-061A and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Scales record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve resistance, heat adaptation, Basking, and Hard. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Scales acquisition produces its source-defined effect in play. Compare heat exposure and both specialization effects.

**Acceptance conditions.** Hull-material exclusions and thermal distinctions remain correct.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-061B. Complete Carapace

- [ ] Complete YCCE-061B and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Carapace record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve resistance and plating and unlock defensive movement. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Carapace acquisition produces its source-defined effect in play. Compare incoming channels and Turtle Down eligibility.

**Acceptance conditions.** Canonical exclusions apply at acquisition.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-061C. Complete Shell

- [ ] Complete YCCE-061C and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Shell record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve its source defense behavior and movement unlock. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Shell acquisition produces its source-defined effect in play. Compare the relevant hit channels and size interactions.

**Acceptance conditions.** It remains mechanically distinct from Carapace and Plated.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-061D. Complete Spines

- [ ] Complete YCCE-061D and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Spines record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve contact retaliation and Poisonous and Detachable specializations. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Spines acquisition produces its source-defined effect in play. Compare eligible contacts, status application, and detached behavior.

**Acceptance conditions.** Reflected effects have bounded causality and correct ownership.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-061E. Complete Exoskeleton

- [ ] Complete YCCE-061E and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Exoskeleton record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Resolve pool classification and preserve plating, command, and Moulting access. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Exoskeleton acquisition produces its source-defined effect in play. Acquire through the correct pool and compare competing materials.

**Acceptance conditions.** An old branching tag does not override canonical evidence.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-061F. Complete Shifty

- [ ] Complete YCCE-061F and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-060D.

**Components.** Canonical Shifty record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve small-size dodge and damage scaling. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Shifty acquisition produces its source-defined effect in play. Compare negative, neutral, and positive size modifiers.

**Acceptance conditions.** The source formula handles boundaries without overflow.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-061G. Complete Impervious

- [ ] Complete YCCE-061G and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Impervious record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve immediate and delayed portions of incoming damage. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Impervious acquisition produces its source-defined effect in play. Take lethal and nonlethal hits, heal, select, and disconnect before delay expiry.

**Acceptance conditions.** Delayed harm resolves once and can eliminate correctly.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-061H. Complete Regenerative Tissue

- [ ] Complete YCCE-061H and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Regenerative Tissue record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve regeneration and verified repair-food interactions. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Regenerative Tissue acquisition produces its source-defined effect in play. Recover at partial and full hull and inspect healing events.

**Acceptance conditions.** Attempted healing is distinct from actual healing.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-061I. Complete Fibroblasts

- [ ] Complete YCCE-061I and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Fibroblasts record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve permanent maximum HP after actual healing thresholds. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Fibroblasts acquisition produces its source-defined effect in play. Heal below, across, and above thresholds including overheal.

**Acceptance conditions.** Only actual eligible recovery advances its counter.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-061J. Complete Immune System

- [ ] Complete YCCE-061J and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Immune System record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve verified poison resistance behavior. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Immune System acquisition produces its source-defined effect in play. Apply several corrosion sources and compatible specialized effects.

**Acceptance conditions.** Resistance modifies the right channels without stopping boundary harm.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-061K. Complete Turtle Down

- [ ] Complete YCCE-061K and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-061B.

**Components.** Canonical Turtle Down record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Resolve Hide identity and implement timed protection and contact-block stun. Complete Reinforced and Spiked. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Turtle Down acquisition produces its source-defined effect in play. Block early, correctly, and late, then repeat against bots and humans.

**Acceptance conditions.** No duplicate Hide option and no boundary immunity exist.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-061L. Complete Resistant identity

- [ ] Complete YCCE-061L and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical source record, graph rules, effect binding where applicable, and presentation.

**Work.** Resolve the legacy Resistant record against the 1.2.1 inventory. If distinct and applicable, implement its complete behavior and graph. Otherwise record its alias or unused status with individual evidence for review. Do not invent a generic resistance bonus.

**Observable outcome.** The source identity has an auditable disposition and any distinct applicable behavior is available through the legal graph.

**Acceptance conditions.** No unresolved legacy candidate disappears or becomes an invented generic upgrade. No duplicate alias is selectable.

**Verification steps.** At the assigned checkpoint, compare the versioned identity and all implemented effects with source evidence through Match behavior and the browser.

**Evidence required.** Source identity disposition, graph and behavior results where applicable, and user review of any omission.

### YCCE-061M. Complete Hyperkeratosis identity

- [ ] Complete YCCE-061M and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical source record, graph rules, effect binding where applicable, and presentation.

**Work.** Resolve Hyperkeratosis against the 1.2.1 inventory. If distinct and applicable, implement its complete behavior and graph. Otherwise record its alias or unused status with individual evidence for review. Do not infer a plating effect from its name.

**Observable outcome.** The source identity has an auditable disposition and any distinct applicable behavior is available through the legal graph.

**Acceptance conditions.** No unresolved legacy candidate disappears or becomes an invented generic upgrade. No duplicate alias is selectable.

**Verification steps.** At the assigned checkpoint, compare the versioned identity and all implemented effects with source evidence through Match behavior and the browser.

**Evidence required.** Source identity disposition, graph and behavior results where applicable, and user review of any omission.

### YCCE-062. Complete More Eyes

- [ ] Complete YCCE-062 and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical More Eyes record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve senses and dodge and the Tracker rank gate. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal More Eyes acquisition produces its source-defined effect in play. Compare night observation and acquisition before and after the required rank.

**Acceptance conditions.** Visual settings do not change actual revealed information.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-062A. Complete Antennae

- [ ] Complete YCCE-062A and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-052E.

**Components.** Canonical Antennae record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve sensing, command, and its unique personal-risk contribution. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Antennae acquisition produces its source-defined effect in play. Compare detection, allied behavior, and repeated rank bookkeeping.

**Acceptance conditions.** Risk counts once unless a documented specialization grants more.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-062B. Complete Cortex

- [ ] Complete YCCE-062B and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Cortex record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve ability growth and Synapse rank unlock. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Cortex acquisition produces its source-defined effect in play. Compare ability attacks and inspect Synapse before and after the rank gate.

**Acceptance conditions.** A missing CSV prerequisite cannot remove the actual gate.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-062C. Complete Synapse

- [ ] Complete YCCE-062C and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-062B.

**Components.** Canonical Synapse record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve source cooldown reduction. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Synapse acquisition produces its source-defined effect in play. Compare action and ultimate cooldowns at cap and intermediate values.

**Acceptance conditions.** Cooldown limits remain valid and cannot become negative.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-062D. Complete Snout

- [ ] Complete YCCE-062D and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Snout record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve firmware indicators, senses, Whiskers, and Toxic Sequestration. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Snout acquisition produces its source-defined effect in play. Scan unknown modules and compare both specialized effects.

**Acceptance conditions.** Knowledge remains per player and mouth exclusions hold.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-062E. Complete Tracker

- [ ] Complete YCCE-062E and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-062.

**Components.** Canonical Tracker record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve elite marks, reward effects, and alternative prerequisites. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Tracker acquisition produces its source-defined effect in play. Acquire via More Eyes and Snout and collect a marked elite reward.

**Acceptance conditions.** Tracking affects actual source reward and targeting mechanics.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-062F. Complete Ambush

- [ ] Complete YCCE-062F and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Ambush record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve the temporary offense after leaving shelter. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Ambush acquisition produces its source-defined effect in play. Enter and leave map shelter, attack inside and outside its effect window.

**Acceptance conditions.** Entry and exit cannot refresh protection or bank damage.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-062G. Complete Detachable Tail

- [ ] Complete YCCE-062G and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-052E.

**Components.** Canonical Detachable Tail record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve damage or dodge triggers, decoy duration, and cooldown. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Detachable Tail acquisition produces its source-defined effect in play. Trigger against bots and humans while observing bot retargeting.

**Acceptance conditions.** It never forces human controls and respects Stinger exclusion.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-063. Complete Fungoid

- [ ] Complete YCCE-063 and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Fungoid record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Generate firmware and implement verified Cordyceps and Ejection behavior. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Fungoid acquisition produces its source-defined effect in play. Observe intervals, generation limits, both specializations, and item identity.

**Acceptance conditions.** It produces the mushroom-equivalent system rather than generic XP scrap.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-063A. Complete Poisonous Saliva

- [ ] Complete YCCE-063A and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-058B, YCCE-054A.

**Components.** Canonical Poisonous Saliva record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve the Saliva plus compatible-weapon all-of and any-of chain. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Poisonous Saliva acquisition produces its source-defined effect in play. Apply every compatible and incompatible manual attack to the same target.

**Acceptance conditions.** Only the verified weapon impacts receive the coating.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-063B. Complete Revenge

- [ ] Complete YCCE-063B and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Revenge record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve temporary physical and ability boosts after eligible damage. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Revenge acquisition produces its source-defined effect in play. Take repeated hits, miss the trigger conditions, and wait for expiry.

**Acceptance conditions.** Refresh and stacking follow source rules without permanent accumulation.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-063C. Complete Poisonous Spores

- [ ] Complete YCCE-063C and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-063.

**Components.** Canonical Poisonous Spores record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve the Fungoid-gated damage reaction and nearby poison. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Poisonous Spores acquisition produces its source-defined effect in play. Take damage with targets inside and outside the effect area.

**Acceptance conditions.** A reaction cannot recursively create an unbounded trigger chain.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-063D. Complete Virulent

- [ ] Complete YCCE-063D and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-063A.

**Components.** Canonical Virulent record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve poison growth and Neurotoxin and Metabolisation. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Virulent acquisition produces its source-defined effect in play. Compare each prerequisite route and both specialized status effects.

**Acceptance conditions.** Stacking, resistance, and tick attribution follow canonical formulas.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-063E. Complete Pedal Glands

- [ ] Complete YCCE-063E and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-052C.

**Components.** Canonical Pedal Glands record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve chased-state trails, terrain benefits, Thick, and Nemertide. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Pedal Glands acquisition produces its source-defined effect in play. Run pursued and unpursued routes and vary target slowdown.

**Acceptance conditions.** Trail control and corrosion stop during owner protection.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-064. Complete Alpha

- [ ] Complete YCCE-064 and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Alpha record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve command, size, hull, affinity, and Pack access. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Alpha acquisition produces its source-defined effect in play. Acquire the branch and compare ally and owner stats.

**Acceptance conditions.** Its source branch classification and rank behavior are preserved.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-064A. Complete Pack

- [ ] Complete YCCE-064A and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-064.

**Components.** Canonical Pack record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve player and ally attack scaling from charmed ally counts. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Pack acquisition produces its source-defined effect in play. Compare zero, one, capped, summoned, and charmed populations.

**Acceptance conditions.** Only the source-defined ally categories count.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-064B. Complete Tail Wag

- [ ] Complete YCCE-064B and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-052E.

**Components.** Canonical Tail Wag record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve periodic automatic charm attempts. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Tail Wag acquisition produces its source-defined effect in play. Compare eligible targets, range, capacity, and timer behavior during selection.

**Acceptance conditions.** No human conversion or banked offensive burst occurs.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-064C. Complete Whining

- [ ] Complete YCCE-064C and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Whining record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve charm attempts after eligible incoming hits. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Whining acquisition produces its source-defined effect in play. Take damage near eligible bots and while at ally capacity.

**Acceptance conditions.** One damage event creates only the allowed attempt sequence.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-064D. Complete Courting Display

- [ ] Complete YCCE-064D and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Courting Display record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Resolve Courting naming and preserve the manual capture ultimate. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Courting Display acquisition produces its source-defined effect in play. Use Q on eligible bots, humans, occupied allies, and out-of-range targets.

**Acceptance conditions.** Ownership transfer and cooldown happen atomically.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-064E. Complete Spinnerets

- [ ] Complete YCCE-064E and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Spinnerets record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve web slow, stunned-target interactions, Trap, and Egg Sac. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Spinnerets acquisition produces its source-defined effect in play. Test central control and delayed offspring under normal expiry and owner death.

**Acceptance conditions.** Summoned offspring use their separate cap and source inheritance.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-064F. Complete Jet

- [ ] Complete YCCE-064F and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-052A, YCCE-063E, YCCE-064E.

**Components.** Canonical Jet record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve Tentacles plus secretion prerequisites and deploy the acquired field while moving. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Jet acquisition produces its source-defined effect in play. Acquire through both legal secretion alternatives and compare emitted effects.

**Acceptance conditions.** No placeholder trail substitutes for Pedal Glands or Spinnerets behavior.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-065. Complete Hump

- [ ] Complete YCCE-065 and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Hump record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve permanent max HP from repair pickups eaten at full hull. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Hump acquisition produces its source-defined effect in play. Consume repair pickups at full hull, one point below full, and while protected.

**Acceptance conditions.** Only the source-defined consumption condition grants growth.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-065A. Complete Fur

- [ ] Complete YCCE-065A and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Fur record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve resistance, cold adaptation, Snow Dive, and Wool. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Fur acquisition produces its source-defined effect in play. Compare cold exposure and both specialization effects.

**Acceptance conditions.** Thermal protection remains distinct from terrain movement.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-065B. Complete Nomadic

- [ ] Complete YCCE-065B and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Nomadic record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve progress from first POI discovery. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Nomadic acquisition produces its source-defined effect in play. Discover, revisit, and inspect a POI claimed by another player.

**Acceptance conditions.** Discovery does not require winning the reward claim.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-065C. Complete Diurnal

- [ ] Complete YCCE-065C and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Diurnal record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve daytime offense and source phase-duration changes. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Diurnal acquisition produces its source-defined effect in play. Compare attacks on both sides of a phase transition.

**Acceptance conditions.** Clock changes synchronize without resetting match or finale time.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-065D. Complete Nocturnal

- [ ] Complete YCCE-065D and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Nocturnal record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve nighttime offense, senses, and verified phase behavior. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Nocturnal acquisition produces its source-defined effect in play. Compare revealed information and hits across night transitions.

**Acceptance conditions.** Brighter rendering cannot expand the permitted view.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-065E. Complete Hibernation

- [ ] Complete YCCE-065E and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-065A.

**Components.** Canonical Hibernation record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve Fur-gated passive progress while actually inside shelter. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Hibernation acquisition produces its source-defined effect in play. Enter, gain progress, exit, and remain disconnected through forced exit.

**Acceptance conditions.** No progress outside valid shelter and no infinite protection chain.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-065F. Complete Pollinator

- [ ] Complete YCCE-065F and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Pollinator record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve exploration-triggered vegetation and random source bonuses. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Pollinator acquisition produces its source-defined effect in play. Discover new and old POIs and inspect resource and bonus events.

**Acceptance conditions.** Each eligible event occurs once with server-owned RNG.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-065G. Complete Subcutaneous Fat

- [ ] Complete YCCE-065G and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical source record, graph rules, effect binding where applicable, and presentation.

**Work.** Resolve Fat versus Subcutaneous Fat, including source ID 1020. Implement thermal adaptation and maximum HP with all supported rank and rarity values. Keep thermal and terrain adaptation distinct.

**Observable outcome.** The source identity has an auditable disposition and any distinct applicable behavior is available through the legal graph.

**Acceptance conditions.** No unresolved legacy candidate disappears or becomes an invented generic upgrade. No duplicate alias is selectable.

**Verification steps.** At the assigned checkpoint, compare the versioned identity and all implemented effects with source evidence through Match behavior and the browser.

**Evidence required.** Source identity disposition, graph and behavior results where applicable, and user review of any omission.

### YCCE-066. Complete Sharpen

- [ ] Complete YCCE-066 and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Sharpen record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve temporary contact-attack scaling with the relevant affinity. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Sharpen acquisition produces its source-defined effect in play. Compare qualifying and nonqualifying attacks at several affinity totals.

**Acceptance conditions.** Duration and scaling do not permanently alter base damage.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-066A. Complete Pistol Pincer

- [ ] Complete YCCE-066A and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-053B.

**Components.** Canonical Pistol Pincer record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve stronger physical-or-ability selection, large hit, and impulse. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Pistol Pincer acquisition produces its source-defined effect in play. Swap which offensive stat is stronger and strike different masses.

**Acceptance conditions.** Pincers prerequisite and personal-risk counting remain correct.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-066B. Complete Constriction

- [ ] Complete YCCE-066B and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-052C.

**Components.** Canonical Constriction record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve stationary area damage and control. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Constriction acquisition produces its source-defined effect in play. Attack while channeling, then move, become stunned, and enter protection.

**Acceptance conditions.** Movement cancels where required while ordinary attacks do not.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-066C. Complete Moulting

- [ ] Complete YCCE-066C and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-061E.

**Components.** Canonical Moulting record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve self-stun and source bonuses tied to personal risk. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Moulting acquisition produces its source-defined effect in play. Activate at several risk levels and during weather and contact pressure.

**Acceptance conditions.** It cannot remove the agreed personal vulnerability or boundary consequences.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-066D. Complete Burrower

- [ ] Complete YCCE-066D and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Burrower record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Create finite usable shelter with source costs and cooldown. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Burrower acquisition produces its source-defined effect in play. Place near obstacles, occupied shelters, and the final boundary.

**Acceptance conditions.** Placement failure is useful and created shelter follows shared immunity limits.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-066E. Complete Lick Wounds

- [ ] Complete YCCE-066E and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051, YCCE-058B.

**Components.** Canonical Lick Wounds record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve active recovery, salvage-speed scaling, and hit-based cooldown changes. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Lick Wounds acquisition produces its source-defined effect in play. Heal at full and partial hull and take qualifying hits during cooldown.

**Acceptance conditions.** Actual recovery and cooldown changes occur once per valid event.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-067. Complete Outlier

- [ ] Complete YCCE-067 and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Outlier record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve the source random legendary acquisition and eligibility behavior. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Outlier acquisition produces its source-defined effect in play. Trigger with ordinary, restricted, maxed, and depleted candidate sets.

**Acceptance conditions.** It cannot grant a banned or unsupported ability.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-067A. Complete Convergent Evolution

- [ ] Complete YCCE-067A and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Convergent Evolution record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve highest-affinity and personal-risk offer effects. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Convergent Evolution acquisition produces its source-defined effect in play. Compare tied highest affinities and seeded weighted offers.

**Acceptance conditions.** It is not replaced by an unexplained flat stat bonus.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-067B. Complete Aggressive

- [ ] Complete YCCE-067B and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Aggressive record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Resolve current eligibility and preserve applicable source physical growth. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Aggressive acquisition produces its source-defined effect in play. Compare its verified gate, repeat behavior, and physical hits.

**Acceptance conditions.** A genuinely inapplicable disposition requires individual reviewed evidence.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-067C. Complete Cunning

- [ ] Complete YCCE-067C and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Cunning record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Resolve current eligibility and preserve applicable source ability growth. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Cunning acquisition produces its source-defined effect in play. Compare its verified gate, repeat behavior, and ability hits.

**Acceptance conditions.** An old endless label alone cannot justify removing it.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-067D. Complete Sturdy

- [ ] Complete YCCE-067D and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Sturdy record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Resolve current eligibility and preserve applicable source hull growth. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Sturdy acquisition produces its source-defined effect in play. Compare hull policy and repeated acquisition at the verified gate.

**Acceptance conditions.** Repeat behavior cannot overflow or accidentally revive.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-067E. Complete Commanding

- [ ] Complete YCCE-067E and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Commanding record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Resolve current eligibility and preserve applicable ally damage growth. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Commanding acquisition produces its source-defined effect in play. Compare charmed and summoned ally categories and repeated acquisitions.

**Acceptance conditions.** Only source-defined allies receive the intended effect.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-067F. Complete Resourceful

- [ ] Complete YCCE-067F and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Resourceful record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Resolve current eligibility and preserve applicable resource progress growth. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Resourceful acquisition produces its source-defined effect in play. Collect each source type before and after its verified gate.

**Acceptance conditions.** No doubled stage consumption or unbounded progress loop occurs.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-067G. Complete Extremophile

- [ ] Complete YCCE-067G and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Extremophile record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve source catastrophe resistance at the adapted finale milestone. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Extremophile acquisition produces its source-defined effect in play. Compare meteor damage before and after acquisition.

**Acceptance conditions.** Meteor defense remains useful while boundary collapse stays lethal.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-067H. Complete Strength in Numbers

- [ ] Complete YCCE-067H and record user review.

**Depends on.** YCCE-047, YCCE-048, YCCE-049, YCCE-050, YCCE-051.

**Components.** Canonical Strength in Numbers record, dedicated effect binding, graph rules, safe description, visual feedback, and scenarios.

**Work.** Preserve source late-match resistance from the correct ally count. Complete every verified rank, rarity, prerequisite, exclusion, and specialization under the content completion rule.

**Observable outcome.** A legal Strength in Numbers acquisition produces its source-defined effect in play. Compare damage with zero, charmed, summoned, and capped allies.

**Acceptance conditions.** Persistent finale bots support the build and resistance cannot defeat collapse.

**Verification steps.** Run the stated scenario through the actual Match and browser. Compare rank and rarity values with the source record. Check legal acquisition, invalid acquisition, and relevant protection or ownership interactions.

**Evidence required.** Per-ability source comparison, behavior checks, graph results, and a screenshot or short recording of the meaningful effect.

### YCCE-068. Verify complete build paths and cross-system combinations

- [ ] Complete YCCE-068 and record user review.

**Depends on.** YCCE-052 through YCCE-067.

**Components.** Integration scenarios, source comparison records, and catalogue coverage.

**Work.** Prove Spit acquisition through Saliva and Tracker acquisition through Nomadic now that those later prerequisites are live. Exercise heavy contact, ranged ability, corrosion, command, trap and movement, salvage and diet, small evasive, and shelter or environment builds. Acquire them through legal progression, not only debug grants. Compare learned and equipped benefits, all specialization routes, and source deviations.

**Observable outcome.** Complete builds work together in the actual game and remain useful during the final area.

**Acceptance conditions.** No graph dead end, missing handler, rank-cap offer, hidden prerequisite, or modifier duplication. Every specialization has an exercised branch and skip case. Shared effects obey attribution and choice suppression.

**Verification steps.** Run the integration matrix with fixed seeds, then representative live multiplayer encounters. Recheck newly discovered combinations that share affected handlers.

**Evidence required.** Build-route recordings, integration matrix, and a list of resolved versus remaining defects.

## Phase 6. Finish game presentation and player understanding

### YCCE-069. Finish craft models and visible build growth

- [ ] Complete YCCE-069 and record user review.

**Depends on.** YCCE-051, YCCE-068.

**Components.** Original craft models, attachment assets, animations, materials, and icon set.

**Work.** Replace temporary craft art with coherent modular low-poly assets. Make hull growth, propulsion, weapons, shields, sensors, and command modules distinguishable. Cover supported sizes and specializations without obscuring aim or hit geometry.

**Observable outcome.** A weak starting hovercraft becomes a recognizable build during a match.

**Acceptance conditions.** Production visuals have no missing modules or placeholder labels. Every asset has provenance. Model detail stays inside the measured client budget.

**Verification steps.** Capture early and late builds, crowded combat, minimum and maximum sizes, and both quality presets.

**Evidence required.** Asset inventory, build comparison images, animation video, and render-cost assessment.

### YCCE-070. Finish biome, bot, resource, and POI assets

- [ ] Complete YCCE-070 and record user review.

**Depends on.** YCCE-034 through YCCE-046, YCCE-069.

**Components.** Terrain materials, bot families and tiers, obstacles, shelter, resources, firmware appearances, and terminals.

**Work.** Make each biome and mechanical role visually distinct. Show bot tier, elite status, attack tells, resource rarity and source, salvage progress, shelter exits, POI availability, and unknown firmware without exposing its effect.

**Observable outcome.** Players can identify route opportunities and threats at the normal camera distance.

**Acceptance conditions.** Decorations agree with collisions. Visual similarity cannot reveal a supposedly unknown firmware effect. Resource types and healing do not depend on color alone. No copied source-game art is included.

**Verification steps.** Inspect every asset role during day, night, weather, and a crowded finale.

**Evidence required.** Asset-role checklist, scene captures, provenance, and visibility findings.

### YCCE-071. Finish combat and world visual feedback

- [ ] Complete YCCE-071 and record user review.

**Depends on.** YCCE-068, YCCE-069, YCCE-070.

**Components.** Windup, impact, projectile, field, weather, salvage, and warning visuals.

**Work.** Make hits, dodge, plating break, healing, statuses, resources, rewards, meteors, and boundary danger readable. Budget particles and retain required cues in low effects and reduced motion.

**Observable outcome.** Players can distinguish successful actions and imminent danger in dense motion.

**Acceptance conditions.** Feedback follows authoritative events and does not expose hidden entities.

**Verification steps.** Record dense day and night combat, reduced motion, and a finale with maximum effects.

**Evidence required.** Event-to-feedback checklist, video, and render-cost assessment.

### YCCE-071A. Finish local audio, mixer, and audible warnings

- [ ] Complete YCCE-071A and record user review.

**Depends on.** YCCE-071.

**Components.** Local sound assets, audio unlock, volume mixer, voice limits, and event filtering.

**Work.** Add original action, impact, resource, weather, choice, and danger sounds. Resume audio after a user gesture and cap overlapping voices. Preserve silent-play equivalents.

**Observable outcome.** The browser plays useful synchronized audio after interaction.

**Acceptance conditions.** No remote sound dependency, hidden-opponent leak, or unbounded audio instances.

**Verification steps.** Test first gesture, muted play, many overlapping effects, tab changes, and match reset.

**Evidence required.** Audio recording, local request log, provenance, and voice-count observations.

### YCCE-072. Finish the title, lobby, loading, and results design

- [ ] Complete YCCE-072 and record user review.

**Depends on.** YCCE-016, YCCE-017, YCCE-018, YCCE-032, YCCE-069.

**Components.** Menu layouts, original constellation title graphic, local typography, transitions, and error states.

**Work.** Apply `DESIGN.md` consistently. Use a hovercraft-shaped outlined triangle constellation as title imagery. Finish asymmetric black layouts, giant weight-400 display text, light body text, one violet primary action, ghost actions, amber warnings, and reduced-motion presentation.

**Observable outcome.** The full menu journey has the agreed visual identity and useful loading or failure states.

**Acceptance conditions.** No filled dashboard cards, large violet panels, UI gradients, or hero screenshots replace the reference. The title wraps at laptop resolution. Starting rules and results remain accurate.

**Verification steps.** Drive the complete menu journey, including unavailable server, full lobby, failed load, draw, and server loss.

**Evidence required.** Viewport screenshot set, journey video, and comparison against `DESIGN.md`.

### YCCE-073. Finish combat HUD and upgrade offers

- [ ] Complete YCCE-073 and record user review.

**Depends on.** YCCE-031, YCCE-068, YCCE-071A.

**Components.** HUD, progress, statuses, offers, countdown, minimap, and boundary warning.

**Work.** Finish all combat information and three-option choice content. Show rank, rarity, affinity, prerequisites, exclusions, costs, and new-versus-existing state with readable gameplay text.

**Observable outcome.** Players understand combat state and upgrade choices at laptop resolution.

**Acceptance conditions.** Warnings remain visible during selection and long descriptions do not overflow.

**Verification steps.** Drive every offer class and status under crowded day and night scenes.

**Evidence required.** HUD and offer screenshot set and timed choice recording.

### YCCE-073A. Finish equipment and specialization interfaces

- [ ] Complete YCCE-073A and record user review.

**Depends on.** YCCE-048, YCCE-050A, YCCE-073.

**Components.** Slot replacement, specialization, skip, rejection, and queue interfaces.

**Work.** Explain active-slot consequences, retained learned benefits, specialization effects, skip rewards, and authoritative countdown. Keep keyboard and mouse selection consistent.

**Observable outcome.** Players can finish every equipment or specialization prompt without confusion.

**Acceptance conditions.** No false promise of cooldown reset, paused time, or a new protection window.

**Verification steps.** Replace occupied slots, skip a specialization, expire prompts, and retry stale revisions.

**Evidence required.** Interaction checklist and short prompt recordings.

### YCCE-073B. Finish POI reward and claim interfaces

- [ ] Complete YCCE-073B and record user review.

**Depends on.** YCCE-041B, YCCE-044B, YCCE-073.

**Components.** POI discovery, claim, costs, reservation, and reward UI.

**Work.** Show actual eligibility, costs, world claim state, reservation expiry, and consequences for each terminal choice. Distinguish discovery credit from reward ownership.

**Observable outcome.** A player understands and resolves a contested terminal.

**Acceptance conditions.** Authoritative errors recover and no unavailable reward appears selectable.

**Verification steps.** Race claims, lose eligibility, disconnect, and inspect every reward class.

**Evidence required.** POI screenshot set and contested-claim recording.

### YCCE-073C. Finish firmware and shelter interfaces

- [ ] Complete YCCE-073C and record user review.

**Depends on.** YCCE-042C, YCCE-043, YCCE-073.

**Components.** Unknown module, scanning, identified effect, shelter entry, occupancy, and exit UI.

**Work.** Show private knowledge correctly, explain risk, and expose finite shelter duration and forced exit. Retain boundary warnings during every interaction.

**Observable outcome.** Players can make informed firmware and retreat decisions without secret data.

**Acceptance conditions.** Unknown effects remain unknown and shelter never implies permanent safety.

**Verification steps.** Compare two players' knowledge and run shelter expiry and boundary scenarios.

**Evidence required.** Knowledge-scope screenshots and shelter interaction video.

### YCCE-074. Provide build inspection and first-match guidance

- [ ] Complete YCCE-074 and record user review.

**Depends on.** YCCE-068, YCCE-073.

**Components.** Controls help, current-build view, stat explanations, and concise match guidance.

**Work.** Explain movement and aim, manual attacks, salvage stages, upgrade selection, personal risk, biomes, firmware, shelter, elimination, and the final area. Show learned abilities, equipment, modifiers, and cooldowns accurately. Provide an in-match inspection view that grants no immunity or pause.

**Observable outcome.** A new player can join, understand the core loop, inspect a build, and finish a match.

**Acceptance conditions.** Product text uses hovercraft terminology and avoids implementation details. Guidance does not promise permanent unlocks, Splicing, respawns, teams, or save recovery. No mandatory lengthy tutorial blocks lobby readiness.

**Verification steps.** Observe a first-time player's journey and verify displayed totals against the server's safe projection.

**Evidence required.** Guidance review, stat comparisons, and recorded first-match comprehension findings.

### YCCE-075. Finish accessible presentation and local preferences

- [ ] Complete YCCE-075 and record user review.

**Depends on.** YCCE-039A, YCCE-071A, YCCE-072, YCCE-073C, YCCE-074.

**Components.** Settings, UI scale, reduced motion, contrast cues, quality, and local preference storage.

**Work.** Provide readable UI scaling, sound controls, reduced motion, keyboard menu focus, and laptop quality presets. Preserve required visual warnings without color or audio dependence.

**Observable outcome.** Players can adjust presentation and retain their preferences after reload.

**Acceptance conditions.** Quality and night brightness cannot change spotting or simulation. No power or secrets persist.

**Verification steps.** Reload preferences and compare low quality, muted, reduced-motion, and scaled interfaces.

**Evidence required.** Accessibility screenshots, preference checks, and visibility fairness comparison.

### YCCE-075A. Implement control rebinding and conflict recovery

- [ ] Complete YCCE-075A and record user review.

**Depends on.** YCCE-013, YCCE-075.

**Components.** Binding editor, conflict checks, reset, labels, and input persistence.

**Work.** Rebind every required keyboard and mouse action with conflict handling and reset. Update live prompts and clear old held inputs when bindings change.

**Observable outcome.** A player can use custom controls and recover the defaults.

**Acceptance conditions.** No required action becomes unreachable and typing in the editor cannot steer.

**Verification steps.** Rebind movement, mouse attacks, Space, Q, and E, reload, reset, and test focus loss.

**Evidence required.** Binding scenarios and browser recording.

## Phase 7. Prove delivery, fidelity, and full-match reliability

### YCCE-076. Resume vulnerable players after temporary connection loss

- [ ] Complete YCCE-076 and record user review.

**Depends on.** YCCE-007, YCCE-017, YCCE-027A, YCCE-029, YCCE-073C.

**Components.** Resume identity, fresh observation, input expiry, and stale action rejection.

**Work.** Reconnect to the same craft, current hull, build, life state, and deadlines. Replace stale interpolation and UI atomically. Reject duplicate controlling sessions and buffered old commands.

**Observable outcome.** A returning player resumes current reality without a new life or protection.

**Acceptance conditions.** Disconnected craft remains vulnerable. Dead players stay dead and choice deadlines continue.

**Verification steps.** Disconnect during combat, salvage, selection, shelter, and after elimination.

**Evidence required.** Recovery matrix, deduplication checks, and reconnect recording.

### YCCE-076A. Handle loading loss, finished matches, and host shutdown

- [ ] Complete YCCE-076A and record user review.

**Depends on.** YCCE-018, YCCE-032, YCCE-076.

**Components.** Retry UI, loading failure, result reconnect, abort, and fresh-server identity.

**Work.** Recover loading failures and reconnect to finished results. Show host loss clearly and start a new server session with fresh authority. Do not imply host migration or saved recovery.

**Observable outcome.** Every connection failure has a useful visible outcome.

**Acceptance conditions.** Old sessions cannot control new matches and shutdown never looks like a paused game.

**Verification steps.** Interrupt loading, finish while a client is absent, kill the host, and restart.

**Evidence required.** Failure-state matrix and shutdown and restart video.

### YCCE-077. Reject unauthorized gameplay commands

- [ ] Complete YCCE-077 and record user review.

**Depends on.** YCCE-007, YCCE-076A.

**Components.** Boundary schemas, authority checks, bounded message handling, and rate limits.

**Work.** Attempt forged positions, hits, damage, XP, currency, upgrades, ownership, purchases, slot changes, and revive commands. Reject stale and oversized traffic with bounded work.

**Observable outcome.** A modified client cannot invent gameplay outcomes.

**Acceptance conditions.** Legitimate clients remain responsive and useful errors reveal no secret state.

**Verification steps.** Run malicious and ordinary scenarios against the production build.

**Evidence required.** Authority rejection matrix, cost observations, and normal-play regression.

### YCCE-077A. Audit production bundles, packets, and spectator privacy

- [ ] Complete YCCE-077A and record user review.

**Depends on.** YCCE-006, YCCE-039A, YCCE-042C, YCCE-077.

**Components.** Public bundle boundary, snapshots, events, sounds, radar, and spectator projections.

**Work.** Inspect actual production chunks and traffic for private catalogue imports, firmware mapping, secret RNG, hidden targets, debug grants, and unauthorized event references.

**Observable outcome.** Only permitted information reaches each client.

**Acceptance conditions.** Negative assertions cover observations, events, reconnect, spectators, and stale client history.

**Verification steps.** Place hidden fixtures, change viewers, reconnect, and inspect production traffic and UI.

**Evidence required.** Bundle inspection and negative leakage report with browser evidence.

### YCCE-078. Verify cleanup and repeated match stability

- [ ] Complete YCCE-078 and record user review.

**Depends on.** YCCE-032, YCCE-045, YCCE-071, YCCE-076, YCCE-077.

**Components.** Match disposal, Rapier world release, entity lifecycle, Three.js resources, audio, timers, and subscriptions.

**Work.** Complete repeated match-to-lobby cycles without restarting the server or browsers. Dispose of old worlds, projectiles, fields, allies, choices, resources, labels, sounds, listeners, sockets, and interpolation buffers. Include abort and failed-loading cycles.

**Observable outcome.** Each new match starts cleanly and remains responsive across a long session.

**Acceptance conditions.** No previous match identity, reward, deadline, or hidden information survives. Memory and resource counts remain inside the soak budget after warmup. A rising trend requires investigation.

**Verification steps.** Run the cycle workload from YCCE-003, inspect resource counts and heaps, and perform another normal match afterward.

**Evidence required.** Cycle logs, memory and resource traces, cleanup assertions, and rematch recording.

### YCCE-079. Meet authoritative host simulation and workload budgets

- [ ] Complete YCCE-079 and record user review.

**Depends on.** YCCE-003, YCCE-035, YCCE-045, YCCE-068, YCCE-078.

**Components.** Host probes, AI cadence, spatial queries, entity caps, and deadline backlog.

**Work.** Measure the host also playing with four clients and maximum supported late-match populations. Diagnose and fix real simulation bottlenecks. Preserve source mechanics when choosing limits.

**Observable outcome.** The recorded host sustains the supported workload without growing tick backlog.

**Acceptance conditions.** Candidate 60 Hz rates require evidence. Collapse deadlines cannot stretch silently.

**Verification steps.** Read benchmark-checklist and run repeated fixed workloads before and after justified changes.

**Evidence required.** Raw samples, hardware, profiles, p95 step and deadline results, and four-client video.

### YCCE-079A. Meet client rendering and LAN response budgets

- [ ] Complete YCCE-079A and record user review.

**Depends on.** YCCE-014, YCCE-075A, YCCE-079.

**Components.** Client frame probes, network payloads, response timing, interpolation, and quality presets.

**Work.** Measure four real clients during the same supported late-match load. Diagnose rendering, serialization, bandwidth, and local response. Optimize only measured limits.

**Observable outcome.** The baseline laptop stays playable at low quality with responsive controls.

**Acceptance conditions.** Record frame and input percentiles, payload size, correction bounds, and sample limits. No unlike-workload ratio.

**Verification steps.** Repeat the recorded ordinary and adverse LAN profiles and dense scene probes.

**Evidence required.** Client traces, network samples, before/after comparisons, and visible gameplay recording.

### YCCE-080. Tune survival, progression, and final-area pacing

- [ ] Complete YCCE-080 and record user review.

**Depends on.** YCCE-030, YCCE-068, YCCE-079.

**Components.** HP and damage tuning, resource and XP curves, bot schedule, boundary and meteor schedule, and match telemetry.

**Work.** Run representative four-human matches. Measure match duration separately from time alive. Tune toward a 20-minute average and 28-minute desired upper duration while keeping early PvP and one-life consequences. Compare source final-boss timing evidence with the proposed finale schedule rather than assuming equality.

**Observable outcome.** Players usually develop meaningful builds before the final conflict, and the closing hazard resolves stalled matches.

**Acceptance conditions.** Preserve the graph and source mechanics while tuning. Do not solve early deaths with respawns or permanent protection. The schedule has a reviewed evidence-based result. Remaining misses need another tuning pass, not an unchecked completion box.

**Verification steps.** Use the match sample and duration rule from YCCE-003. Include cautious, aggressive, salvage, ally, and defensive play. Repeat extreme-stall and wall-clock-overload cases.

**Evidence required.** Duration distribution, death and progression timelines, tuning diffs, player observations, and collapse proof.

### YCCE-081. Balance build variety and contested opportunities

- [ ] Complete YCCE-081 and record user review.

**Depends on.** YCCE-068, YCCE-080.

**Components.** Build archetype matrix, spawn fairness, resource routes, POI rewards, personal risk, and PvP coefficients.

**Work.** Compare the major archetypes in normal and closing territory. Check that allies, shelter, weather resistance, scanning, scavenging, diets, movement, corrosion, and meteor defense remain useful. Address dominant exploits and unusable source adaptations with the smallest justified tuning changes.

**Observable outcome.** Players can pursue materially different viable builds rather than one mandatory route.

**Acceptance conditions.** No build wins by permanent immunity, infinitely repeated summons, free damage during choices, forced charm of humans, or duplicated resources. Do not claim statistical balance from a small playtest. Report observed limits and source deviations.

**Verification steps.** Run paired archetype scenarios on shared seeds and representative four-human matches. Inspect build availability and contested POI access by spawn.

**Evidence required.** Archetype outcomes, exploit regression results, fairness maps, and reviewed balance decisions.

### YCCE-082. Close catalogue, specialization, and requirement coverage

- [ ] Complete YCCE-082 and record user review.

**Depends on.** YCCE-002, YCCE-041, YCCE-052 through YCCE-081.

**Components.** Final content manifest, source crosswalk, requirement traceability, release validation, and omission record.

**Work.** Reconcile the production release with the full pinned source inventory. Resolve every applicable unresolved record and name-only specialization. Check each source behavior against its actual handler, visuals, graph path, and verification evidence. Check Appendix F's requirements against the built application.

**Observable outcome.** A reviewer can account for every applicable ability, specialization, and agreed product requirement.

**Acceptance conditions.** Zero selectable stubs, unowned entries, missing required subsystems, or unexplained omissions. Each deliberate omission has individual evidence and user approval. A large numerical count cannot substitute for coverage.

**Verification steps.** Run catalogue validators and the full relevant scenario suite. Spot-check sampled entries in the actual browser. Follow every omitted or unresolved record to its disposition.

**Evidence required.** Final coverage report, completed requirement matrix, individual omission approvals, and remaining issue list with no release blocker.

### YCCE-083. Package a self-contained offline LAN build

- [ ] Complete YCCE-083 and record user review.

**Depends on.** YCCE-075A, YCCE-076A, YCCE-077A, YCCE-078, YCCE-079A, YCCE-082.

**Components.** Production distribution, local assets, WASM, fonts, decoders, and notices.

**Work.** Package every runtime dependency locally. Keep internet-dependent preparation distinct from offline play. Record provenance and supported runtime versions.

**Observable outcome.** Four cold-cache clients load and play with internet access unavailable.

**Acceptance conditions.** No runtime CDN, cloud account, missing local asset, or development server dependency.

**Verification steps.** Start the production distribution and inspect every request across four LAN devices.

**Evidence required.** Package manifest, local request log, notices, and four-device capture.

### YCCE-083A. Rehearse installation and publish local host instructions

- [ ] Complete YCCE-083A and record user review.

**Depends on.** YCCE-083.

**Components.** README, host commands, requirements, controls, and LAN troubleshooting.

**Work.** Document clean preparation, Node version, start and stop, LAN URL, port conflicts, firewall, Wi-Fi isolation, supported hardware, and known limitations. Have another person follow the instructions.

**Observable outcome.** A new host can start and invite three players without developer intervention.

**Acceptance conditions.** Instructions match the delivered package and do not promise deferred recovery or modes.

**Verification steps.** Rehearse from a clean copy and follow each failure and troubleshooting path.

**Evidence required.** Clean-install transcript, reviewed instructions, and host and client screenshots.

### YCCE-084. Run the final acceptance walkthrough and deliver

- [ ] Complete YCCE-084 and record user review.

**Depends on.** Every preceding task and approved inserted task.

**Components.** Production release, final acceptance report, task receipts, and remaining limitations.

**Work.** Execute Appendix G against the exact production revision. Repair discovered failures and rerun affected checks. Confirm every completion box has evidence and user review. Deliver the runnable game, instructions, and final coverage report.

**Observable outcome.** Four people can play complete matches of You Can Crab Everything on LAN, with the full applicable source-derived progression and agreed presentation.

**Acceptance conditions.** Every mandatory walkthrough step passes. No release blocker, undisclosed content cut, stubbed upgrade, external runtime dependency, or missing evidence remains. Deferred features match Appendix D.

**Verification steps.** Run the walkthrough from a cold start, then a full match, reconnect, spectator transition, result, rematch, and host shutdown. Review source and requirement coverage directly.

**Evidence required.** Signed-off acceptance checklist, exact revision and package identity, full-match telemetry, representative recordings, and known-limits statement.

## Close the program

- [ ] Confirm all task boxes, including inserted tasks, have evidence and review acceptance.
- [ ] Confirm the release coverage gate passes without selectable stubs or unexplained omissions.
- [ ] Confirm the final walkthrough passes on the delivered production revision.
- [ ] Report the playable package, startup instructions, supported setup, remaining limitations, and deferred features.

## Appendix A. Prototype evidence and experiments still required

No application prototype or gameplay experiment ran during this planning turn. The architecture and UI concepts are proposals from the agreed chat design. No performance or pacing value below is a measured result.

| Question | Current assumption or proposal | Task that resolves it | Required observation and failure response |
|---|---|---|---|
| Source completeness and version | Pin 1.2.1. The existing CSV is an incomplete research authority. Its final unique playable count is unknown. | YCCE-001, YCCE-002, YCCE-082. | Reconcile independent inventories and every relationship. Expand assigned tasks for newly found applicable content. |
| Source final-boss trigger and timing | Predetermined progression is reported, but exact timestamps and time accounting remain unverified. | YCCE-001, YCCE-080. | Record versioned evidence or a clearly labeled approximation. Never call an assumed 18-minute trigger a source fact. |
| Hover handling | Prefer stable dynamic Rapier movement over decorative simulation complexity. | YCCE-011. | Compare the same obstacle and combat course under two models. Keep the measured stable option. |
| Local response | Start with interpolation. Add local prediction if the experiment justifies it. | YCCE-014. | Compare response and correction traces under recorded LAN conditions. Reject persistent divergence. |
| Selection protection | Ten seconds is the initial proposal. Follow-up offers cannot reset it. | YCCE-015, YCCE-027. | Stress XP, costs, specializations, allies, reconnect, and boundary. Choose a bounded exposed interval before queued windows. |
| Choice readability | Three open columns on black, with live warning and minimap. | YCCE-016, YCCE-073. | Test long content at 1366 by 768. Adjust composition, text, or timing if choices cannot be understood. |
| Damage formulas and source specialization effects | Several source tables and name-only records conflict or lack current values. | YCCE-002 and each content task. | Obtain per-record evidence or a reviewed explicit adaptation. A guessed generic bonus fails acceptance. |
| Carcinisation | Personal vulnerability against bots and players plus improved resource rarity. | YCCE-028, YCCE-080, YCCE-081. | Compare risk and reward. Resolve shared-resource ownership without buffing every player's loot or shared enemies. |
| Weather, spawn curves, and world fairness | Preserve source behavior types. Exact schedules need tuning. | YCCE-034 through YCCE-038, YCCE-081. | Inspect seeded routes, exposure, threat and rewards. Correct trapped or starved starts. |
| Finale timing | Start shrinking at 18 minutes, tiny at 25, full collapse by 28. | YCCE-030, YCCE-080. | Test normal and stall cases. Change this schedule if pacing evidence warrants it. Resolve through hazard, not score. |
| Simulation capacity | 60 Hz simulation and 20 Hz observations are initial candidates. | YCCE-003, YCCE-079. | Measure the host also playing with four clients and capped late-match entities. Adjust implementation and reviewed limits. |
| Build viability | Preserve wide source-derived variety through the finale. | YCCE-068, YCCE-081. | Exercise legal build paths and final-area encounters. Fix broken dependencies before changing content scope. |

Proposed starting measurement criteria follow. YCCE-003 must record the test hardware and confirm or revise these before measuring. They are acceptance proposals, not prior user requirements or performance claims.

- Target a 60 Hz simulation with a p95 step below 16.7 milliseconds at the recorded maximum workload. Require bounded backlog and no accumulated deadline drift.
- Target at least 30 rendered frames per second on the baseline client at low quality. Record frame-time percentiles and visible stalls, not only an average FPS counter.
- Target p95 observed local input response below 100 milliseconds under the recorded ordinary LAN profile. Record correction size and behavior under worse profiles separately.
- Keep deadline execution within 250 milliseconds of the authoritative wall clock under the supported workload. Verify catastrophic host loss as an abort, not a successful timed match.
- Use at least eight complete four-human matches for the initial pacing review. Report mean, median, range, elimination times, progression milestones, and sample limitations. A proposed first tuning band is an 18 to 22 minute mean, with hazard resolution by 28 minutes under the supported workload.
- Use at least five complete match-to-lobby cycles plus failure and abort cycles for cleanup review. Establish the warmup and resource-growth budget before the run.

## Appendix B. Alternatives rejected or deferred

| Alternative | Decision and consequence |
|---|---|
| Stop after a small vertical slice. | Rejected as the delivery definition. YCCE-032 proves a loop. It does not satisfy the full catalogue and world scope. |
| Treat the 112 CSV rows as the exact game catalogue. | Rejected. Mixed versions, aliases, missing relationships, and absent current names require reconciliation. |
| Use a full ECS or arbitrary upgrade scripting language. | Rejected for the initial architecture. One Match owns private tables and finite typed handlers. Revisit only with demonstrated maintenance evidence. |
| Let clients calculate damage or submit positions. | Rejected. Clients submit intents. The host decides physical and gameplay outcomes. |
| Pause the world for a choice. | Rejected. Only the choosing player gets bounded protection with explicit restrictions. |
| Disable passive XP to prevent protection chaining. | Rejected. Preserve passive builds and bound selection windows instead. |
| Remove bots during the finale. | Rejected. Allies, charm, scavenging, and kill builds retain their supporting targets. |
| Endless respawns or a score winner. | Rejected for this version. One life and last human alive define the match. Simultaneous final death is a draw. |
| Add starting modifier choice or Splicing now. | Deferred. Everyone uses Standard with +15 maximum HP. Introduce Splicing only after a working game, outside this plan. |
| Add online matchmaking, accounts, teams, mobile, gamepad, host migration, saved runs, or endless mode. | Deferred. Desktop keyboard and mouse, offline LAN, one host process, and four-player FFA define delivery. |
| Use source-game art or a literal Dala clone. | Rejected. Use original hovercraft assets and branding. Apply the user's Dala-inspired UI reference with explicit gameplay readability exceptions. |

## Appendix C. Risks and unresolved decisions

No unanswered product preference blocks writing this plan. The user delegated reasonable defaults. The following empirical and source questions must close in their assigned tasks.

| Risk or unresolved decision | Owner | Default and completion rule |
|---|---|---|
| No publicly verified complete versioned CSV found. | YCCE-002. | Build an auditable canonical catalogue from the fuller references in Appendix H. Do not claim a total yet. |
| Wiki and Neoseeker direct fetches return 403 in the current research tool. | YCCE-002. | Indexed excerpts establish useful records, not a full extraction. Seek accessible versioned sources or lawful direct observations. Mark unverified fields honestly. |
| Hide versus Turtle Down and other legacy aliases. | YCCE-002, YCCE-057. | Reconcile IDs and behavior before creating distinct abilities. Turtle Down has Hide-prefixed specialization fields, which supports an alias hypothesis but does not prove every old Hide record is identical. |
| An ability is expensive or incompatible. | Its content task, YCCE-082. | Keep it in scope until an individual reviewed disposition permits removal. Add supporting work when feasible. |
| Exact source coefficients or specialization effects remain unavailable. | YCCE-002 and the relevant content task. | Research reasonable alternatives, then implement and record a reasoned estimate under Appendix I. Do not wait for user approval or exact source data. |
| Frequent levels make protection dominate play. | YCCE-015, YCCE-027, YCCE-080. | Fixed deadlines, queued unseen prompts, an exposed interval, and no offensive benefit. Tune against actual passive builds. |
| Personal rarity modifiers interact with shared salvage. | YCCE-028. | Prefer a server-owned first-claim decision that cannot duplicate stages or improve the entire world's loot. Confirm the complete interaction before release. |
| One life produces too many early exits. | YCCE-080. | Tune HP, threats, resource access, and readable combat. Retain immediate PvP and no respawn. Measure survival times independently. |
| A 28-minute collapse conflicts with source timing or player experience. | YCCE-001, YCCE-080. | Treat 18, 25, and 28 as tuning candidates. Preserve the desired duration and hazard-based finish. Record the tested schedule. |
| Heavy builds defeat boundary damage through immunity or regeneration. | YCCE-030, YCCE-080. | Boundary bypasses protection and finite shelter. Complete collapse is lethal regardless of build defenses. Keep meteor resistance useful separately. |
| Late builds overwhelm the host laptop. | YCCE-003, YCCE-079. | Measure source-respecting entity limits and optimize real bottlenecks. Review any mechanical cap deviation explicitly. |
| Thin typography fails during gameplay. | YCCE-016, YCCE-073. | Keep weight-200 menu body text. Use the reviewed heavier text and black contrast backing for gameplay readability. |
| Preferred font files are unavailable. | YCCE-016, YCCE-072. | Ship local Inter. Do not rely on a remote font request. |
| UI automation is unavailable at execution time. | YCCE-010 and the affected task. | Establish Playwright or an available browser control method. A missing direct UI check is inconclusive, not a pass. |
| Genuine balance needs more human sessions than available. | YCCE-080, YCCE-081. | Automate deterministic mechanics first. Keep the human pacing and experience gate open until representative sessions occur. |

## Appendix D. Agreed product and architecture constraints

Use this table to resolve stale suggestions in the reference bundle.

| Area | Agreed delivery behavior |
|---|---|
| Project | You Can Crab Everything. A source-faithful LAN hovercraft game with planar 2D gameplay and 3D presentation. |
| Gameplay plane | Movement, collision, aiming, attacks, and distances use the X/Z plane. Model height, hovering, and jump animation do not create gameplay elevation. An ability may cross planar obstacles when its source behavior calls for it. Leap crosses enemies and obstacles and requires a clear landing inside the arena. Do not infer passability from visual height. |
| Fidelity | Copy source mechanics unless an agreed difference or multiplayer incompatibility requires adaptation. Use original names only for internal traceability. |
| Complete scope | Implement the broad applicable upgrade graph and its required systems. Review each omission individually. Do not replace abilities with invented generic upgrades. |
| Source baseline | Version 1.2.1. Later source updates require an explicit scope revision. |
| Players and devices | Up to four human players per FFA match. Multiple groups can play in separate rooms. Desktop and laptop browsers use keyboard and mouse. The host can play on the same laptop. |
| Hosting | One local Node host serves the browser app, local assets, Socket.IO, and CPU physics for multiple isolated rooms, up to a configurable limit. No internet is needed during play. |
| Authority | One Match owns all mutable world state, physics, clocks, RNG, damage, rewards, and choices. Network adapters parse and queue intents. |
| Technical stack | SvelteKit, Three.js, Rapier, Socket.IO, Node.js, and TypeScript. No framework substitution by convenience. |
| Client | One viewer-filtered observation drives the Svelte UI and Three world. Rendering may interpolate and optionally predict local movement. It does not decide outcomes. |
| Camera and controls | Elevated three-quarter follow camera. WASD independently moves. Mouse aims. Left and right mouse attack. Space moves or dashes. Q ultimate. E interaction. |
| Start | A modest hovercraft. Standard provides +15 maximum HP. No starting modifier offer or Splicing. |
| Progression | Staged salvage, source-specific progress, levels, three randomized offers, ranks, rarities, prerequisites, exclusions, affinities, specializations, and scarce choice currency. |
| Branches | Every twelfth level gives a branching offer instead of an ordinary offer. No boss reward is needed. |
| Equipment | Two attacks, one movement action, one ultimate. Learned and equipped state differ. Preserve automatic, passive, periodic, and reactive mechanics. |
| Stats | Preserve Physical, Ability, max HP, Social, Speed, general damage, cooldowns, attack area, size, regeneration, plating, resistance, poison resistance, dodge, thermal and terrain adaptation, progress, salvage speed and reach, and senses. Apply hovercraft terminology without collapsing their mechanics. |
| World | Varied four-biome maps. Grass, sand, snow, and water have distinct terrain and resource roles. Keep thermal adaptation separate. |
| Conditions | Day and night, senses and permitted visibility, regional weather, heat and cold buildup, recovery, and related bonuses are real mechanics. |
| Exploration | Discoverable and globally one-use POIs. Discovery and claiming differ. Finite shelter supports entry and exit synergies. |
| Firmware | Mushroom-equivalent modules have unknown positive and negative effects, per-run appearance mapping, scanning, and per-player knowledge. Viruses are harmful effects within that system. |
| Bots | Simplified behavior, timed tier escalation, biome roles, variants, elites, useful rewards, and persistent final-area population. Preserve enough bot-bot behavior for scavenging. |
| Allies | Charm, summons, command, target priorities, ownership, caps, and lifecycle. Humans cannot be charmed. |
| Carcinisation | Personal risk and resource-rarity reward. Both bots and players exploit the choosing player's vulnerability. Replace boss-enhancement thresholds with personal penalties. |
| Choices | World continues. Choosing craft is stationary and invulnerable, cannot attack or salvage, and cannot deal offensive effects through owned entities. A short fixed window ends with a random displayed upgrade. Queues cannot provide continuous immunity. |
| PvP and death | Damage is possible immediately. One life, no respawns. Death leads to restricted spectating. No XP death penalty applies. |
| Finale | Shrinking territory replaces the final boss. Bots and meteors remain. Meteors land within the playable area. Boundary pressure defeats shelter and choice protection. |
| Duration | Target approximately 20 minutes per whole match and a desired upper duration of 28 minutes. Validate and tune. The 18-minute, 25-minute, and 28-minute schedule is proposed. |
| Outcome | Last human alive wins after batched damage. No survivors after simultaneous elimination gives a draw. |
| Reconnect | Return to the same craft, which remains vulnerable while disconnected. Dead players stay dead. Deadlines continue. No host migration or saved-run recovery. |
| Persistence | Equal gameplay access every match. Only local presentation and control preferences persist. |
| Visual design | Follow `DESIGN.md` for menu UI. Original modular low-poly game assets may differ. Pure black, white and gray type, one violet filled primary action, amber emphasis, large weight-400 headings, light body text, spacious asymmetric composition, and no filled card grid. |
| Gameplay exceptions | Use enough text weight and black backing for HUD and choice readability. Semantic rarity and warning cues may use appropriate colors with non-color labels. |
| Journey | Title, lobby, loading, match, elimination and spectating where applicable, results, and clean return to lobby. |
| Deferred | Splicing and extra starting modifiers, teams and teammate revival, accounts, permanent power, online matchmaking, mobile, gamepad, challenges, Pressure progression, endless mode, host migration, and mid-match saves. |

## Appendix E. Planning decisions and deliberate playbook adaptations

This turn produces and reviews this document only. Application files, prototypes, runtime tests, and separate audit files remain untouched.

| Decision | Reason | Evidence | Result |
|---|---|---|---|
| Use You Can Crab Everything for the placeholder project name. | The user already named the project. | The agreed brief in this conversation. | Applied. |
| Replace PR-sized sections with separately reviewed local tasks. | The user requests sequential local execution, one task at a time. | The current planning request. | Applied. |
| Schedule prototypes instead of building them during planning. | The user explicitly forbids implementation now. | The current request and the prior design checkpoint. | Experiments assigned in Appendix A. |
| Use read-only coverage exploration. | The multi-phase playbook requests exploration. The source bundle is large. | Gameplay and delivery coverage reports in this conversation. | No helper wrote files. |
| Split large tasks further after user feedback. | The user prefers smaller work units to improve execution success. | The user's task-granularity correction in this conversation. | Individual upgrade tasks and smaller system tasks replace broad bundles. |
| Do not require ten cloud verification lanes per task. | This is a local sequential workflow. Ten identical lanes would not replace task-specific proof. | The user's workflow and the original playbook's cloud-PR assumptions. | Use proportionate automated checks, direct observation, and measured runtime gates. |
| Do not require trunk comparisons where no feature exists. | This repository begins with documents only. | Repository inventory read during planning. | Use recorded base behavior and absolute budgets for new work. |
| Preserve the full release scope after the first playable. | The user requires a complete game after all tasks. | The current delivery target and upgrade-priority decisions. | First playable and full delivery have separate gates. |
| Treat source counts and aliases as unresolved evidence questions. | The CSV mixes source versions and omits current names and relationships. | CSV, crosswalk, indexed trait tables, and official 1.2 changes. | Reconciliation owns final identities and coverage. |
| Keep a planning decision table in this document. | The user requests only the plan document. | The current write constraint. | No additional decision-log file created. |

The plan review checked the task schema, unique IDs, dependency order, local reference links, requirement rows, and accountability for all 112 existing CSV candidate names. The adapted check found 216 task records, 32 requirement rows, and no structural or forward-dependency issue. This is a planning check, not application verification or proof that the source catalogue is complete.

The installed `check-plan.mjs` reported `8 PR sections, 16 problems` and exited with code 1. Its complaints are the expected PR-only rule, cloud owner and audit-loop headings, and PR sub-block structure. Those assumptions conflict with the user's sequential local workflow. The checker was not modified. The local task schema and dependency checks replaced those template checks. The task receipts and final walkthrough remain mandatory.

Read-only review identified and corrected the missing starter-content implementation, a catalogue range that excluded chassis roots, currency needed before POI spending, and a Spit acquisition proof that depended on later Saliva content. No application tests or prototypes ran. Comment review found no source-code comments or suppressions in this Markdown document.

The planning checklist adapts the multi-phase playbook's seven steps. The small-change skip does not apply. Prototype execution is deferred by the user's scope. Exploration is read-only. The template uses local tasks instead of PRs. Technical-writing and unslop apply. Run the installed checker and report its PR-template incompatibilities. Validate the adapted task schema, dependencies, and coverage separately. Hand back and stop.

Sequence Work into Verifiable Units determines task boundaries and separate review stops. Prove It Works requires direct gameplay and delivery evidence. Guard the Context Window partitions reference review into concise reports. Experience First keeps gameplay readability and complete build behavior above implementation convenience. Encode Lessons in Structure adds catalogue validation and requirement coverage gates rather than repeated reminders alone.

## Appendix F. Check every agreed requirement against its tasks

| Requirement ID | Requirement | Implementation and final proof |
|---|---|---|
| REQ-01 | Complete playable game after all tasks. | YCCE-032 proves the first loop. YCCE-068, YCCE-079 through YCCE-084 prove completion. |
| REQ-02 | Selected stack and one authoritative CPU host. | YCCE-004 through YCCE-011, YCCE-079, YCCE-083. |
| REQ-03 | Four-player offline LAN per room, multiple rooms per host, host also plays. | YCCE-008, YCCE-017, YCCE-017A, YCCE-018, YCCE-079, YCCE-083, YCCE-084. |
| REQ-04 | Elevated 3D camera, independent movement and aim, desktop controls. | YCCE-011 through YCCE-014, YCCE-075. |
| REQ-05 | Weak equal start, Standard +15 HP, no Splicing yet. | YCCE-001, YCCE-017, YCCE-019, YCCE-020, YCCE-032. |
| REQ-06 | Complete applicable source upgrade graph rather than a small invented set. | YCCE-002, YCCE-006, YCCE-026, YCCE-047 through YCCE-068, YCCE-082. |
| REQ-07 | Ranks, rarities, AND/OR prerequisites, exclusions, affinities, repeat weighting. | YCCE-006, YCCE-026, YCCE-049, YCCE-050, every content task. |
| REQ-08 | Every twelfth level replaces ordinary offer with a branch. | YCCE-025, YCCE-050, YCCE-068. |
| REQ-09 | Learned versus equipped, two attacks, movement, ultimate, automatic effects. | YCCE-022, YCCE-047, YCCE-048, YCCE-051 through YCCE-068. |
| REQ-10 | Scarce currency, escalating rerolls, temporary rarity, specialization skip. | YCCE-049, YCCE-050, YCCE-073. |
| REQ-11 | Staged salvage, parallel collection, contested ownership, source provenance. | YCCE-024, YCCE-036, YCCE-058, YCCE-059. |
| REQ-12 | Source-complete stats, plating, typed damage, statuses, healing, size, mass. | YCCE-020, YCCE-021, YCCE-046, YCCE-047, YCCE-060, YCCE-061. |
| REQ-13 | Four biomes, depth where verified, terrain adaptation separate from temperature. | YCCE-033, YCCE-034, YCCE-038, YCCE-052, YCCE-065. |
| REQ-14 | Day/night, meaningful sensing and visibility, regional weather. | YCCE-037 through YCCE-039, YCCE-062, YCCE-065, YCCE-077. |
| REQ-15 | Source-derived contested POIs, discovery bonuses, world changes. | YCCE-040, YCCE-041, YCCE-065, YCCE-081. |
| REQ-16 | Unknown firmware, viruses, scanning, per-run mappings, generation. | YCCE-042, YCCE-062, YCCE-063, YCCE-077. |
| REQ-17 | Finite shelter, immunity rules, entry/exit and passive XP synergies. | YCCE-043, YCCE-062, YCCE-065, YCCE-066, YCCE-080. |
| REQ-18 | Bots, tiers, variants, elites, simplified ecology, finale persistence. | YCCE-023, YCCE-035, YCCE-036, YCCE-067, YCCE-080. |
| REQ-19 | Allies, charm, summons, caps, command, attribution. | YCCE-044, YCCE-045, YCCE-053, YCCE-064, YCCE-067. |
| REQ-20 | Personal Carcinisation risk against both bots and humans, rarity reward. | YCCE-028, YCCE-067, YCCE-080, YCCE-081. |
| REQ-21 | Protected stationary choices, no attacks or salvage, random timeout. | YCCE-015, YCCE-027, YCCE-047 through YCCE-050, YCCE-073. |
| REQ-22 | No permanent immunity through queues, allies, reconnect, or shelter. | YCCE-015, YCCE-027, YCCE-030, YCCE-043, YCCE-045, YCCE-076, YCCE-081. |
| REQ-23 | Immediate PvP, one life, no bosses, no respawn or death XP penalty. | YCCE-019, YCCE-021, YCCE-029, YCCE-030, YCCE-084. |
| REQ-24 | Whole-match duration target, hazard finale, in-area meteors, last survivor or draw. | YCCE-001, YCCE-003, YCCE-030, YCCE-067, YCCE-080. |
| REQ-25 | Restricted spectators, vulnerable reconnect, host loss abort. | YCCE-029, YCCE-039, YCCE-076, YCCE-077. |
| REQ-26 | Dala-inspired preferred UI and original modular game assets. | YCCE-016, YCCE-051, YCCE-069 through YCCE-075. |
| REQ-27 | Full HUD, choices, equipment, stats, help, accessibility, quality and audio. | YCCE-031, YCCE-048 through YCCE-050, YCCE-071 through YCCE-075. |
| REQ-28 | No account locks or persistent gameplay advantage, clean rematches. | YCCE-026, YCCE-032, YCCE-075, YCCE-078, YCCE-084. |
| REQ-29 | No private information in observations or browser bundles. | YCCE-006, YCCE-007, YCCE-009, YCCE-039, YCCE-042, YCCE-077. |
| REQ-30 | Runnable production package, local assets, clear host instructions. | YCCE-004, YCCE-008, YCCE-018, YCCE-083, YCCE-084. |
| REQ-31 | Sequential separately requested and reviewed tasks with evidence. | How to read this, Program checklist, every task receipt, YCCE-084. |
| REQ-32 | Resolve uncertain source behavior and experiments rather than hide gaps. | YCCE-001 through YCCE-003, YCCE-011 through YCCE-016, YCCE-068, YCCE-079 through YCCE-082. |

## Appendix G. Final acceptance walkthrough

Run this walkthrough against the production package from YCCE-083. Record the exact revision, machine specifications, browser versions, local network, configuration, and source catalogue version. No debug grants may substitute for the normal end-to-end match. Use separate controlled fixtures for rare mechanics that randomized live play cannot reliably expose.

1. Install and start the host using only the delivery instructions. Confirm a usable LAN URL, local WASM, and a useful ready log.
2. Disable internet access. Use cold browser caches on four separate desktop or laptop clients. Include a playing browser on the host laptop. Confirm every runtime request remains local.
3. Open the title and lobby. Inspect typography, black composition, constellation, primary action hierarchy, connection status, bounded names, four slots, and Standard. Confirm no modifier selection or Splicing.
4. Ready all four players. Delay one asset load and test a recoverable failure before a successful synchronized start. Confirm no damage or clock progression while awaiting loading readiness.
5. Move and aim independently. Use both mouse attacks, movement, ultimate once acquired, and E interactions. Lose focus while holding movement and confirm input expires safely.
6. Visit all four biomes. Compare movement adaptation with thermal adaptation. Observe water depth if included by the source reconciliation, night sensing, regional weather, buildup, warnings, and recovery.
7. Collect distinct resource sources. Observe four stages, the immediate first stage, the double final stage, parallel nearby collection, contested conservation, healing flags, and source-specific progress.
8. Gain ordinary and branching levels through play. Observe three legal offers, rank and rarity distinctions, prerequisites, exclusions, affinities, currency, rerolls, rarity changes, and specializations. Use controlled fixtures to verify levels 12 and 24 precisely.
9. Open a protected choice while the other players continue. Confirm stationary immunity, disabled salvage and offense, suppressed owned offense, fixed deadline, random displayed-option timeout, and no protection extension through queues or reconnect.
10. Inspect learned abilities and equipment. Replace slots without resetting cooldowns. Verify retained passive benefits, periodic effects, and reactive effects. Compare displayed stats with authoritative safe projections.
11. Contest a POI, discover an already claimed terminal, identify or risk unknown firmware, use finite shelter, charm a bot, and summon a companion. Confirm their separate knowledge, ownership, caps, and lifecycle rules.
12. Acquire personal experimental risk. Compare incoming bot and human damage and its rarity reward without changing shared enemy strength or duplicating contested resources.
13. Fight another player before the finale. Eliminate one participant. Confirm no respawn, build transfer, or gameplay action from the eliminated player. Spectate using only the followed player's permitted information.
14. Disconnect a living participant and reconnect. Confirm the same vulnerable craft, current hull, current deadline, and current build. Repeat after elimination and verify the player stays dead.
15. Reach the closing area in real time. Confirm warning stages, ongoing bot population, useful allies, in-area meteor telegraphs, meteor defense effects, and boundary harm that defeats selection and shelter immunity.
16. Resolve a winner. Use controlled simultaneous-lethal and extreme-defense scenarios to prove a draw and a finite hazard finish. Record actual match duration and deadline drift.
17. Inspect results for winner or draw, elimination order, builds, and match statistics. Return all clients to the lobby and play another match without restarting the host. Confirm reset of world, knowledge, resources, choices, and gameplay power.
18. Recheck low quality, UI scale, rebound controls, muted audio, reduced motion, and night brightness. Confirm settings improve presentation without changing spotting or simulation.
19. Review the complete content report. Follow every canonical upgrade and specialization to source evidence, an implemented behavior, a legal graph path, a client representation, and passing evidence. Inspect each individual approved omission.
20. Review capacity, pacing, balance, and soak results. Confirm the supported maximum workload and target hardware meet their recorded budgets. Report sample limits without claiming universal balance.
21. Stop the host. Confirm clients show an aborted connection or match rather than pretending that play or saved recovery continues. Restart into a fresh lobby.
22. Confirm every agreed requirement in Appendix F has direct evidence and every task has user review. Deliver only when no mandatory step is failed or inconclusive.

## Appendix H. Sources and reading order

Read the handoff first, but apply the later decisions in Appendix D when the older handoff disagrees.

- [Conversation handoff](hovercraft_codex_reference_bundle/CODEX_CONVERSATION_HANDOFF.md) records the original scope, technology choices, modular visuals, and fidelity priorities.
- [Mechanics audit](hovercraft_codex_reference_bundle/hovercraft_complete_mechanics_audit_and_development_spec.md) identifies world and upgrade dependencies. Its old score, respawn, starting-modifier, and shelter alternatives are superseded.
- [Evolution crosswalk](hovercraft_codex_reference_bundle/everything_is_crab_evolution_hovercraft_crosswalk.md) contains graph and specialization details missing from individual CSV fields.
- [Existing research CSV](hovercraft_codex_reference_bundle/hovercraft_evolution_mapping.csv) supplies 112 candidate records. It is not a verified current production catalogue.
- [Additional mechanics research](hovercraft_codex_reference_bundle/everything_is_crab_hovercraft_mechanics_research.md) and [earlier mechanics research](hovercraft_codex_reference_bundle/hovercraft_mechanics_research.md) provide leads to reconcile rather than independent release authority.
- [Preferred UI reference](DESIGN.md) defines the menu design. Correct its invalid short teal examples to its valid `#15846e` token.

The planning research found fuller references, not a verified ready-made replacement CSV. The community [Evolution table](https://everythingiscrab.wiki.gg/wiki/Evolution) includes graph and specialization information. [Neoseeker's Evolution Traits](https://www.neoseeker.com/everything-is-crab/Evolution_Traits) exposes structured IDs and numerical tables in indexed excerpts. Neither was fully retrievable through the current web tool. Their version coverage and conflicting fields still need reconciliation.

The [Turtle Down entry](https://everythingiscrab.wiki.gg/wiki/Turtle_Down) and indexed Neoseeker record confirm a named defensive movement ability absent under that name from the local CSV. Neoseeker's Hide-prefixed specialization fields suggest a naming alias. This finding does not establish an additional unique ability count.

The [developer's version 1.2 notes](https://steamdb.info/patchnotes/24669494/) document later additions. Use dated official changes to correct older tables. The inspected [103-entry fan database](https://hinamizawa.ai/everything-is-crab/evolutions/) omits named 1.2 additions from its displayed list and is a cross-check rather than the complete pinned baseline. Steam's [125-plus marketing description](https://store.steampowered.com/app/3526710/) combines evolutions and specializations, so it cannot be compared directly with a base-record CSV count.

Before implementing technology-specific behavior, read current primary documentation for the selected pinned versions. Useful entry points include [SvelteKit's custom Node server](https://svelte.dev/docs/kit/adapter-node#Custom-server), [Socket.IO delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/), [Socket.IO recovery](https://socket.io/docs/v4/connection-state-recovery/), and [Rapier JavaScript determinism](https://rapier.rs/docs/user_guides/javascript/determinism/). These links identify research entry points, not proof that any proposed implementation already works.

The legacy candidates `Body Slam (Tail)`, `Hide`, `Carrion`, `Fat`, `Resistant`, and `Hyperkeratosis` require identity dispositions in YCCE-002 and a final check in YCCE-082. If any is a distinct applicable ability, add its own stable task beside the corresponding canonical family before that family executes. This rule prevents aliases from inflating the task count and prevents unresolved names from disappearing.

## Appendix I. Implement small batches and defer testing to major checkpoints

This appendix is the user's updated execution policy. It supersedes conflicting workflow instructions earlier in this document and in optional pstack skills. It preserves the original 216 tasks, their IDs, scope, and intended product behavior. The 16 appended checkpoint tasks add verification ownership. Four source-reconciliation tasks use new suffix IDs. No original task was rewritten.

Default to one ordinary task per prompt. Change the batch size to two or three when requested. Never increase it automatically. A requested count is a maximum. Work toward completing that many eligible tasks in plan order. Complexity, extensive research, a missing implementation prerequisite, or a substantial repair is work to resolve, not a reason to skip the next task or end the batch. Stop before a due checkpoint or when progress requires user input, authorization, or an external change after available alternatives have been exhausted. Do not select five tasks automatically.

### Apply the testing policy before reading an ordinary task

During an ordinary implementation batch, do not create, expand, rewrite, or run unit, component, regression, integration, browser, or end-to-end tests. Do not run benchmarks, broad scenario sweeps, repeated manual smoke journeys, or screenshot tours after each task or minor gate. Do not disguise a behavioral test as a cheap check. Do not add tests at the end of the batch either.

The original tasks' **Verification steps** and **Evidence required** describe obligations for their assigned major checkpoint. Read those fields to understand the expected behavior, then defer their execution. Test fixtures, test harnesses, browser automation, negative test packets, and test scripts mentioned in an ordinary task also belong to its checkpoint. Implement only any production hooks or interfaces needed to support that future verification.

Production schema validation, catalogue release validation, authorization, invariants, collision handling, and error recovery remain application requirements. Implement those mechanisms now. The prohibition concerns test authoring and test execution, not runtime correctness checks inside the application.

Inspect the changed source and diff during the batch. Run an existing relevant formatter, typecheck, lint command, or build once at batch end when useful. Do not invent a new checker or rebuild after every small task. A documentation-only batch needs document and reference inspection, not an application test run. Never report a static check as gameplay verification.

Do not disable enforced hooks, required repository checks, or safety controls to avoid a test. If an enforced check prevents the requested no-test workflow, report that specific conflict instead of bypassing it.

Research the selected task using the available source records and reasonable alternatives. If an exact source value, formula, behavior, or relationship remains unavailable or conflicting, use the best-supported estimate or calculation and implement it. Use adjacent evidence and the agreed game rules when available. If there is no comparable evidence, use your best judgment to choose a coherent, playable default. For example, estimate base health and regeneration from the intended combat balance when their original values cannot be found. Do not block, defer the implementation, or require user approval solely because game information is missing. This policy overrides older instructions that require exact source reconciliation before implementation, including conflicting per-task source-fidelity requirements.

Record the selected estimate, its basis, and the uncertainty in the compact implementation record or an existing source record. Keep estimated values easy to revise. Do not present an estimate as a verified source fact or invent evidence. If the implementation is otherwise complete, mark it **Implemented, checkpoint pending**. At the checkpoint, verify the implemented behavior against the documented estimate and report source fidelity as unverified; an estimate alone is not a reason to prevent the checkpoint from passing. Continue to enforce the other acceptance conditions, production guards, testing policy, and checkpoint boundaries.

The decision experiments explicitly required by YCCE-011, YCCE-014, YCCE-015, and YCCE-016 retain the observations needed to choose a design. They do not authorize an additional regression suite or repeated post-implementation testing.

### Override repetitive skill machinery for this project

Use one local implementation owner. Reuse the agreed architecture and existing source records. Do not automatically run How, Architect, Arena, Swarm, No-comments, TDD, parallel implementations, or fresh review agents for each task, batch, or minor gate. Do not create PRs, commits, worktrees, cloud lanes, hourly audit loops, or deployments merely because a playbook lists them. Those activities require a separate request or a concrete need that cannot be handled within the current scope.

This instruction deliberately adapts Feature's per-task verification and delegation, Multi-phase plan's unit/live/performance lanes, and Sequence Work into Verifiable Units' verify-before-next rule. The major checkpoint is the behavioral verification unit. Individual tasks remain small implementation units. Prove It Works still applies to claims. An implementation handoff must say that gameplay verification is pending.

Use technical-writing and unslop for documentation that the change actually needs. Prefer updating an existing reader guide. Do not create a document, decision journal, screenshot folder, or evidence receipt for every implementation task. Keep the batch record here. Keep public documentation useful without private task IDs or this plan. Checkpoints may keep one consolidated report and reusable artifacts for their whole covered segment.

### Track implementation separately from verification

Use the implementation record below to choose the next ordinary task. Do not repeatedly select an implemented task just because its original completion box remains unchecked.

| State | Meaning and dependency rule |
|---|---|
| Not started | No implementation handoff exists. |
| In progress | Work is partial. Resume this task before selecting later dependent work. |
| Implemented, checkpoint pending | The scoped implementation and source review are complete. Behavioral verification has not run. Later ordinary tasks in the same checkpoint segment may use it. |
| Verified at checkpoint | The assigned checkpoint passed for the relevant revision and the evidence is recorded. |
| Blocked | Missing authorization, a necessary external condition, or an unresolved dependency prevents progress after reasonable alternatives. Missing exact game information alone is not a blocker. A known defect stays open even if it has a fixable cause. |

Do not check an original task's full completion box merely because implementation finished. Check it only after its assigned verification passed and the user's review is recorded. Record batch review once for the selected IDs. Do not pause for a separate review between tasks within an explicitly requested batch. Silence is not review acceptance.

A failed compile, known broken required behavior, or missing implementation prerequisite blocks dependent work, not efforts to repair the prerequisite. Diagnose and resolve the cause, including necessary supporting changes, before continuing. Try available alternatives when an approach fails. Do not stop because a repair is substantial or ask for another prompt to perform work necessary for the selected task. Keep unrelated sibling work out of the batch.

Stop for a blocker only when further progress requires unavailable user input, authorization, or an external change after reasonable alternatives have been tried. Record the concrete obstacle, attempted remedies, preserved progress, and exact next requirement. Do not invent evidence, silently weaken acceptance conditions, bypass enforced checks, or cross a checkpoint to force completion. If an execution limit interrupts the work, preserve resumable progress and mark the task In progress. Do not present the interruption as a completed batch or an external blocker.

### Stop at the checkpoint boundaries

The checkpoints are appended for readability. Execute them at the boundaries below, not after implementing the entire document. An ordinary batch stops before a due checkpoint even when its task allowance remains. Run one checkpoint only when explicitly requested. After it passes, stop for review before starting the next segment.

The original testing-focused tasks listed in the last column execute as scope within their checkpoint. They are not extra ordinary batches or separate test cycles. Their IDs and acceptance conditions remain intact.

| Checkpoint task | Original tasks whose verification it owns | Task count | When it becomes due | Original tasks executed within this checkpoint |
|---|---|---|---|---|
| YCCE-TEST-01 | YCCE-001 through YCCE-010. | 10 | After implementation through YCCE-010. | None. |
| YCCE-TEST-02 | YCCE-011 through YCCE-016. | 6 | After implementation and decision experiments through YCCE-016. | None. |
| YCCE-TEST-03 | YCCE-017 through YCCE-025H. | 26 | After implementation through YCCE-025H. | None. |
| YCCE-TEST-04 | YCCE-026 through YCCE-032. | 11 | After implementation through YCCE-032. | None. |
| YCCE-TEST-05 | YCCE-033 through YCCE-039A. | 9 | After implementation through YCCE-039A. | None. |
| YCCE-TEST-06 | YCCE-040 through YCCE-046A. | 15 | After implementation through YCCE-046A. | None. |
| YCCE-TEST-07 | YCCE-047 through YCCE-051. | 7 | After implementation through YCCE-051. | None. |
| YCCE-TEST-08 | YCCE-052 through YCCE-057D. | 31 | After implementation through YCCE-057D. | None. |
| YCCE-TEST-09 | YCCE-058 through YCCE-061M. | 36 | After implementation through YCCE-061M. | None. |
| YCCE-TEST-10 | YCCE-062 through YCCE-068. | 45 | After implementation through YCCE-067H, before YCCE-068. | YCCE-068. |
| YCCE-TEST-11 | YCCE-069 through YCCE-075A. | 12 | After implementation through YCCE-075A. | None. |
| YCCE-TEST-12 | YCCE-076 through YCCE-078. | 5 | After implementation through YCCE-076A, before YCCE-077. | YCCE-077, YCCE-077A, YCCE-078. |
| YCCE-TEST-13 | YCCE-079 through YCCE-079A. | 2 | After YCCE-TEST-12 passes. | YCCE-079, YCCE-079A. |
| YCCE-TEST-14 | YCCE-080 through YCCE-081. | 2 | After YCCE-TEST-13 passes. | YCCE-080, YCCE-081. |
| YCCE-TEST-15 | YCCE-082. | 1 | After YCCE-TEST-14 passes, before YCCE-083. | YCCE-082. |
| YCCE-TEST-16 | YCCE-083 through YCCE-084. | 3 | After implementation through YCCE-083A, before YCCE-084. | YCCE-084. |

Use the original 16 checkpoint IDs, YCCE-TEST-01 through YCCE-TEST-16, in table order. The 12 later suffix checkpoints are removed. Their verification belongs to the corresponding original checkpoint, including coverage for newer implementation tasks. Preserve passed checkpoint results and approved waivers. Use one consolidated report per checkpoint and reuse valid evidence. Do not require separate reports or captures for the former suffix checkpoints.

Ranges follow the original tasks' document order and include suffix IDs. For example, the first range includes YCCE-004 through YCCE-009 as well as its endpoints. Each original task has exactly one verification owner. Previously verified dependencies may be reused without rerunning their complete checkpoint. Inserted future tasks need an owner before implementation starts.

An early checkpoint verifies the behavior available at its boundary. Use shared Match or build-state fixtures for extension contracts whose other feature arrives later. Assign the live combined scenario to the later checkpoint and keep that scenario pending in the coverage matrix. The earlier checkpoint may pass its scoped checks, but an original task's full completion still waits for all its required evidence. Do not implement later unselected content merely to satisfy an early checkpoint.

### Spend testing effort on behavior that can break

At a major checkpoint, choose the smallest useful combination of focused regression tests, integration scenarios, and direct end-to-end journeys. Test public Match behavior and player outcomes. Prefer shared fixtures and data-driven cases for upgrades. Do not create one test suite for every small task, mirror private helper calls, or assert a fixture's own constants.

A checkpoint must account for its covered tasks' acceptance conditions and deferred scenarios. Consolidate overlapping cases into shared runs. Every applicable upgrade still needs evidence of its actual behavior. Deferring tests does not permit dropping source behavior, specializations, privacy, or the final delivery target.

Run relevant tests once on the integrated checkpoint revision. When a failure requires a fix, rerun the failed case and other cases the fix can affect. Repeat the full checkpoint only for a redesign, a broad change, or evidence that the earlier results are invalid. Do not rerun the entire project suite after every passing assertion or task within a checkpoint.

Keep test authoring, browser execution, performance probes, and human playtests proportional to that checkpoint's risks. Do not add automatic reviewer swarms, a coverage percentage target, or ten lanes. Long checkpoints can span several requests. Save the exact revision, completed cases, remaining cases, and valid evidence so a continuation does not start over. A partial checkpoint is not passed.

### Maintain one compact implementation record

Append one row per selected task after each batch. Checkpoint-only original tasks receive their rows when their checkpoint executes. Record actual checks once per batch, with references from the rows that share them. Do not create 216 separate task receipt documents.

| Task ID | Implementation state | Verification owner | Verification state | Changed paths or revision | Batch review |
|---|---|---|---|---|---|
| YCCE-001 | Verified at checkpoint | YCCE-TEST-01 | Rule and source evidence inspected; unknown source formulas remain recorded. | `docs/product-rules.md` | Pending user review. |
| YCCE-002 | Verified at checkpoint | YCCE-TEST-01 | Source inventory and graph audits run. Unresolved fields remain owned research questions, not verified effects. | `docs/content/` | Pending user review. |
| YCCE-003 | Verified at checkpoint | YCCE-TEST-01 | Experiment procedures and assumed hardware profile inspected; no performance measurements claimed. | `docs/experiments.md` | Pending user review. |
| YCCE-004 | Verified at checkpoint | YCCE-TEST-01 | Clean install, static checks, build, host boot, and browser checks passed. | Package, configuration, source tree, `README.md`. | Pending user review. |
| YCCE-005 | Verified at checkpoint | YCCE-TEST-01 | Match lifecycle, rejection, elimination, disconnect, and offer consistency scenarios passed. | `server/match/match.ts`, `shared/match.ts` | Pending user review. |
| YCCE-006 | Verified at checkpoint | YCCE-TEST-01 | Registry loads fixed Standard and blocked Plated data; validation and selectable fixture scenarios passed. No upgrade gameplay is claimed complete. | `server/content/` | Pending user review. |
| YCCE-007 | Verified at checkpoint | YCCE-TEST-01 | Intent rejection, authoritative state, private offers, and hidden-player packet scenarios passed. | `shared/protocol/`, `server/network/`, `server/match/` | Pending user review. |
| YCCE-008 | Verified at checkpoint | YCCE-TEST-01 | Production host startup, local LAN-address access, occupied-port handling, and shutdown passed. Second-device check waived by user. | `server/index.ts`, `package.json` | Pending user review. |
| YCCE-009 | Verified at checkpoint | YCCE-TEST-01 | Browser observation, entity rendering, removal, replacement, resize, disposal, and host-restart session replacement scenarios passed. | `src/lib/`, `src/routes/` | Pending user review. |
| YCCE-010 | Verified at checkpoint | YCCE-TEST-01 | Repeatable foundation and browser scenarios passed; deliberate failure demonstration observed. Future gameplay scenarios remain assigned to later tasks. | `tests/scenarios/`, `scripts/checkpoint-01.mjs` | Pending user review. |
| YCCE-TEST-01 | Verified at checkpoint | YCCE-TEST-01 | Scoped checkpoint passed with the user-requested second-device waiver. Source upgrade implementation remains later work. | Current uncommitted worktree; consolidated report below. | Approved by user on 2026-11-14. |
| YCCE-011 | Verified at checkpoint | YCCE-TEST-02 | Compared both models and checked authoritative movement at three simulated render cadences. Physical multiplayer and player assessment remain unverified. | `server/match/physics/`, `server/match/match.ts`, `scripts/compare-hover.mjs`, `docs/experiments.md`, `docs/hover-comparison.json` | Pending. |
| YCCE-012 | Verified at checkpoint | YCCE-TEST-02 | The local course checked follow camera, target aiming, resize, and a foreground obstacle. Physical multiplayer remains unverified. | `src/lib/game-client/world.ts`, `shared/match.ts` | Pending. |
| YCCE-013 | Verified at checkpoint | YCCE-TEST-02 | The local course checked focus loss, text entry, secondary click, and normalized movement. Match scenarios checked expiry and disconnect clearing. | `src/lib/game-client/controls.ts`, `src/lib/net/session.ts`, `src/routes/+page.svelte`, `shared/protocol/`, `server/network/intents.ts`, `server/index.ts` | Pending. |
| YCCE-014 | Verified at checkpoint | YCCE-TEST-02 | Local prediction and buffered remote snapshots were exercised in the browser course. Real-LAN and multi-client response budgets remain unverified. | `src/lib/game-client/`, `shared/movement.ts`, `server/match/physics/`, `server/index.ts`, `scripts/compare-network-live.mjs`, `docs/network-comparison.json` | Pending. |
| YCCE-015 | Verified at checkpoint | YCCE-TEST-02 | Fixed-window and exposed-interval prototype compared three intervals, including rerolls, expiry, disconnect, and queued prompts. Its permission model is not integrated with future combat or progression systems. | `server/match/selection-window.ts`, `scripts/compare-protection.mjs`, `docs/protection-comparison.json` | Pending. |
| YCCE-016 | Verified at checkpoint | YCCE-TEST-02 | The selected prototype was inspected at both target viewport sizes. Independent human comprehension remains unverified. | `src/lib/ui/ChoiceOverlay.svelte`, `src/routes/+page.svelte`, `static/fonts/`, `scripts/compare-choice-layout.swift`, `docs/choice-layout-comparison.json` | Pending. |
| YCCE-TEST-02 | Verified at checkpoint | YCCE-TEST-02 | Scoped local checks passed. Physical multiplayer checks were skipped at the user's request; the report records remaining limits. | Uncommitted worktree; consolidated report below. | Approved by user on 2026-11-14. |

| YCCE-017 | Verified at checkpoint | YCCE-TEST-03 | Scoped checkpoint scenarios passed. | `server/index.ts`, `server/match/match.ts`, `src/lib/net/session.ts`, `src/routes/+page.svelte` | Pending. |
| YCCE-017A | Verified at checkpoint | YCCE-TEST-03 | Scoped checkpoint scenarios passed. | `server/index.ts`, `src/lib/net/session.ts`, `src/routes/+page.svelte`, `README.md` | Pending. |
| YCCE-018 | Verified at checkpoint | YCCE-TEST-03 | Scoped checkpoint scenarios passed. | `server/match/match.ts`, `server/index.ts`, `src/routes/+page.svelte` | Pending. |
| YCCE-019 | Verified at checkpoint | YCCE-TEST-03 | Scoped checkpoint scenarios passed. Resource placements are present; collection belongs to YCCE-024. | `shared/arena.ts`, `server/match/match.ts`, `src/lib/game-client/world.ts` | Pending. |
| YCCE-020 | Verified at checkpoint | YCCE-TEST-03 | Source stat vocabulary, deterministic modifier composition, provisional baselines and caps. Source fidelity remains unverified. | `server/match/stats.ts`, `server/match/match.ts` | Pending. |
| YCCE-020A | Verified at checkpoint | YCCE-TEST-03 | Hull, plating, repair, level growth and provisional regeneration implemented. Scoped checkpoint scenarios passed. | `server/match/health.ts`, `server/match/match.ts` | Pending. |
| YCCE-020B | Verified at checkpoint | YCCE-TEST-03 | Typed mitigation, dodge, protection and bypass rules. Scoped checkpoint scenarios passed. | `server/match/combat.ts`, `server/match/match.ts` | Pending. |
| YCCE-020C | Verified at checkpoint | YCCE-TEST-03 | Owned timed statuses, refresh, immunity and cleanup. Scoped checkpoint scenarios passed. | `server/match/combat.ts`, `server/match/match.ts`, `shared/match.ts` | Pending. |
| YCCE-021 | Verified at checkpoint | YCCE-TEST-03 | Host-authoritative basic strike, timing, movement penalty and collision query. Scoped checkpoint scenarios passed. | `server/match/match.ts` | Pending. |
| YCCE-021A | Verified at checkpoint | YCCE-TEST-03 | Host projectile sweep, blocking, single-hit removal and bounded impulses. Scoped checkpoint scenarios passed. | `server/match/match.ts`, `src/lib/game-client/world.ts` | Pending. |
| YCCE-021B | Verified at checkpoint | YCCE-TEST-03 | Causal damage batches, bounded reflections and death ledger. Scoped checkpoint scenarios passed. | `server/match/combat.ts`, `server/match/match.ts` | Pending. |
| YCCE-022 | Verified at checkpoint | YCCE-TEST-03 | Learned ability registration, four slots, selection controls and per-ability cooldowns. Actual catalogue abilities and reward generation remain later tasks. Scoped checkpoint scenarios passed. | `server/match/equipment.ts`, `server/match/match.ts`, `src/lib/net/session.ts`, `src/routes/+page.svelte` | Pending. |
| YCCE-023 | Verified at checkpoint | YCCE-TEST-03 | Authoritative bots, line-of-sight attacks, tiers and one drop per death. Scoped checkpoint scenarios passed. | `server/match/bots.ts`, `server/match/match.ts`, `src/lib/game-client/world.ts` | Pending. |
| YCCE-024 | Verified at checkpoint | YCCE-TEST-03 | Parallel four-stage collection with source-based totals and modifiers. Scoped checkpoint scenarios passed. | `server/match/economy.ts`, `server/match/match.ts`, `src/lib/game-client/world.ts` | Pending. |
| YCCE-024A | Verified at checkpoint | YCCE-TEST-03 | Atomic stage claims, provenance, density and expiration. Scoped checkpoint scenarios passed. | `server/match/economy.ts`, `server/match/match.ts` | Pending. |
| YCCE-024B | Verified at checkpoint | YCCE-TEST-03 | Independent repair flags and collection healing events. Scoped checkpoint scenarios passed. | `server/match/economy.ts`, `server/match/match.ts` | Pending. |
| YCCE-024C | Verified at checkpoint | YCCE-TEST-03 | Match-owned wallet and idempotent grant and spend receipts. Scoped checkpoint scenarios passed. | `server/match/economy.ts`, `server/match/match.ts` | Pending. |
| YCCE-025 | Verified at checkpoint | YCCE-TEST-03 | Progress thresholds, multi-level overflow, passive progress and ordinary/branch reward queue. Scoped checkpoint scenarios passed. | `server/match/economy.ts`, `server/match/match.ts`, `server/match/stats.ts`, `src/routes/+page.svelte` | Pending. |
| YCCE-025A | Verified at checkpoint | YCCE-TEST-03 | Muscular Tissue rank and rarity modifiers. Scoped checkpoint scenarios passed. | `server/content/starter.ts`, `server/match/match.ts` | Pending. |
| YCCE-025B | Verified at checkpoint | YCCE-TEST-03 | Stomach salvage-speed modifiers. Scoped checkpoint scenarios passed. | `server/content/starter.ts`, `server/match/match.ts` | Pending. |
| YCCE-025C | Verified at checkpoint | YCCE-TEST-03 | Plated capacity and level refill integration. Scoped checkpoint scenarios passed. | `server/content/starter.ts`, `server/match/match.ts` | Pending. |
| YCCE-025D | Verified at checkpoint | YCCE-TEST-03 | Body Slam health-scaled attack and equipment. Scoped checkpoint scenarios passed. | `server/content/starter.ts`, `server/match/match.ts`, `server/match/equipment.ts` | Pending. |
| YCCE-025E | Verified at checkpoint | YCCE-TEST-03 | Starting Dash, cooldown and host collision. Scoped checkpoint scenarios passed. | `server/match/equipment.ts`, `server/match/match.ts` | Pending. |
| YCCE-025F | Verified at checkpoint | YCCE-TEST-03 | Arms stats and child unlock references. Scoped checkpoint scenarios passed. | `server/content/starter.ts`, `server/match/match.ts` | Pending. |
| YCCE-025G | Verified at checkpoint | YCCE-TEST-03 | Slithery movement, terrain response and exclusions. Scoped checkpoint scenarios passed. | `server/content/starter.ts`, `server/match/match.ts`, `shared/movement.ts` | Pending. |
| YCCE-025H | Verified at checkpoint | YCCE-TEST-03 | Wings movement and starter branching subset. Scoped checkpoint scenarios passed. | `server/content/starter.ts`, `server/match/match.ts` | Pending. |
| YCCE-TEST-03 | Verified at checkpoint | YCCE-TEST-03 | Local Match, room and four-browser scenarios passed; source fidelity and physical multiplayer remain unverified. | `tests/scenarios/checkpoint03*.test.js`, consolidated report below. | User authorized completion on 2026-11-14. |

| YCCE-026 | Verified at checkpoint | YCCE-TEST-04 | Nested, rank, specialization and world conditions, pool separation, rank caps, and symmetric exclusions. | `server/content/registry.ts`, `server/match/match.ts` | Pending. |
| YCCE-026A | Verified at checkpoint | YCCE-TEST-04 | Distinct weighted offers, affinity tracking, retained rarity, revisions, and explicit depleted-pool handling. Coefficients are provisional. | `server/match/offers.ts`, `server/content/starter.ts`, `server/match/match.ts` | Pending. |
| YCCE-027 | Verified at checkpoint | YCCE-TEST-04 | Choice protection immobilizes and conceals collision, cancels current attacks and projectiles, and suppresses owned damage. Future ally and field integrations remain assigned to their feature work. | `server/match/match.ts` | Pending. |
| YCCE-027A | Verified at checkpoint | YCCE-TEST-04 | Earned offers, unique IDs, revisions, transaction results, rerolls, fixed deadlines, exposed intervals, display acknowledgment and queued specialization and equipment prompts. | `server/match/selection-window.ts`, `server/match/match.ts`, `server/network/intents.ts`, `server/index.ts`, `shared/`, `src/` | Pending. |
| YCCE-028 | Verified at checkpoint | YCCE-TEST-04 | Distinct tagged-card and registered specialization bonuses, personal combat vulnerability, threshold penalties, claimant-relative resource rewards, and risk HUD. Current starter content has no selectable qualifying card. | `server/content/registry.ts`, `server/match/match.ts`, `server/match/economy.ts`, `shared/match.ts`, `src/routes/+page.svelte` | Pending. |
| YCCE-029 | Verified at checkpoint | YCCE-TEST-04 | One-life elimination, ordinary wreckage, owned-effect cleanup, survivor count and followed-player spectator projection. | `server/match/match.ts`, `server/network/intents.ts`, `shared/`, `src/` | Pending. |
| YCCE-030 | Verified at checkpoint | YCCE-TEST-04 | Configurable wall-clock shrinking boundary, bypass damage, lethal collapse, bot containment and warnings. | `server/match/finale.ts`, `server/match/match.ts`, `server/index.ts`, `src/` | Pending. |
| YCCE-030A | Verified at checkpoint | YCCE-TEST-04 | In-boundary meteor scheduling, visible telegraphs and separate cataclysm-resistance damage. | `server/match/finale.ts`, `server/match/combat.ts`, `server/match/match.ts`, `src/` | Pending. |
| YCCE-030B | Verified at checkpoint | YCCE-TEST-04 | Human survivor outcome resolved once after the damage batch; simultaneous final eliminations are grouped as a draw. | `server/match/match.ts`, `shared/match.ts` | Pending. |
| YCCE-031 | Verified at checkpoint | YCCE-TEST-04 | Player HUD, observed minimap, slots and cooldowns, affinities, salvage labels and warnings including during choices. | `shared/match.ts`, `src/lib/ui/MatchHud.svelte`, `src/routes/+page.svelte` | Pending. |
| YCCE-032 | Verified at checkpoint | YCCE-TEST-04 | Results and host-led return to a freshly constructed match with retained room sessions and reset player state. | `server/index.ts`, `server/match/match.ts`, `src/lib/net/session.ts`, `src/lib/game-client/world.ts`, `src/routes/+page.svelte` | Pending. |



Batch completion on 2026-11-14. YCCE-030B, YCCE-031 and YCCE-032 are implemented pending YCCE-TEST-04. The authoritative result records same-update elimination groups, human winner or draw, builds, damage, eliminations and salvage stages. The host returns the room to a newly constructed match, preserving identities and connections but resetting gameplay. The round identity resets client interpolation and loading revisions protect the new lobby from stale load acknowledgments. The current UI labels the starter playable subset as awaiting checkpoint verification. Source and diff inspection, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, and `git diff --check` passed. The build retains its large client chunk warning. UI readability, outcome ordering, privacy and a full four-client rematch remain unverified. No behavioral tests, manual gameplay checks or benchmarks ran. YCCE-TEST-04 is now due and requires a separate request.

Batch completion on 2026-11-14. YCCE-029, YCCE-030 and YCCE-030A are implemented pending YCCE-TEST-04. The schedule follows the explicitly untested project proposals in `docs/product-rules.md`: shrink begins at 18 minutes, reaches radius 3 at 25 minutes and collapses at 28 minutes. The initial radius 46, boundary damage 10 per second, and meteor interval 8 seconds, warning 2.5 seconds, radius 3 and damage 25 are provisional playability estimates, not source facts. `server/match/finale.ts` centralizes these values. The host caps simulation catch-up while the finale uses monotonic wall time; untested balance and overload behavior remain checkpoint obligations. Spectators inherit a followed survivor's visibility filter and cannot access that survivor's private progression. Winner and draw resolution remain YCCE-030B. Source and diff inspection, `npm run typecheck`, `npm run lint`, `npm run format:check`, and `git diff --check` completed. Gameplay, privacy, timing, and source fidelity remain unverified; no tests, benchmarks, or manual gameplay checks ran.

Batch completion on 2026-11-14. YCCE-026, YCCE-026A, YCCE-027, YCCE-027A and YCCE-028 are implemented pending YCCE-TEST-04. The [community wiki affinity summary](https://everythingiscrab.wiki.gg/wiki/Affinity) describes +10% incoming enemy damage and +8% food rarity chance per Carcinisation point. The [asset-derived affinity reference](https://hinamizawa.ai/everything-is-crab/affinity/) reports that the serialized coefficients cannot be independently read and treats those figures and the Arthropod bonus as unconfirmed. The implementation uses 10% and 8% as provisional estimates, caps Carcinisation at 10, and adds a provisional 5% personal damage penalty at each of levels 4, 7 and 10 in place of source boss thresholds. The claimant-specific one-tier resource roll is retained per resource and never changes another claimant's reward. No currently selectable starter card has the Carcinisation tag; its live acquisition and the Arthropod specialization belong to later content work. The blocked Legs record retains the estimated rank-three Arthropod +1 bonus; Bipedal and all Legs effects remain unimplemented, and registry validation prevents the incomplete specialization set becoming selectable.

Offer weights remain estimates. The unversioned [evolution summary](https://everythingiscrab.wiki.gg/wiki/Evolution) supports higher offer weight for ordinary affinities and owned ranks, distinct Carcinisation counting, no Carcinisation offer weighting, retained rarity, and a one-currency reroll. The implementation estimates 10% weight per matching ordinary affinity rank, 25% per owned rank, and rarity weights 60/25/12/3 for common through legendary. Empty eligible pools produce a visible depleted-reward count, without a filler card. None of these values is verified for pinned 1.2.1. The client acknowledges a rendered prompt before it can expire automatically; an unseen prompt returns after an exposed interval with a new revision. Inspection covered changed source and diff. `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, and `git diff --check` passed after corrections. The build retained its large client chunk warning. No tests, manual gameplay checks, or benchmarks ran. Source fidelity and behavior remain unverified until the checkpoint.

Batch implementation on 2026-11-14. Added room routing, lobby and loading states, an initial seeded arena, and provisional stat and health code. Inspected the changed source and diff. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed after the final changes. The build retained the large client chunk warning. No tests, browser journeys, or benchmarks ran. YCCE-TEST-03 remains pending and is not due. The room and arena changes have no behavioral verification. The source [community wiki baseline](https://everythingiscrab.wiki.gg/wiki/Darwin) lists 50 base HP and the named stats, while an [unversioned data-derived reference](https://hinamizawa.ai/everything-is-crab/darwin/) questions the baseline and reports a different Standard value. The project decision remains +15. The [official 1.1 notes](https://steamdb.info/patchnotes/23879270/) support one HP per level below Pressure 15. Available sources disagree on regeneration units, and the complete pinned-version modifier composition, vocabulary, and caps are not established. The regeneration rate is provisional, not source-verified. Additive modifiers are supported; unsupported multipliers are rejected until their composition is reconciled. Resume YCCE-020 before downstream dependent work. Reconcile the pinned 1.2.1 source formulas and baselines, then finish YCCE-020A and verify both at the checkpoint. Resource dots represent placed deposits; interaction is later scope.

Batch continuation on 2026-11-14. The [official 1.1 notes](https://steamdb.info/patchnotes/23879270/) document +15 Standard health, one HP per level in the applicable rules, and 500% feeding speed and senses caps. Added deterministic additive modifiers with those two caps, rejected duplicate or unsupported modifiers, limited diagnostic stats to their owner, and prevented level-up plating refill after hull reaches zero. The wiki baseline and current extract still disagree on base HP; a full 1.2.1 modifier formula and cap list are unavailable. The current base, regeneration rate, and composition remain incomplete and need pinned-version evidence. YCCE-020 and YCCE-020A remain in progress. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed. The build retained the large client chunk warning. No behavioral verification ran.

Batch continuation on 2026-11-14. Repair results now distinguish consumption at full hull from actual recovery. Checked the local Steam library and found no installation of the source game. Additional public searches did not establish the missing version-specific formulas. YCCE-020 and YCCE-020A remain in progress; resolving their source fidelity requires accessible 1.2.1 game data or equivalent versioned authoritative evidence. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed. The build retained the large client chunk warning. No tests or behavioral checks ran.

Batch implementation on 2026-11-14. YCCE-025A through YCCE-025H are implemented pending YCCE-TEST-03. [Muscular Tissue](https://everythingiscrab.wiki.gg/wiki/Muscular_Tissue), [Body Slam](https://everythingiscrab.wiki.gg/wiki/Body_Slam), [Arms](https://everythingiscrab.wiki.gg/wiki/Arms), and [Slithery](https://everythingiscrab.wiki.gg/wiki/Slithery) supply the unversioned wiki tables; [Stomach](https://www.neoseeker.com/everything-is-crab/Evolution_Traits) supplies the unversioned feeding-speed table. Plated uses the wiki table selected in the existing source record. Body Slam uses the midpoint of each physical-damage range, with an estimated 200 ms windup. Wings is estimated at +1 speed and +40 terrain adaptation because exact adaptation was unavailable; the [evolution catalogue](https://everythingiscrab.wiki.gg/wiki/Evolution) supports its one-rank speed and terrain effects. Sand, snow and water penalties of 25%, 25% and 50% are provisional, with adaptation reducing each penalty linearly. Dash uses 4.5 units over 200 ms and a 4.5 second cooldown from an unversioned [data-derived reference](https://hinamizawa.ai/everything-is-crab/darwin/). Source fidelity and all behavior remain unverified. Actual randomized offers remain owned by later tasks. Inspected the changed source and diff. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed. The build retained the large client chunk warning. No tests, browser journeys or benchmarks ran.

Batch implementation on 2026-11-14. YCCE-023, 024, 024A, 024B, 024C and 025 are implemented pending YCCE-TEST-03. The [food source](https://everythingiscrab.wiki.gg/wiki/Food) and the mechanics audit describe four stages, an immediate first stage, a double final stage, and total values of 10/30/90/300. The following are estimates rather than established source values: one second between stages at 100% speed, repair worth 10% of maximum hull over a full resource, a progress threshold of 10 + 5 per prior level with a 10% requirement floor, bot health 30 per tier, damage 4 per tier, 10-unit aggro, 2-unit reach, 600 ms windup and 1800 ms cooldown, one currency per bot tier, and the bounded spawn and expiration rules. The wiki page returned 403 when opened; its search excerpt and local source record informed this work. Resource source, killer, credited owner, rarity and repair are retained separately. Actual offer generation and purchases remain later scope. Source and diff inspected. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed. The build reported a large client chunk. No tests, browser verification or benchmarks ran.

Batch implementation on 2026-11-14. YCCE-020B, 020C, 021, 021A, 021B and 022 are implemented pending YCCE-TEST-03. A [data-derived but unversioned source](https://hinamizawa.ai/everything-is-crab/) reports 0.6–0.8 physical damage and 0.8 seconds for the basic attack. The implementation uses the midpoint 0.7 and 0.8 seconds. The 200 ms windup, two-unit reach, 70% movement during action, 1-second status ticks, same-owner refresh, summed slow, corrosion and environmental plating bypass, damage channel mitigation, reflection bound, projectile speed and impulse are provisional estimates, not verified pinned-version behavior. Ability definitions must be registered by the later catalogue work; reward generation arrives with progression. Existing generic server registration and selection provide the integration boundary. Inspected implementation and diff. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed; the build reported a large client chunk. No tests, browser verification or benchmarks ran.

Batch completion on 2026-11-14. YCCE-017, 017A, 018, 019, 020 and 020A are implemented pending YCCE-TEST-03. The wiki baseline suggests 50 hull; with the official Standard bonus this gives 65 initial hull, although an unversioned extract disagrees. The official 1.1 notes support +1 hull per level and 500% salvage-speed and senses caps. In the absence of pinned-version formulas, modifiers are estimated as (base plus additive changes) times the product of multipliers, then clamped; the community cap summary informs 999 physical, ability and hull, 300 regeneration and size, and 75 dodge. Plating 999 and resistance 100 are provisional safety limits; other stats have a zero floor. Regeneration is estimated as continuous recovery of the regeneration stat per ten seconds, based on the community description; cadence and all these estimates remain source-unverified. Baselines and caps are centralized for revision. Inspected the implementation and diff. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed; the build reported a large client chunk. No tests, behavioral verification, or benchmarks ran. Resource interaction is later scope.

Batch continuation on 2026-11-14. Moved lobby, start, loading, leave, and disconnect mutations from socket callbacks into bounded per-connection commands drained by the host loop. Changed stat modifier ordering to a locale-independent total order. A [community cap summary](https://everythingiscrab.org/mechanics/stats-explained/) supplies additional leads but does not establish all values for pinned 1.2.1; YCCE-020 and YCCE-020A remain in progress pending versioned formulas and baseline evidence. Inspected source and diff. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed. The build retained its large client chunk warning. No tests or behavioral checks ran.

Batch checks for YCCE-014 through YCCE-016 on 2026-11-14. Inspected the source and changes. Ran the permitted loopback network and choice-state decision experiments, visually compared two choice layouts and two HUD contrast treatments, and estimated longer source-derived text wrapping with Inter font metrics. The layout descriptions are paraphrases of research sources, not released pinned-version copy. The loopback experiment uses one Node client with artificial message loss, not four clients, true TCP loss, or browser timing. `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm run build` passed. The build retained the large client chunk warning. No tests or benchmarks ran. The choice component and permission model are prototypes; actual offer, deadline, combat, and progression integration belongs to YCCE-027 and YCCE-027A. YCCE-TEST-02 is now due and has not run.

Batch checks on 2026-11-14. Inspected the selected source and changes. The permitted handling decision experiment ran on the development Mac, with raw observations and limits recorded in `docs/experiments.md` and `docs/hover-comparison.json`. `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm run build` passed. The build reported the existing large client chunk warning. No tests, browser journeys, or benchmarks ran. The existing renderer scenario fixture lacks the new `radius` and `aim` fields and must be updated within YCCE-TEST-02. The lobby start flow, combat, abilities, interactions, and arena belong to later tasks. Behavioral verification remains pending.


Checkpoint continuation on 2026-11-14. `npm run lint`, `npm run typecheck`, and `npm run build` passed. `YCCE_TEST_URL=http://127.0.0.1:3217 node --test tests/scenarios/foundation.test.js` passed five scenarios against the built host. Network sandbox required elevated execution. Chrome via native computer access showed a lobby and rendered player; the browser access host was unavailable. A subsequent Chrome scenario and capture passed. Need canvas teardown and entity lifecycle inspection, the required verified catalogue and source audit, and remaining fixture journeys before checkpoint can pass. The source catalogue is `docs/content/source-catalogue.json`; dispositions are in `docs/content/coverage.tsv`.

Batch continuation: inspected source and changed files, formatted code, and ran `npm run lint`, `npm run typecheck`, and `npm run build` successfully. An initial generated-output lint failure was corrected by excluding `build-host/` from source formatting and linting. No tests, host startup, browser journeys, or behavioral verification ran. All source catalogue entries remain blocked until their individual implementation and source questions are resolved. Matching, lobby readiness policy, equipment, interactions, and upgrade effects belong to later tasks.


Batch checks for YCCE-002 through YCCE-004 on 2026-11-14. Inspected source, generated catalogue records, ownership mapping, and changes. Ran dependency installation, Prettier, `npm run lint`, `npm run typecheck`, and `npm run build`. Typecheck initially rejected the old generated tsconfig path; changing to SvelteKit 3's `$app/tsconfig` resolved it. Final formatting check passed after formatting the existing product guide and updated config. No tests, browser runs, manual smoke journeys, or benchmarks ran. `npm audit` reported 11 advisories, four low and seven moderate, through deepmerge and minimatch. The registry's latest deepmerge remains affected; automatic suggested fixes downgrade framework packages to obsolete versions. No forced downgrade or unverified cross-major override was applied. Exact source values, legacy identities, and complete inventory evidence remain source-release questions in the catalogue. Four inserted tasks are assigned to YCCE-TEST-08, YCCE-TEST-09, and YCCE-TEST-10. No checkpoint passed and no implementation task's full completion box was checked.



| YCCE-033 | Verified at checkpoint | YCCE-TEST-05 | Four shared terrain regions, three water depths, adaptation and matching client ground and prediction. | `shared/arena.ts`, `shared/movement.ts`, `server/match/match.ts`, `src/lib/game-client/world.ts` | Pending. |
| YCCE-034 | Verified at checkpoint | YCCE-TEST-05 | Seeded biome boundaries and obstacles, validated routes and reserved sites, replenished resources, bounded retries and room retry errors. | `shared/arena.ts`, `server/match/match.ts`, `server/index.ts`, `src/lib/net/session.ts` | Pending. |
| YCCE-035 | Verified at checkpoint | YCCE-TEST-05 | Time-based populations and tiers, native biome variants, elite spawns, bounded budgets and safe boundary migration. | `server/match/bots.ts`, `server/match/match.ts`, `shared/match.ts`, `src/lib/game-client/world.ts` | Pending. |
| YCCE-036 | Verified at checkpoint | YCCE-TEST-05 | Foraging, pursuit, attack, fleeing, bot hostility, navigation, staged resource competition and kill provenance. Future ally creation remains with its own task. | `server/match/bots.ts`, `server/match/match.ts` | Pending. |
| YCCE-037 | Verified at checkpoint | YCCE-TEST-05 | Server day and night clock, source-keyed future duration adjustments and phase stat modifiers, world conditions, lighting and phase HUD. | `server/match/world-clock.ts`, `server/match/match.ts`, `shared/match.ts`, `src/lib/game-client/world.ts`, `src/lib/ui/MatchHud.svelte` | Pending. |
| YCCE-038 | Verified at checkpoint | YCCE-TEST-05 | Regional rain, heatwaves and blizzards with warnings and client presentation. | `server/match/weather.ts`, `shared/weather.ts`, `src/lib/game-client/world.ts`, `src/lib/ui/MatchHud.svelte` | Pending. |
| YCCE-038A | Verified at checkpoint | YCCE-TEST-05 | Thermal exposure, adaptation, recovery, environmental damage and cold movement penalty. | `server/match/match.ts`, `shared/weather.ts`, `src/lib/game-client/world.ts` | Pending. |
| YCCE-039 | Verified at checkpoint | YCCE-TEST-05 | Server sight filtering, limited public arena data and cleared client traces on perspective changes. | `server/match/perception.ts`, `server/match/match.ts`, `shared/match.ts`, `src/lib/game-client/world.ts` | Pending. |
| YCCE-039A | Verified at checkpoint | YCCE-TEST-05 | Senses-based coarse navigation hints without target coordinates or identities. | `server/match/perception.ts`, `server/match/match.ts`, `shared/match.ts`, `src/lib/ui/MatchHud.svelte` | Pending. |
| YCCE-TEST-05 | Verified at checkpoint | YCCE-TEST-05 | Scoped world, adaptation, director, weather, visibility and browser checks passed. | `tests/scenarios/checkpoint05*.js`, `test-results/checkpoint05/` | Completion authorized by user on 2026-11-15. |
| YCCE-040 | Verified at checkpoint | YCCE-TEST-06 | Per-player discoveries, site reservations, bounded protection, cancellation and contested claims; behavior pending. | `server/match/points-of-interest.ts`, `server/match/selection-window.ts`, `server/match/match.ts`, `shared/arena.ts`, `shared/match.ts`, client UI and renderer. | Completion authorized by user. |
| YCCE-041 | Verified at checkpoint | YCCE-TEST-06 | Repair, progress, stat, adaptation and nest rewards; later firmware and ally options retain their owners. | `server/match/points-of-interest.ts`, `server/match/match.ts`, `docs/content/README.md` | Completion authorized by user. |
| YCCE-041A | Verified at checkpoint | YCCE-TEST-06 | Currency or random stats and eligible paid rare or legendary upgrades through the wallet. | `server/match/points-of-interest.ts`, `server/match/match.ts` | Completion authorized by user. |
| YCCE-041B | Verified at checkpoint | YCCE-TEST-06 | Opposing additive changes to future day and night phases. | `server/match/points-of-interest.ts`, `server/match/match.ts`, `server/match/world-clock.ts` | Completion authorized by user. |
| YCCE-042 | Verified at checkpoint | YCCE-TEST-06 | Private per-match effect permutation and visible unknown modules; scanning and use remain later tasks. | `server/match/firmware.ts`, `server/match/match.ts`, `shared/match.ts`, `src/lib/game-client/world.ts` | Completion authorized by user. |
| YCCE-042A | Verified at checkpoint | YCCE-TEST-06 | Host-authorized scanning with private per-player knowledge by appearance and senses-based identification. | `server/match/firmware.ts`, `server/match/match.ts`, `server/network/intents.ts`, `server/match/stats.ts`, `shared/firmware.ts`, `shared/match.ts`, `shared/protocol/index.ts`, `src/lib/net/session.ts`, `src/lib/ui/MatchHud.svelte`, `src/routes/+page.svelte` | Completion authorized by user. |
| YCCE-042B | Verified at checkpoint | YCCE-TEST-06 | Host-validated single-use modules, effects, status immunity and private feedback. | `server/match/firmware.ts`, `server/match/match.ts`, shared protocol and client HUD. | Completion authorized by user. |
| YCCE-042C | Verified at checkpoint | YCCE-TEST-06 | Giant Mushroom identification, corrosion-tick and spawning choices. | `server/match/points-of-interest.ts`, `server/match/match.ts`, `server/match/firmware.ts` | Completion authorized by user. |
| YCCE-043 | Verified at checkpoint | YCCE-TEST-06 | Finite size-based shelter, occupancy, cooldown, damage protection, boundary bypass and entry/exit hooks. | `server/match/match.ts`, `shared/match.ts`, shared protocol and client HUD/renderer. | Completion authorized by user. |
| YCCE-044 | Verified at checkpoint | YCCE-TEST-06 | Social-based bot charm, capacity and atomic ownership transfer with player exclusion and feedback. | `server/match/bots.ts`, `server/match/match.ts`, shared protocol and client HUD. | Completion authorized by user. |
| YCCE-044A | Verified at checkpoint | YCCE-TEST-06 | Owner follow, visible targeting, combat protection and causal salvage credit. | `server/match/match.ts`, `server/match/bots.ts` | Completion authorized by user. |
| YCCE-044B | Verified at checkpoint | YCCE-TEST-06 | Frozen specimen recruitment and nest defense with capacity, placement and transaction checks. | `server/match/points-of-interest.ts`, `server/match/match.ts`, client HUD | Completion authorized by user. |
| YCCE-045 | Verified at checkpoint | YCCE-TEST-06 | Bounded summons, offspring and decoys with delayed work and lifecycle cleanup. | `server/match/bots.ts`, `server/match/match.ts`, `shared/match.ts` | Completion authorized by user. |
| YCCE-046 | Verified at checkpoint | YCCE-TEST-06 | Host-controlled size, collider, mass, reach and model scale. | `server/match/match.ts`, `src/lib/game-client/world.ts` | Completion authorized by user. |
| YCCE-046A | Verified at checkpoint | YCCE-TEST-06 | Bounded mass-relative pulls with collision and endpoint cleanup. | `server/match/match.ts` | Completion authorized by user. |
| YCCE-TEST-06 | Verified at checkpoint | YCCE-TEST-06 | Scoped exploration, firmware, shelter, ally and physical behavior passed; see consolidated report. | `tests/scenarios/checkpoint06*.js`, `test-results/checkpoint06/` | Completion authorized by user. |



Batch implementation on 2026-11-15. Selected YCCE-044A, YCCE-044B, YCCE-045, YCCE-046 and YCCE-046A; YCCE-TEST-06 is now due and owns behavioral verification. The [wiki map](https://everythingiscrab.wiki.gg/wiki/Points_of_Interest) describes the free random frozen-specimen ally and a one-minute nest defense; the [enemy reference](https://everythingiscrab.wiki.gg/wiki/Enemies) describes up to eight Crawlees, and [evolution reference](https://everythingiscrab.wiki.gg/wiki/Evolution) describes the decoy and tracking effects. Wiki search-index excerpts were used because direct access returned 403; source fidelity is unverified. Playable estimates, subject to revision: follow radius 3, target radius 12, owner leash 20 and follow speed 1.2; global entity budget 32, summon/offspring/decoy caps 4/8/2 and 16 pending; summons inherit 35% owner hull (decoys 20%) and 50% physical damage, with bounded size and speed. The nest has 60 estimated integrity, loses 3 per second per nearby enemy within 2.5, and awards a tier-2 ally after 60 seconds. Size radius is size/200 clamped to 0.25–1.5, with mass from collider geometry and reach adjusted by radius; a blocked resize retries. Pulls use a 1.5 mass ratio for mutual displacement and limits of 5 seconds, range 15 and strength 20. These limits are design estimates, not measurements. Delayed summons and pulls expose host hooks for later ability integration; paid recruitment has a host transaction hook without inventing a paid wiki choice. At the checkpoint verify behavior against these estimates; entity-cost measurements remain pending. Inspected source and diff. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed. Build retained its large client-chunk warning. No tests, manual gameplay checks, or benchmarks ran.

Batch implementation on 2026-11-15. Selected YCCE-042B, YCCE-042C, YCCE-043 and YCCE-044; YCCE-TEST-06 owns behavior and is not due. Per user direction, the [wiki map](https://everythingiscrab.wiki.gg/wiki/Points_of_Interest) takes precedence over conflicting references: all modules grant progress, Medicinal heals over four seconds, poison lasts four seconds, Lethal scales with maximum hull, Spicy and Refreshing affect temperature and respectively speed and cooldowns, Entertaining and Amusing add ally capacity, Mystic adds a random permanent stat, and the Giant Mushroom spawn choice adds 10%. Standard-size shelter lasts five seconds. Wiki access was via search index because the site returned 403; pinned-version fidelity remains unverified.

Where unspecified, provisional values are: base/yummy/delicious progress 10%/20%/40% of a level; healing 5% of maximum hull per second; corrosion 2/5/20%-maximum-hull per tick; thermal exposure 30, spicy speed +20% for five seconds, refreshing cooldown reduction three seconds; Mystic +10% of a random core stat with minimum 0.5; Prolific +10% spawn frequency; sensory effects ten seconds. Nutritious and inert grant only base progress; no sound system exists yet, so Deafening has a visible state but no audio output to modify. Baseline module spawn interval is 30 seconds, modified by living players' spawn bonuses. Shelter duration is 500000/size milliseconds clamped to 3–15 seconds, with a 15-second cooldown and range 3. Charm capacity is social/5 rounded down, capped at 12 before firmware slots; chance is social/10 clamped to 5–90%, halved for elites, with a five-second per-target retry delay and range 3. These are playable estimates, not pinned-source facts. Charm follow and combat belong to YCCE-044A; firmware-linked later abilities remain their assigned tasks. Inspected source and diff. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed; build retained its large client-chunk warning. No tests, gameplay checks, or benchmarks ran.

Batch implementation on 2026-11-15. Selected YCCE-042A; YCCE-TEST-06 owns behavioral verification and is not due. The unversioned [mushroom reference](https://hinamizawa.ai/everything-is-crab/mushrooms/) reports identification chances at source senses 0, 0.5, 1, 1.5, 2 and 2.5 of 0%, 5%, 25%, 60%, 90% and 100%. As a provisional estimate, interpolate those points at project senses 0, 50, 100, 150, 200 and 250, add the identification modifier in percentage points, and clamp to 0–100%. Scan range 3 is a project estimate. A fixed private roll per player and appearance permits retries after improved stats without repeated-click brute force. Pinned-source fidelity is unverified; the checkpoint should verify behavior against this documented estimate. Firmware consumption and POI bonuses remain later tasks. Inspected source and diff. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed; the build retained its large client-chunk warning. No tests, manual gameplay checks, or benchmarks ran.

Batch implementation on 2026-11-15. Selected YCCE-040, YCCE-041, YCCE-041A, YCCE-041B and YCCE-042. YCCE-TEST-05 passed; YCCE-TEST-06 owns behavioral verification. Source inventory and estimates are in `docs/content/README.md`. Discovery radius 8, interaction radius 3, ten seconds of cumulative protection per player per site, unprotected retries, and twelve biome-specific sites are project estimates. Discovery events are available for the future Nomadic and Pollinator tasks; their live integration remains with those tasks. Firmware scanning, knowledge and effects remain with YCCE-042A and YCCE-042B, and firmware and recruitment POI options remain with YCCE-042C and YCCE-044B. Source fidelity remains unverified. Inspected source and diff. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed. Build retained its large client-chunk warning. No tests, manual gameplay checks, or benchmarks ran. YCCE-TEST-06 is not yet due.

Checkpoint YCCE-TEST-05 on 2026-11-15. The shared scenarios in `tests/scenarios/checkpoint05.test.js` passed 13 cases. They check 24 varied seeds with an independent two-unit connectivity search, two nearby resource routes per start, site and center reachability, biome and water-depth queries, controlled snow travel, heat and cold exposure, plating bypass and recovery, night blizzard intensity, future phase duration changes, weather transitions and reconnect state, choice and boundary clocks, sensing, hidden players and projectiles, and spectator authorization. The seed geometry, interaction sites and reachable cells are in `test-results/checkpoint05/seed-routes.json`. A live hunter killed a forager and the player collected the third-party wreckage. A contested food source remained available until the player left. The director produced tier-two and tier-three bots within its population caps. Twenty existing checkpoint 04 scenarios also passed, including bot containment in the shrinking area.

The four-client browser scenario passed after a local loopback permission grant. One client drove across all four biomes. The clients saw active weather and the same day and night phase. Night packets omitted concealed opponents and exposed only coarse radar fields; minimap markers matched the permitted player list. Captures are in `test-results/checkpoint05/`. The browser fixture advances simulated world time and adds resistance to keep players alive; it does not represent a human playtest. No sound system or graphics quality setting exists in this scope. The 24-seed search establishes sampled grid connectivity, not a continuous-physics proof for every possible seed. The bounded generation error path was inspected but not forced. AI workload was not benchmarked, and the later ally ownership integration remains deferred. Provisional source values remain unverified against the pinned version. These limits leave the original tasks' full evidence and review boxes open. `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, and `git diff --check` passed. The build retained its large client-chunk warning.

Batch implementation on 2026-11-15. The unversioned [map reference](https://everythingiscrab.wiki.gg/wiki/Points_of_Interest) describes sand heatwaves, colder night blizzards and night visibility; an unversioned [player discussion](https://steamcommunity.com/app/3526710/discussions/0/834999523153608852/) describes thermal adaptation and senses indicators. Exact pinned-version values are unavailable. Estimated weather uses 15-second warnings and 60-second events: grass rain starts at 15 seconds on a 160-second cycle, water rain at 65 on a 200-second cycle, daytime sand heatwaves at 30 on a 150-second cycle, and snow blizzards at 35 on a 180-second cycle. Night blizzard intensity is 1.5 times. Thermal exposure builds at five units per second divided by `1 + adaptation / 100`, recovers at eight units per second, and causes three heat or two cold damage per second at 100 units; cold reduces speed to 70%. Existing environmental damage mitigation applies. Estimated sight is 96 units by day and `8 + 0.06 * senses`, clamped to 8–38, by night, reduced by 20% in rain or blizzards. Radar range is `14 + 0.2 * senses`, clamped to 14–80, with eight directions and three distance bands. Reserved POI sockets supply placeholder hints until their later interactive implementation. These choices and their source fidelity remain unverified. Inspected source and diff. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed. The build retained its large client-chunk warning. No tests, manual gameplay checks or benchmarks ran. YCCE-TEST-05 is now due and remains pending user review.

Batch implementation on 2026-11-15. Source and diff inspected. The [Steam discussion](https://steamcommunity.com/app/3526710/discussions/0/834999523153608852/) describes water slowing more with depth and snow slowing more than sand. It is an unversioned player report, not proof for the pinned version. The implementation estimates sand and snow penalties at 20% and 30%, and shallow, medium and deep water at 35%, 50% and 60%, before adaptation. The seeded rectangular regions and depth bands are project choices. The [official 1.1 notes](https://steamdb.info/patchnotes/23879270/) support biome-dependent enemies and different enemy sizes; the implemented roles and native adaptation are estimates. The director estimates populations of 4, 6 and 8 and tiers 1, 2 and 3 at zero, six and twelve minutes. It estimates elite health at twice normal, damage at 1.5 times, at most two elites, and a 15-second spawn interval. Foraging consumes one stage per four seconds, and map resources replenish every 20 seconds. The [map reference](https://everythingiscrab.wiki.gg/wiki/Points_of_Interest) describes a mutable day and night cycle; 180-second days and 120-second nights are estimates. The clock sums per-source integer adjustments and clamps future phases to 10 through 600 seconds. All of these values and their pinned-version source fidelity remain unverified. Geometry uses a two-unit navigation grid and one-unit clearance; the checkpoint must verify continuous movement, generated seeds and the finale. POI and shelter sites are reserved for their later interactive systems. Allies are not yet created by this batch, so live charm integration remains later work. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed. The build retained its large client-chunk warning. No tests, manual gameplay checks or benchmarks ran. YCCE-TEST-05 is pending and is not yet due.

## Appendix J. Copy a bounded execution prompt

### Implement the next ordinary task or a small batch

Change only `Batch size: 1` to `Batch size: 2` or `Batch size: 3` when wanted. Keep one as the default. Leave `Task IDs: next` for plan order, or replace `next` with specific IDs. Explicit IDs must fit the requested size and dependency order.

```text
/poteto-mode new task

Project: You Can Crab Everything
Batch size: 1
Task IDs: next

Follow the updated execution policy in IMPLEMENTATION_PLAN.md Appendix I.
This is an implementation batch. That policy overrides conflicting per-task
testing, review, delegation, and pstack playbook instructions for this request.

Select at most the requested number of ordinary tasks in original plan order.
Use the implementation record to skip work already implemented but awaiting
its checkpoint. Read the selected tasks, their dependencies, relevant source
records, and code. Do not reread all 216 tasks or restart settled design work.
State the selected IDs, dependency status, and assigned checkpoint, then work.
Do not select or cross a due checkpoint. Do not execute checkpoint-only IDs
as ordinary tasks. Complexity or extensive research does not justify skipping
the next eligible task or ending the batch early.

Implement the selected scope with one local owner and the agreed architecture.
Do not launch automatic subagents, design competitions, review swarms, PRs,
or commits. Make necessary supporting changes without taking on unrelated
sibling tasks. Work through obstacles until the selected tasks are implemented.
Research missing facts, diagnose failures, repair implementation prerequisites,
and try available alternatives. When exact game information is unavailable or
conflicts, use the best-supported estimate or calculation and implement it.
Use available evidence and the agreed game rules. If comparable evidence is
also unavailable, use your best judgment to choose a coherent, playable default.
For example, estimate base health and regeneration from the intended combat
balance when the original values cannot be found. Missing game information alone
is never a blocker; do not wait for perfect data or user approval. Record the
estimate, its basis, and its uncertainty in the
compact record or an existing source record. Keep estimates easy to revise.
Do not present them as verified source facts or invent evidence. At the assigned
checkpoint, verify behavior against the documented estimate and report source
fidelity as unverified. An estimate alone must not block implementation or the
checkpoint. Do not stop merely because the work is large, a repair is
substantial, or an initial approach fails. Do not require another prompt for
necessary work already authorized by this batch.

Do not write, modify, or run tests in this batch or at its end. This includes
unit, component, regression, integration, browser, and end-to-end tests.
Do not run benchmarks or substitute repeated manual smoke tests. The original
Verification steps and Evidence required belong to the assigned checkpoint.
Defer test fixtures and test automation too. Keep production validation and
runtime guards in the implementation. Required decision experiments remain
limited to the observations that settle their stated question.

Inspect the source and diff. Consolidate useful existing static checks at the
end of the batch. Do not disable enforced checks. Fix known implementation
failures before dependent work. Stop for a blocker only when progress requires
unavailable user input, authorization, or an external change after reasonable
alternatives have been tried. Report the obstacle, attempted remedies, and
exact next requirement. Preserve resumable progress if an execution limit
interrupts the work. Apply the estimate policy to source-fidelity requirements.
Do not invent evidence, weaken other acceptance conditions, or bypass the
testing policy or checkpoint boundaries to claim completion.

Update documentation only where the changed capability needs it, using
technical-writing and unslop. Prefer an existing reader guide. Keep public
documentation independent of task IDs and private evidence. Do not create
one document or receipt per task.

Update the compact implementation record. Mark finished implementation as
Implemented, checkpoint pending. Do not mark behavioral verification or full
completion as passed. Report selected IDs, changes, actual static checks,
pending checkpoint, and any unfinished work or blocker. Keep the report short.

Stop after this batch for my review. Do not start another batch or checkpoint.
```

### Run or resume one major testing checkpoint

Use this separately from the implementation prompt. Set the ID explicitly when resuming a partial checkpoint. The checkpoint owns all testing-focused original IDs listed in its scope, so those IDs do not create additional test cycles.

```text
/poteto-mode new task

Project: You Can Crab Everything
Checkpoint ID: next due

Execute only this checkpoint under IMPLEMENTATION_PLAN.md Appendices I and K.
Confirm its covered tasks and dependencies. Read its previous progress and
reuse valid evidence. Do not start ordinary tasks from the following segment.

Testing is authorized for this checkpoint. Consolidate its deferred acceptance
conditions into meaningful regression, integration, and end-to-end scenarios.
Use shared fixtures and test actual player or Match behavior. Do not create
one suite per task, mirror implementation details, or repeat unrelated suites.
Use one owner without automatic reviewer swarms or parallel candidate runs.

Run the integrated scenarios and inspect the real result. Diagnose and repair
failures within the checkpoint's intended product scope. Rerun affected cases.
Expand regression only when the fix or observed failures justify it.

Keep the run bounded. If the checkpoint is too large or needs human sessions,
record the exact revision, valid results, open failures, remaining cases, and
next step. A partial checkpoint stays pending and must resume from that record.
Never convert a failed or unavailable observation into a pass.

Keep one consolidated checkpoint report. Update the implementation record and
the original task boxes only when their completion conditions and review
requirements are satisfied. Report passed cases, actual commands, evidence,
repairs, unfinished checks, and limitations. Do not promise measured results
that were not collected.

Stop after this checkpoint or bounded continuation for my review.
```

These templates bound selected work and remove routine test and agent cycles. They do not guarantee how many tasks fit the remaining included usage. The latest user preference is one task by default, with two or three selected deliberately.

## Appendix K. Execute the appended major testing tasks

The following 16 tasks are the testing checkpoints. Each opens only at its boundary in Appendix I. Original implementation tasks keep their definitions above. A checkpoint can use implementation handoffs from its covered segment before their behavioral verification is complete. A previous checkpoint must pass before work crosses into the next segment.

### YCCE-TEST-01. Verify the authoritative foundation from host to browser

- [x] Pass YCCE-TEST-01 and record review.

**Depends on.** Implementation through YCCE-010 and resolved source decisions needed by that implementation.

**Covered tasks.** YCCE-001 through YCCE-010.

**Components.** Production host, local assets and WASM, Match lifecycle, canonical registry, protocol boundary, observation stream, and client canvas.

**Observable outcome.** One built Node host delivers a real authoritative fixture world to a browser with consistent UI state.

**Acceptance conditions.** Host startup and teardown work. Match owns mutable state. Invalid commands cannot mutate it. Private data does not enter public observations. Content validation rejects unsupported selectable records. Source and catalogue decisions have an auditable record.

**Verification steps.** Establish shared test utilities once. Run a host-to-browser journey, valid and rejected lifecycle commands, a malformed or duplicated intent case, a content-release rejection, and a hidden-observation case. Reuse the same setup across these checks. Inspect local asset requests and client teardown.

**Evidence required.** One checkpoint report with revision, setup commands, source-audit references, actual scenario results, and representative browser capture. Do not generate a receipt per original task.

### YCCE-TEST-02. Verify handling, input, and selection decisions together

- [x] Pass YCCE-TEST-02 and record review.

**Depends on.** YCCE-TEST-01 and implementation or decision work through YCCE-016.

**Covered tasks.** YCCE-011 through YCCE-016.

**Components.** Physics course, camera, mouse projection, input lifecycle, networking choice, protected-choice prototype, and UI prototype.

**Observable outcome.** A player can move, aim, lose focus safely, and understand a timed choice using the selected design.

**Acceptance conditions.** Decision evidence supports the chosen handling and networking approach. Inputs expire. Motion is stable. Protection cannot chain indefinitely. Long choices remain readable at the target laptop resolution.

**Verification steps.** Reuse valid experiment observations from YCCE-011, YCCE-014, YCCE-015, and YCCE-016. Add one integrated course covering movement, independent aim, focus loss, the selected network profile, and choice expiry. Persist regression only for behavior likely to break. Do not rebuild all discarded prototypes or repeat valid comparisons.

**Evidence required.** Consolidated decision references, selected parameters, integrated course results, and a short recording of motion and choice behavior.

### YCCE-TEST-03. Verify the shared combat, resources, and starter progression

- [x] Pass YCCE-TEST-03 and record review.

**Depends on.** YCCE-TEST-02 and implementation through YCCE-025H.

**Covered tasks.** YCCE-017 through YCCE-025H, including YCCE-017A.

**Components.** Room isolation and limits, lobby identity, readiness, loading, spawns, derived stats, damage, healing, statuses, attacks, equipment, bots, salvage, wallet, XP, level rewards, and starter effects.

**Observable outcome.** Four clients enter the same world, fight, contest resources, and gain correct levels and real starter effects. Separate rooms remain independent.

**Acceptance conditions.** Room limits, identities, coordinated starts, loading recovery, and usable spawn exits hold. Damage, healing, statuses, hit deduplication, causal credit, and simultaneous deaths are authoritative. Equipment preserves learned benefits and cooldowns. Bot rewards, four-stage salvage, provenance, and wallet transactions cannot duplicate. XP overflow is conserved. Level growth and refill occur once. Levels 12 and 24 replace ordinary rewards. Every enabled starter rank and rarity has its real effect.

**Verification steps.** Use one shared join-to-combat-to-salvage-to-level journey. Add focused cases for two-room isolation and room limits, delayed loading, identity rejection, spawn exits, mitigation, actual healing versus overheal, status overlap, duplicate contacts, causal reactions, equipment swaps, contested stages, duplicate spending, threshold crossings, and pending reward order. Exercise starter effects through validated grants until normal offers arrive. Consolidate shared setup and ledgers rather than running separate sub-checkpoints.

**Evidence required.** One consolidated report with room and loading results, combat and resource ledgers, XP and starter-effect comparisons, and a representative integrated recording. Reuse one recording and shared fixtures across covered tasks.

### YCCE-TEST-04. Verify protected upgrades and the first complete match

- [x] Pass YCCE-TEST-04 and record review.

**Depends on.** YCCE-TEST-03 and implementation through YCCE-032.

**Covered tasks.** YCCE-026 through YCCE-032.

**Components.** Eligibility, pools, rarity, affinity, fixed choice deadlines, queued prompts, owned-offense suppression, personal Carcinisation, elimination, spectating, shrinking territory, meteors, results, HUD, and rematch.

**Observable outcome.** Four players acquire legal upgrades during a live match, resolve a finite one-life conflict, and return to a clean lobby.

**Acceptance conditions.** Offers exclude banned, maxed, and unsupported choices. Ordinary and branching pools stay distinct. Expiry chooses a displayed option. Protection is stationary, suppresses owned offense, and cannot reset through queues, retries, or reconnect; passive XP continues. Risk affects only its chooser against bots and humans. Death is final and spectating respects permitted views. Bots persist in the finale. Meteors and lethal collapse resolve a winner or draw. Rematch clears gameplay power and pending state.

**Verification steps.** Run one earned offer-to-choice-to-finale journey and rematch. Share focused fixtures for prerequisites, exclusions, affinity, duplicate or stale choices, rapid XP, expiry races, existing projectile offense, personal risk, simultaneous lethal outcomes, extreme-defense collapse, and reset. Include one real-time deadline observation. Defer ally and field integrations until those systems exist. Reuse unchanged combat and resource results from YCCE-TEST-03.

**Evidence required.** One shared report with offer and choice transactions, protection timing, personal-risk and outcome results, a match and rematch recording, and the explicit remaining-content report.

### YCCE-TEST-05. Verify biomes, weather, and information boundaries

- [x] Pass YCCE-TEST-05 and record review.

**Depends on.** YCCE-TEST-04 and implementation through YCCE-039A.

**Covered tasks.** YCCE-033 through YCCE-039A.

**Components.** Generation, terrain, water depth, director, bot roles, day/night, regional weather, temperature, spotting, and radar.

**Observable outcome.** Players traverse a varied world with real environmental tradeoffs and correctly limited information.

**Acceptance conditions.** Maps have usable routes and fair starts. Terrain and thermal adaptation remain distinct. Bot roles and scavenging work. Final-area bots persist. Graphics settings cannot reveal hidden opponents or exact unauthorized target references.

**Verification steps.** Run a bounded seed sample and one four-biome journey through day/night and weather transitions. Compare adapted and unadapted craft. Inspect negative packet cases for hidden entities, radar hints, events, sounds, and spectators. Use the shared world fixture rather than separate browser runs per weather or sensor task.

**Evidence required.** Seed and route report, exposure comparisons, packet assertions, and representative day/night and weather captures.

### YCCE-TEST-06. Verify exploration rewards, firmware, shelter, and allies

- [x] Pass YCCE-TEST-06 and record review.

**Depends on.** YCCE-TEST-05 and implementation through YCCE-046A.

**Covered tasks.** YCCE-040 through YCCE-046A.

**Components.** Discovery, POI claims and purchases, repair and progression rewards, clock rewards, firmware mapping and scanning, harmful and positive effects, shelter, charm, recruitment, companion combat, summons, decoys, physical size, and mass-relative pulling.

**Observable outcome.** Players contest exploration rewards, learn private firmware information, retreat briefly, and recruit allies with consistent physical behavior.

**Acceptance conditions.** Claims and purchases are atomic. Discovery differs from ownership. Every implemented reward has a real outcome. Firmware mappings agree within a match and reset between matches; secret mappings remain private. Shelter expires and cannot defeat collapse. Humans cannot be charmed. Ally ownership, recruitment, caps, offspring, and decoy cleanup hold. Collider changes and pulling cannot duplicate contacts or trap craft.

**Verification steps.** Combine POI races, clock rewards, two-player scanning, firmware use, retreat, and recruitment in one exploration-to-ally-combat journey. Use shared cases for duplicate or unaffordable purchases, firmware effects and knowledge, shelter with choices and collapse, charm races, targeting, owner death, summon categories and caps, collider changes, and three mass relationships. Reuse the same setup and transaction ledger.

**Evidence required.** One consolidated reward and firmware matrix, claim and wallet ledger, knowledge assertions, ally and shelter lifecycle results, physical comparisons, and a representative exploration recording.

### YCCE-TEST-07. Verify the complete progression and effect runtime

- [x] Pass YCCE-TEST-07 and record review.

**Depends on.** YCCE-TEST-06 and implementation through YCCE-051.

**Covered tasks.** YCCE-047 through YCCE-051.

**Components.** Triggers, equipment, currency, rerolls, rarity purchases, branches, specializations, queue rules, and visual bindings.

**Observable outcome.** A player changes and specializes a build through real transactions without losing benefits or exploiting deadlines.

**Acceptance conditions.** Trigger causality is bounded. Learned and equipped effects differ correctly. Cooldowns cannot reset through swapping. Rerolls clear temporary rarity purchases. Costs and rewards conserve currency. Branches replace ordinary offers. Specialization and skip prompts resolve once.

**Verification steps.** Use a shared progression journey and a compact transaction matrix for expiry races, duplicate delivery, insufficient funds, branch levels, rank-sensitive exclusions, specialization skips, and modifier recomputation. Compare equivalent rank and rarity acquisition orders. Recheck protected owned offense with the now-complete effect runtime.

**Evidence required.** Transaction matrix, graph reachability, trigger traces, and one acquisition-to-equipment-to-specialization recording.

### YCCE-TEST-08. Verify chassis, weapons, follow-ups, and movement builds

- [x] Pass YCCE-TEST-08 and record review.

Review: passed on the current working tree after independent acceptance review. See `docs/evidence/YCCE-TEST-08/receipt.md` and `docs/verification/checkpoint08.md` for runtime matrices, the four-client recording, estimates, and the explicitly deferred checkpoint 09/10 interactions.

**Depends on.** YCCE-TEST-07 and implementation through YCCE-057D.

**Covered tasks.** YCCE-052 through YCCE-057D, including later source-reconciliation inserts.

**Components.** Chassis and mobility roots, limb and heavy attacks, ranged weapons, siphon, automatic follow-ups, corrosion, movement abilities, and their source specializations.

**Observable outcome.** Players follow legal chassis-to-weapon paths and combine distinct attacks, follow-ups, and traversal abilities with real source effects.

**Acceptance conditions.** Every covered ability, rank, rarity, and specialization has its source effect. Locomotion exclusions, rank gates, Arthropod risk, mount alternatives, terrain and thermal behavior hold. Maximum-HP scaling, self-damage caps, passive retention, ammo, plating bypass, stun bonuses, tracking, rooting, and mass-relative pulls are correct. Drain uses actual damage and healing. Follow-ups do not consume slots or recurse. Salvage-speed and currency scaling work. Movement respects planar collision rules, including Leap's obstacle-crossing exception, cooldowns, immunity timing, and boundary harm. Aliases do not duplicate abilities.

**Verification steps.** Extend one shared ability fixture and source comparison matrix. Exercise live chassis-to-weapon acquisition, exclusions in both orders, unusual specializations, heavy and ranged attacks on shared targets, siphon and follow-up causality, and movement expiry on one course. Check future Saliva-to-Spit eligibility here; its live route belongs to YCCE-TEST-09. Live coating integration belongs to YCCE-TEST-10. Consolidate comparisons and captures instead of creating a suite or recording per card.

**Evidence required.** One combined ability and specialization matrix, legal graph paths, damage and healing traces, movement comparisons, and representative combined-build footage. Keep later live interactions explicitly pending.

### YCCE-TEST-09. Verify resource, diet, size, and defensive builds

- [ ] Pass YCCE-TEST-09 and record review.

**Depends on.** YCCE-TEST-08 and implementation through YCCE-061M.

**Covered tasks.** YCCE-058 through YCCE-061M, including later source-reconciliation inserts.

**Components.** Salvage, storage, reserve consumption, passive XP, diets, size, physical and ability power, handling, dodge, plating, defenses, retaliation, healing growth, delayed damage, and timed blocking.

**Observable outcome.** Resource-focused, large, small, agile, and defensive builds produce distinct source-derived outcomes without bypassing the finite match.

**Acceptance conditions.** Source and kill provenance survive collection. Diet prerequisites and exclusions hold. Storage and passive XP conserve progress without infinite protection. Actual healing, repair conversion, and overheal stay distinct. Size, hull, power, dodge, cooldowns, and movement penalties follow source formulas. Current plating differs from maximum plating. Acquisition order produces equivalent stats and authoritative geometry matches scale. Material exclusions and thermal benefits hold. Retaliation is bounded; delayed damage kills once. Healing growth and timed defense cannot defeat collapse.

**Verification steps.** Use shared resource, stat, and combat fixtures for one salvage-to-build journey and a compact diet and defense matrix. Prove live Saliva-to-Spit acquisition. Cover reserve consumption, XP thresholds and queues, acquisition order, neutral versus small and large builds, depleted plating, seeded dodge, reflected contacts, delayed lethal damage, healing thresholds, material conflicts, and early, correct, and late blocks. Reuse unchanged collision, choice, and boundary evidence.

**Evidence required.** One combined resource and defense report with source formula comparisons, provenance and XP conservation, live Saliva route, specialization results, damage and healing ledgers, and representative combined-build footage.

### YCCE-TEST-10. Verify the remaining upgrades and complete cross-system graph

- [ ] Pass YCCE-TEST-10 and record review.

**Depends on.** YCCE-TEST-09 and implementation through YCCE-067H.

**Covered tasks.** YCCE-062 through YCCE-068, including later source-reconciliation inserts. Execute YCCE-068 within this checkpoint.

**Components.** Sensing, cognition, tracking, decoys, corrosion and secretion fields, command and summons, environment and discovery effects, shelter upgrades, ultimates, late-match upgrades, catastrophe resistance, and full build integration.

**Observable outcome.** The complete applicable catalogue supports distinct legal builds, permitted information, and a finite final conflict.

**Acceptance conditions.** Every covered ability and specialization has accountable source behavior. Sensor changes affect permitted observations and scanning stays private. Rank gates, all Tracker routes, shelter-exit effects, and decoys work. Firmware creation, compatible coatings, charm, ownership, offspring caps, and Jet prerequisites hold. Protected owners cannot deal or bank ally or field offense. Discovery, actual healing, phase changes, shelter XP, channels, self-stun, ultimate scaling, and cooldowns follow source rules. Late-pool gates and repeat behavior work. Meteor and ally defense remain useful without defeating collapse. No remaining record lacks an evidenced behavior or individual disposition.

**Verification steps.** Use one shared ability and specialization matrix with focused status, ownership, information, environment, and ultimate fixtures. Prove More Eyes, Snout, and Nomadic routes to Tracker; live coating compatibility; both secretion paths to Jet; protected field and ally suppression; cap boundaries; phase transitions; discovery revisits; shelter expiry; channel cancellation; and actual healing. Execute YCCE-068 through legal progression and the browser, including late-pool and unusual-effect cases. Reuse valid YCCE-TEST-08 and YCCE-TEST-09 evidence, including Saliva-to-Spit. Capture representative combined builds rather than a separate journey per ability.

**Evidence required.** One consolidated complete-graph and specialization matrix, ownership and damage traces, focused secrecy and suppression results, environment and ultimate comparisons, late-pool and meteor results, representative legal-build recordings, and explicit unresolved or approved content dispositions.

### YCCE-TEST-11. Verify the finished player journey and presentation

- [ ] Pass YCCE-TEST-11 and record review.

**Depends on.** YCCE-TEST-10 and implementation through YCCE-075A.

**Covered tasks.** YCCE-069 through YCCE-075A.

**Components.** Models, modular growth, world assets, effects, audio, menu journey, HUD, prompts, help, accessibility, quality, and rebinding.

**Observable outcome.** A new player can understand and control the game through every production interface.

**Acceptance conditions.** The UI follows `DESIGN.md` with the agreed gameplay exceptions. All prompt types, long text, errors, controls, settings, motion, and audio states are usable. Presentation never changes permitted information or gameplay rules. Runtime assets are local and have provenance.

**Verification steps.** Drive one integrated journey at laptop and larger desktop resolutions. Cover choices, equipment, specialization, POIs, firmware, shelter, spectating, results, settings reload, rebinding, muted audio, and reduced motion. Collect one screenshot set and a short representative recording. Do not repeat a screenshot tour per asset task.

**Evidence required.** Interface checklist, coherent screenshot set, asset provenance, actual preference and control results, and first-player comprehension findings.

### YCCE-TEST-12. Verify authority, reconnect, privacy, and repeated matches

- [ ] Pass YCCE-TEST-12 and record review.

**Depends on.** YCCE-TEST-11 and implementation through YCCE-076A.

**Covered tasks.** YCCE-076 through YCCE-078. Execute YCCE-077, YCCE-077A, and YCCE-078 within this checkpoint.

**Components.** Resume identities, loading recovery, aborts, input expiry, protocol validation, production bundles, viewer filtering, and resource cleanup.

**Observable outcome.** Clients recover honestly from connection problems and can play repeated clean matches without gaining authority or hidden information.

**Acceptance conditions.** Vulnerable craft stay vulnerable while disconnected. Eliminated players stay dead. Commands do not replay. Host loss aborts. Modified clients cannot invent outcomes. Production packets and bundles contain no withheld secrets. Old worlds, choices, allies, visuals, audio, and listeners do not survive reset.

**Verification steps.** Share one recovery scenario matrix across the original authority and privacy tasks. Inspect the built application's actual traffic and chunks. Run the defined repeated-match workload, including loading failures and host abort. Repair and rerun affected cases without restarting every unchanged case.

**Evidence required.** Recovery and rejection matrices, negative leakage results, resource and memory traces, and a reconnect-to-rematch recording.

### YCCE-TEST-13. Measure the supported host and client workload once

- [ ] Pass YCCE-TEST-13 and record review.

**Depends on.** YCCE-TEST-12.

**Covered tasks.** YCCE-079 and YCCE-079A. Execute both within this checkpoint.

**Components.** Host simulation, playing host browser, four clients, AI and entity budgets, snapshots, rendering, input response, and measurement probes.

**Observable outcome.** The supported late-match workload meets the recorded budgets on the target setup.

**Acceptance conditions.** Results include actual hardware, workload, sample method, tick and frame percentiles, input response, payloads, and deadline drift. No unsupported speed ratio, silent mechanical cut, or assumed 60 Hz claim passes.

**Verification steps.** Read benchmark-checklist once. Measure server and clients during the same workload rather than repeating a run for each original task. Profile observed bottlenecks. After optimization, repeat affected probes with comparable conditions. Do not run unrelated gameplay suites after every optimization unless the change can affect them.

**Evidence required.** Shared raw samples, profiles, budget comparison, supported limits, and four-client late-match capture. Preserve valid measurements when resuming this checkpoint.

### YCCE-TEST-14. Tune pacing and build viability with shared playtests

- [ ] Pass YCCE-TEST-14 and record review.

**Depends on.** YCCE-TEST-13.

**Covered tasks.** YCCE-080 and YCCE-081. Execute both within this checkpoint.

**Components.** Match telemetry, progression and survival tuning, finale timing, source build archetypes, resource routes, and contested opportunities.

**Observable outcome.** Complete matches support the desired duration and useful varied builds without changing the agreed one-life rules.

**Acceptance conditions.** Report match duration separately from player survival. Retain immediate PvP, source graph behavior, persistent bots, personal risk, and hazard-based resolution. Fix demonstrated exploits. Do not claim universal balance from limited samples.

**Verification steps.** Use the same human sessions and telemetry for pacing and build review. Reuse valid paired scenarios from YCCE-TEST-10. Collect the agreed sample over as many bounded requests as necessary. Test changed tuning and its affected regressions. Do not rerun a completed playtest merely to satisfy both original IDs.

**Evidence required.** Shared duration and build report, sample limitations, tuning diffs, focused exploit regressions, player observations, and complete-collapse proof.

### YCCE-TEST-15. Audit release coverage and close missing behavior

- [ ] Pass YCCE-TEST-15 and record review.

**Depends on.** YCCE-TEST-14.

**Covered tasks.** YCCE-082. Execute it within this checkpoint.

**Components.** Canonical inventory, graph and specialization coverage, approved omissions, requirement matrix, and production release validation.

**Observable outcome.** Every applicable source record and agreed product requirement has an accountable implementation and valid evidence.

**Acceptance conditions.** No unowned applicable entry, selectable stub, name-only specialization, required subsystem gap, or unexplained omission. Original tasks awaiting evidence cannot be marked fully complete. Source counts remain evidence-based.

**Verification steps.** Reconcile the release manifest and requirement matrix. Follow each record to its behavior evidence from earlier checkpoints. Run catalogue validation and tests affected by changes since those results. Add missing meaningful cases where the audit finds an actual gap. Do not blindly replay every earlier suite when its evidence remains valid.

**Evidence required.** Final coverage report, original-task verification status, individual omission decisions, and a release-blocker list with no unresolved mandatory behavior.

### YCCE-TEST-16. Accept the production offline LAN game

- [ ] Pass YCCE-TEST-16 and record review.

**Depends on.** YCCE-TEST-15 and packaging and documentation implementation through YCCE-083A.

**Covered tasks.** YCCE-083 through YCCE-084. Execute YCCE-084 within this checkpoint.

**Components.** Delivered production distribution, installation instructions, local assets, four separate LAN clients, final walkthrough, and completion records.

**Observable outcome.** Four people can install, join, play, finish, and repeat complete matches without internet access.

**Acceptance conditions.** Appendix G passes against the delivered revision. Cold-cache runtime requests remain local. The host also plays. Installation and failure guidance works. No release blocker, undisclosed content cut, or unverified required behavior remains.

**Verification steps.** Execute the clean-install, cold-cache, four-device walkthrough and full match, then rematch and host shutdown. Use focused fixtures for rare outcome cases. Reuse valid coverage and capacity evidence for unchanged code and workloads. Do not recollect all earlier human sessions or duplicate the full catalogue matrix merely because this is the final checkpoint.

**Evidence required.** Consolidated acceptance report, exact package and revision identity, actual setup commands, LAN request log, match telemetry, representative recordings, known limits, and all original task and checkpoint outcomes.

Checkpoint continuation. Browser scenario uses Playwright Core and installed Chrome. `YCCE_TEST_URL=http://127.0.0.1:3217 node --test tests/scenarios/*.test.js` passed six cases after restarting the host. Screenshot is `test-results/foundation.png`. Per-player camera now follows each session player; movement, spatial filtering, and numeric map size remain future work. Source map research found no reliable dimensions; see `docs/experiments.md`.

Checkpoint continuation. `npm run checkpoint:foundation` started fresh production and fixture hosts, passed eight scenarios twice, skipped the opt-in intentional failure case, saved `test-results/foundation.png`, and shut down both servers. The deliberate failure run separately reported the actual lobby phase against the incorrect running expectation. Renderer browser coverage includes appearing, moving, removing and replacing entities, camera following, resize, and disposal. Source audit on 2026-11-14 counted 112 research-only records and 1,005 open record questions. A newly located asset-derived starting skills reference does not identify its game version; it cannot verify the pinned version. The live registry is empty and no source effect is implemented. The small valid catalogue exercised by tests is synthetic, not release content. YCCE-006 and checkpoint remain unverified until a source-backed, implemented catalogue exists and the version-specific audit is resolved.

Checkpoint continuation: `node scripts/audit-catalogue.mjs` checks identities, owners, evidence, 53 prerequisite edges, specialization targets, and symmetric exclusions. All 112 records are potentially reachable under an optimistic calculation that treats 83 unresolved prerequisites as satisfiable and ignores exclusions. This is not a legal-build proof. Selection activity now cannot exist without an offer, and stale observations are rejected by both renderer and UI. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run checkpoint:foundation` passed; nine scenarios passed, with the deliberate-failure demonstration skipped in the normal run. The source-backed production catalogue, source fidelity, and checkpoint completion remain open.

Checkpoint continuation: registered the agreed Standard fixed starting configuration with a real effect binding and stored its +15 maximum-health bonus per Match player. It is not selectable, and health totals and damage remain future work. Added server-owned per-viewer player concealment and verified hidden identities do not appear in the viewer packet; distance and sensing rules are not yet implemented. `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run checkpoint:foundation` passed. The checkpoint ran eleven passing cases and skipped its intentionally failing demonstration. Source upgrades remain research-only; YCCE-006 and YCCE-TEST-01 remain in progress.

Checkpoint continuation: fixed specialization validation so requirements refer to owned specialization IDs, with duplicate and unknown specialization rejection. Source catalogue loading rejects unexpected dispositions rather than silently blocking them. `python3 scripts/audit-inventory.py` maps all 112 seed rows, including provisional Carrion-to-Scavenger, and reports 44 represented reverse links plus three unresolved links. Community table and 1.1 developer notes distinguish account unlocks from in-run prerequisites but do not prove pinned-version relationships. `npm run checkpoint:foundation` passed 12 cases before the source-loader guard; typecheck and build passed afterward. Source upgrade subset remains unresolved.

Checkpoint continuation: reran `npm run checkpoint:foundation` after the catalogue loading guard and added a two-browser session check. Twelve scenarios passed, with the intentional failure case skipped. The two independently identified browsers converged on the same host player count. An initial assertion compared observations before delivery had converged and was corrected to wait for the shared state. Both browsers ran on the host machine; this is not a second physical device or LAN acceptance. Source upgrade subset and a version-specific source audit remain open.

Checkpoint continuation: clean install `npm_config_cache=/private/tmp/ycce-npm-cache npm ci` succeeded with Node 24.22.3 and npm 11.19.1 after a sandbox DNS failure. It reported 11 dependency advisories (4 low, 7 moderate). `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run checkpoint:foundation` passed on the clean install. Thirteen checkpoint scenarios passed, with the intentional-failure case skipped. The runner now confirms its own startup and waits for production host exit code 0; an occupied-port scenario also passed. Browser capture is `test-results/foundation.png`. The source decisions and second-device LAN verification remain incomplete.

Checkpoint continuation: saved a 103-name fan inventory and 101-name partial indexed community-table snapshot with source URLs and access date. `python3 scripts/audit-inventory.py` compares both to canonical candidates and flags tentative aliases. There are 94 shared candidate identities, nine fan-only and seven extract-only identities; the partial extract and unspecified versions make differences research leads rather than proof of additions or removals. Production browser scenario now checks that another actual connected player changes the first client canvas; 13 checkpoint scenarios passed. The version-specific source audit and verified upgrade subset remain unfinished.

Checkpoint continuation: added a real Match scenario confirming forged choices, stale revisions, unauthorized identities, oversized fields, injected damage, and out-of-phase control cannot mutate the player or consume an offer. The valid choice then queues and applies once. The 1.2.1 source audit found that the indexed Jaws card and Neoseeker disagree on Epic rank-two upper damage (1.6 versus 1.5); both versions and an owned question are recorded without release approval. `npm run checkpoint:foundation` passed 14 scenarios; its deliberate-failure case remains opt-in. Format and lint passed.

User direction on Plated: use the more recent source. The wiki table is selected as the working reference, with Neoseeker retained for comparison. The available sources do not establish exact edit dates for these two particular tables; treating the wiki as newer is an assumption, not verified chronology. The Plated gameplay effect and production release remain unimplemented.

Checkpoint continuation: the registry now loads the tentatively selected wiki Plated table as blocked, non-selectable data. Browser projections and eligibility exclude it; the actual Plated effect belongs to later work. The checkpoint passed 15 scenarios after this change. Correction after user question: neither the wiki Plated table nor the Neoseeker trait table has a verified edit date in the available evidence. The May 7 date applies to Neoseeker’s general guide, not necessarily its traits table. Wiki recency is unproven, and the working selection must not be reported as a verified newer version.

User direction: whenever the community wiki conflicts with Neoseeker, select the wiki. The Plated and Jaws comparisons now use the wiki values by preference while retaining both observations. This does not assert source chronology or 1.2.1 fidelity and does not release unimplemented effects.

Checkpoint continuation: user selected community wiki values over Neoseeker for conflicts, including Plated and Jaws. Loaded the selected Plated rank table into the server registry as blocked and non-selectable; no Plated gameplay effect is claimed. Added pool and reverse-exclusion eligibility indexes. `npm run typecheck`, `npm run build`, `npm run lint`, `npm run format:check`, and `npm run checkpoint:foundation` passed; 16 scenarios passed and the intentional failure case was skipped. A real socket client received no blocked catalogue entries. YCCE-006 and checkpoint remain in progress; Plated gameplay, source upgrade release, and second-device LAN evidence are not verified.

Checkpoint continuation: session rejection now distinguishes an unknown token from an already-active session and a full match. A browser with a duplicate active token retains it and does not create a new player. The duplicate-client scenario exposed a Socket.IO polling close timer that delayed shutdown; changing rejection to a namespace disconnect and closing outstanding HTTP connections on shutdown resolved it. `npm run typecheck`, `npm run build`, `npm run lint`, `npm run format:check`, and `npm run checkpoint:foundation` passed; 16 scenarios passed and the deliberate-failure case was skipped. Source upgrade implementation and second-device evidence remain pending.

Checkpoint continuation: corrected `npm run dev`, which previously served Vite without a realtime host. It now builds and starts the authoritative host, starts Vite, and proxies `/socket.io` to that host. With `PORT=3227 npm run dev`, headless Chrome connected through `http://127.0.0.1:5173` and displayed `Players: 1 / 4`; both processes stopped on Ctrl+C. Host code changes require restarting the development command. Lint and typecheck passed. This is local development evidence, not a second-device LAN result.

Checkpoint continuation: an isolated production-host scenario established four distinct connected identities, rejected a fifth with `match-full`, reconnected a reserved identity, and observed host exit code 0. `npm run checkpoint:foundation` passed 17 scenarios and skipped the opt-in deliberate failure. This is single-machine protocol evidence, not four-device LAN or performance evidence.

Checkpoint continuation: added YCCE-017A for configurable multiple rooms per host, assigned it to YCCE-TEST-03, and updated the later loading dependency. This is planned work, not implemented. The current checkpoint now clears the rendered world and Svelte observation when the session identity or match changes, preventing the previous match from remaining visible during replacement. `npm run typecheck`, `npm run build`, `npm run lint`, and `npm run checkpoint:foundation` passed; 17 scenarios passed and the opt-in failure case was skipped. The registry source upgrade and physical second-device LAN evidence remain pending.

Checkpoint continuation: added rank-specific player-facing descriptions derived from registry values. Invalid ranks and rarities and blocked content do not produce descriptions. `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run checkpoint:foundation` passed; 18 cases passed and the intentional failure case was skipped. The user confirmed no second physical device is available, so the required second-device LAN observation remains unavailable. Source upgrade effects remain owned by their later implementation tasks and are not claimed complete.

Checkpoint continuation: field-level catalogue audit found eight Bop fields without explicit evidence or owned questions; those questions are now recorded and the audit enforces this requirement for all records. The audit passes for 112 candidates with 1,013 owned questions. This does not claim source behavior is verified. The user confirmed no second physical device is available, so the second-device LAN observation remains outstanding.

### YCCE-TEST-01 consolidated checkpoint report

- Revision: uncommitted worktree based on `039a98c63dae42bc8e7644e7473b84a9f391426d`. SHA-256 `198d57b273f65fe25362d29911634eae34e76917fed498fc8136a89c8444e350` covers file paths and contents under `server/`, `shared/`, `src/`, `tests/`, `scripts/`, and `docs/`, plus package files, TypeScript and Vite configs, and `README.md`. The plan and generated outputs are excluded.
- Setup: Node 24.22.3 and npm 11.19.1. `npm_config_cache=/private/tmp/ycce-npm-cache npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm run build` passed. The clean install reported 11 dependency advisories: four low and seven moderate.
- Scenarios: `npm run checkpoint:foundation` passed 19 cases. Its opt-in intentional-failure demonstration was separately run and produced the expected failed assertion. Scenarios cover real production host and browser connection, local asset requests, session restart and reconnect, renderer lifecycle, four-player limit, host shutdown, Match transitions, invalid intents, private observations, and registry validation. Screenshot: `test-results/foundation.png`. Renderer fixture recording: `test-results/foundation-renderer.mp4` (appearance, movement, and removal; captured after checkpoint approval).
- Source audit: `node scripts/audit-catalogue.mjs` and `python3 scripts/audit-inventory.py` passed their structural checks. `docs/content/README.md` records the source comparisons and unresolved identities and fields. Questions assigned to later content tasks are not evidence of implemented effects. The real registry includes the agreed fixed Standard configuration; Plated and other unfinished upgrades are blocked.
- User waiver: the user requested skipping the second-physical-device check. Chrome on the host connected through the host's LAN address and received HTTP 200. This is not a second-device result and does not establish LAN capacity or performance. Later hardware acceptance remains required.
- Review: approved by the user on 2026-11-14, including the second-device waiver and later-task content work. The worktree digest still matches. Original full-completion boxes remain unchecked until their remaining task-specific evidence and review are recorded. The next checkpoint segment has not started.

Checkpoint review continuation: user approved YCCE-TEST-01, including the second-device waiver and later-task content work. Captured and inspected the renderer fixture recording requested by YCCE-009. Scoped foundation verification and its prerequisites are complete for this checkpoint. Original task completion boxes remain subject to any remaining task-specific evidence and later integration; no later checkpoint was started.

### YCCE-TEST-02 consolidated checkpoint report

- Revision: uncommitted worktree based on `039a98c63dae42bc8e7644e7473b84a9f391426d`. SHA-256 `b489a0400d6856e07abf2e748bbf73d8726066a632896a8f592560991f94aebf` covers the paths and contents of the 73 tracked or unignored untracked files from `git ls-files -z --cached --others --exclude-standard`, excluding this plan and generated outputs. Each path and content is preceded by its eight-byte big-endian length.
- Decisions: `docs/experiments.md` and the handling, network, protection, and choice-layout comparison JSON files record the previous decision observations. The selected handling uses speed 7 and acceleration 24 in a fixed 60 Hz Rapier step. Remote rendering buffers snapshots; local prediction is capped at 250 ms without a snapshot. The prototype uses a ten-second choice window and a two-second exposed interval.
- Repair: a regression demonstrated that opening an offer left the player's existing velocity active. The Match now stops and immobilizes the selecting craft, makes its collider a sensor while choosing, and restores normal motion and collision on exit. The failing regression passed after the fix. A second case confirms another craft can pass through and the chooser can move afterward.
- Scenarios: `node --test tests/scenarios/checkpoint02.test.js` passed four focused cases. `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ycce-playwright node scripts/checkpoint-02.mjs` passed the integrated course and the affected renderer lifecycle scenario, with two unrelated production-host cases skipped in that fixture-only run. A later focused run of `tests/scenarios/checkpoint02-browser.test.js` passed after the target-aim, live-map, and recording refinements. It exercised movement while aiming at a fixed target, blur, text entry, secondary click, a foreground obstacle, a manual keyboard choice, expiry, live map updates, and another simulated craft continuing during selection. Its artificial input delay varied from 35 to 65 ms, with 50 ms snapshot delay. One run each at simulated 30, 60, and 120 render callbacks per second produced approximately 6.99, 7.12, and 7.23 units of authoritative movement over the scripted interval; this is not a hardware performance measurement. Five affected foundation Match scenarios passed. Two affected production-browser lobby and host-restart scenarios passed against a separate local production host.
- Evidence: `test-results/checkpoint02/course.webm` is a 26.96-second 1366-by-768 recording. `test-results/checkpoint02/choice-1366.png` and `choice-1920.png` show the choice prototype at those viewport sizes. The operator inspected both screenshots and representative motion and choice frames. The choice descriptions are source-derived research paraphrases, not approved release copy. The scenario uses a Match and SelectionWindow fixture; actual combat, progression, and choice integration remain assigned to YCCE-027 and YCCE-027A.
- Static checks: `npm run build`, `npm run format:check`, `npm run lint`, and `npm run typecheck` passed. The build retains the large client-chunk warning. Playwright recording used the installed FFmpeg through `/private/tmp/ycce-playwright/ffmpeg-1013/ffmpeg-mac`.
- Limits and user direction: on 2026-11-14 the user said no other participants were available and requested that physically unavailable multiplayer tests be skipped. No four-person physical LAN session or three-person readability study was performed. The screenshots and automated choice do not establish independent human comprehension. The loopback decision experiment does not establish the p95 response budget on the target hardware or real LAN, and the prototype permission model does not prove future combat and boundary integration.
- Review: approved by the user on 2026-11-14 after the local results and skipped physical checks were reported. The recorded worktree digest still matches. Original task completion boxes remain unchecked until any remaining task-specific evidence is recorded. No later checkpoint has started.


### YCCE-TEST-03 consolidated checkpoint report

Checkpoint completed on 2026-11-14 against the current uncommitted worktree. The user authorized completion without a separate approval. The shared fixture and regression cases are in `tests/scenarios/checkpoint03.test.js`, `tests/scenarios/checkpoint03-rooms.test.js`, and `tests/scenarios/checkpoint03-browser.test.js`.

- `node --test tests/scenarios/checkpoint03.test.js` passed 26 cases. These cover the joined Match journey, bot combat and loot, all enabled starter stat ranks and rarities, every Body Slam rank and rarity at two physical and maximum-hull values, cooldowns and equipment swaps, Dash at three simulation rates and against a wall, spawn exits across three seeds, damage channels, protection, status overlap, reaction attribution, simultaneous deaths, projectile and bot wall blocking, repair and regeneration, contested salvage and source provenance, wallet retries, XP overflow, level 12 and 24 reward order, and passive progress during a choice. The bot, damage and collection assertions inspect the Match ledgers and player observations.
- The production host room scenario passed for two rooms, room and player limits, stolen and cross-room identity rejection, delayed loading and failure recovery, independent room state, cleanup, and replacement room creation. The local four-browser scenario passed coordinated join, readiness, loading, movement and collection to level 2. It sent Dash and attack controls and saved `test-results/checkpoint03/four-client-journey.webm` and `test-results/checkpoint03/four-client-journey.png`. The screenshot was inspected. It shows four connected players and level 2. The recording does not prove a four-person LAN session.
- The spawn scenario initially exposed unstable movement and vertical drift with the 1,000-unit ground collider. Reducing its half-width to 64 units, which covers the bounded arena, fixed the failed spawn scenario. The affected Match and four-browser scenarios passed after rebuilding. `npm run build`, `npm run format:check`, `npm run lint`, `npm run typecheck`, and `git diff --check` passed. The build retained the large client chunk warning.
- The tests exercise documented provisional values and do not establish pinned-version source fidelity. The user previously waived unavailable physical multiplayer observations. Normal randomized offers, later biome integration, and later cross-system upgrade scenarios remain assigned to their future tasks. Original task completion boxes remain open where later integration or individual evidence remains outstanding.


### YCCE-TEST-04 consolidated checkpoint report

Checkpoint completed against the uncommitted worktree based on `5404a3026a8125f2ca38f8a02983ebe3100f4324`. The user authorized completion without separate approval. Original task completion boxes remain open where later integrations or individual evidence remain outstanding.

- `node --test tests/scenarios/checkpoint04.test.js tests/scenarios/checkpoint03.test.js` passed 46 cases. The 20 new cases cover eligible and branching pools, rank and specialization prerequisites, exclusions, depleted offers, retained rarity, affinity weighting, stale choices and rerolls, deadline races, disconnect, queued prompts, projectile cleanup, passive XP, chooser protection, elimination and spectator visibility, claimant-specific risk and resource rarity, bots in the shrinking area, meteor damage, lethal collapse, winner and simultaneous draw. Synthetic selectable cards carry Carcinisation because no production starter card currently has that tag. The previous checkpoint's 26 combat and resource cases passed after updating three scenarios to account for automatic choice prompts.
- `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ycce-playwright node --test tests/scenarios/checkpoint04-browser.test.js` passed against the built local host. Four browser sessions joined and earned upgrades through salvage. The first saw Plated, Muscular Tissue, and Body Slam, and expiry occurred 9,885 ms after dialog detection; the results contained a displayed choice for each player. The first player was eliminated by a test-only host fixture, disconnected, reconnected, and spectated. The host clock was advanced to exercise the finale and draw. All four returned to the lobby, started a new match, and had level-one progress and starting equipment. The recording is `test-results/checkpoint04/journey.webm`; screenshots are in the same directory. The fixture uses IPC to advance time and eliminate a player, and the sessions ran on one computer. This is not an organic full-duration fight or a four-person LAN observation. The earlier user waiver for unavailable physical participants remains applicable.
- The HUD no longer tells an eliminated spectator to collect salvage or leave a meteor ring, and the choice dialog tells a protected player to finish choosing before viewing meteor danger. `npm run build`, `npm run typecheck`, `npm run lint`, `npm run format:check`, and `git diff --check` passed. The build retains its large client-chunk warning.
- Remaining content includes the full upgrade catalogue, selectable Carcinisation cards, biome and weather systems, allied units and fields. Later task checkpoints own those integrations. The current balance, affinity coefficients, threshold penalties, and finale schedule are provisional estimates. These tests establish behavior against the documented estimates, not pinned-version source fidelity.

### YCCE-TEST-06 checkpoint continuation

Paused at the user's request on 2026-11-15. The checkpoint remains pending. Base revision is `5404a3026a8125f2ca38f8a02983ebe3100f4324`, with an uncommitted worktree. The tracked diff SHA-256 at the pause was `1b6ff3b7b2880da90d50467c617dcae3bdcdb8bf6bfa713c6ed162a6ccd95633`; it excludes untracked files. The checkpoint Match scenario SHA-256 was `230494c64a7b12d4e532b8bf4fdbd47a3d0b04ad948c577037f8299454609194`.

`node --test tests/scenarios/checkpoint06.test.js` passed 18 cases before the last seven focused cases were added. Subsequent focused runs passed mushroom spawn timing, nest salvage with elite sites freed, grown attack contact, paid recruitment, boundary defeat of shelter, corrosion timing and immunity, medicinal timing and sensory expiry. The earlier full run covered claim races and discovery, wallet retry, firmware privacy and single use, all 16 identities' progress and selected immediate effects, shelter, summon caps and cleanup, companion combat and suppression, clock adjustments, nest defense, charm transfer, three mass relationships, and growth and pull near a wall. Tests use production Match and a shared Rapier fixture. Random firmware cases seek effects across multiple fresh matches. The nest-salvage case initially failed when a random elite was selected while every elite site was occupied. It passed after the fixture freed those sites; assess whether the failed transaction is acceptable and add an explicit occupied-site case.

`PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ycce-playwright node --test tests/scenarios/checkpoint06-browser.test.js` passed with local port access. Four local browser sessions joined; a host fixture moved one player to a site, firmware, and shelter. The video is `test-results/checkpoint06/exploration.webm`; screenshots `point.png` and `shelter.png` were inspected. It does not show continuous travel or ally combat. Browser startup first failed under the sandbox's local port restriction, then without the existing Playwright video encoder path. An initial two-client run could not start the four-player match, and an initial four-client run used the wrong dialog name. Both fixture issues were corrected.

Format, lint, typecheck, and `git diff --check` passed before the final focused cases were added. No production code was changed in this continuation. A 32-entity local cost probe in `tests/scenarios/checkpoint06-cost.js` did not produce valid measurements: a bot died during the timed interval and the end count was 31, so the run failed its work assertion. Do not report its timing. Next, make the workload stable without hiding failed work, rerun the probe and document its limits. Complete the reward and firmware matrix, including the legendary purchase, status boundaries and remaining effect-specific behavior; verify mapping and knowledge across actual rematches, claim expiry and eligibility edges, protection chains, ally follow and attribution, summon boundary and teardown, growth collision and pull endpoint cleanup. Extend the representative journey if needed to show recruitment and ally combat. Run the consolidated suite and affected static checks on the final revision. Record one final reward matrix, ledger and checkpoint report. Source fidelity remains unverified; compare behavior to the documented estimates. Do not mark this checkpoint or the covered tasks passed until all required evidence is complete.

### YCCE-TEST-06 consolidated checkpoint report

The scoped checkpoint passed on 2026-11-15. The user authorized completion without a separate approval. The base revision is `5404a3026a8125f2ca38f8a02983ebe3100f4324`; the worktree is uncommitted. The tracked diff SHA-256 is `224ecd5830189856a96afc6f7c00e3e0c23eca741a08210f54c4429bf58cea70`. It excludes untracked files. The Match source SHA-256 is `25b8fe777975ca204a8a12375592c024ab254f4f4c083577ceb0d7dff90c3e3e`, and the checkpoint Match scenario SHA-256 is `1f2310bf5d8baff0effbf5320093114e576be04f5a1593a354d425b3b45e1378`.

`node --test tests/scenarios/checkpoint06.test.js` passed 39 cases against the rebuilt host. The claim and wallet ledger checks include two discoverers and one claim, expiry, disconnect, out-of-range cancellation, duplicate and unaffordable spending, rare and legendary purchases, and paid and free recruitment. Claims remain available after a rejected purchase. The occupied-elite-site failure found during this checkpoint was repaired by searching nearby safe positions while retaining elite and shared entity limits; a forced elite roll passed with the original sites occupied.

The reward matrix covers algae hull and ability, carved-tree progress and physical, chaos currency and random stat, frozen recruitment and rare and legendary purchases, growing-tree physical, ability and random stat, healing pond and oasis repair and regeneration, lotus progress and eligible cooldown, mud adaptation and temporary resistance, nest social, rare salvage and defense, both sundial choices, and giant-mushroom identification, corrosion and spawn rate. The mud Tail-dependent option is ineligible in the current starter subset; its live prerequisite integration belongs to later upgrade work. The sundial checks cover the documented future phase lengths rather than source-version fidelity.

Firmware cases encounter all sixteen identities. All grant their documented progress fraction. The suite checks lethal, poisonous and stinging corrosion and immunity, medicinal healing, refreshing cooldown and cold, spicy movement and heat, deafening and hallucinogenic expiry, mystic stats, entertaining and amusing capacity, and prolific spawning. Inert and nutritious grant the common progress effect. Identification knowledge stays private between players, failed rolls stay stable until sensing improves, use is single-use, and knowledge survives reconnect. Field-level mapping cases check repeated appearances and new permutations. A real host rematch resets visible knowledge; the built client search did not find the host's effect-name inventory. These checks exercise the documented estimates. Pinned-source fidelity is unverified.

Shelter cases cover occupancy, three size-dependent durations, ordinary and boundary damage, collapse, cooldown and disconnect. Ally cases cover human rejection, charm ownership transfer, caps, protected offense, visible target selection, following, combat and ally-kill salvage credit, nest completion, delayed offspring, decoy attraction and protected suppression, expiry, owner death, disconnect, shrinking-area relocation and teardown. Physics cases compare all three mass relationships, wall cancellation, resize clearance, one enlarged contact hit, and pull cleanup on death and disconnect. Later abilities still own their production bindings to the summon and pull hooks.

The four-browser local host journey passed with `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ycce-playwright node --test tests/scenarios/checkpoint06-browser.test.js`. `test-results/checkpoint06/exploration.webm` records a site choice, scan and use, shelter, companion combat, and rematch. The host fixture moves actors, grants a companion and finishes the match. It is not continuous travel, natural recruitment, or a four-device LAN session. Screenshots of the site, shelter and ally combat were inspected. The user previously waived unavailable physical multiplayer observations.

A bounded local `node tests/scenarios/checkpoint06-cost.js` probe retained the same 32 bots and four players for 60 simulated ticks in each of five runs, with zero rejected ticks. The median `Match.advance` time was 0.432 ms per tick and the range was 0.403 to 0.587 ms. This short, single-machine observation excludes networking and rendering and is not a capacity or soak result. A separate profiled run sampled `view`, Rapier WebAssembly, garbage collection and companion logic; its timing was not used. The prior 600-tick attempt failed its entity-count assertion and produced no valid measurement.

`npm run build`, `npm run format:check`, `npm run lint`, `npm run typecheck`, and `git diff --check` passed. The build retains the large client-chunk warning. Original task completion boxes stay open where their individual evidence or later integration is not complete. No later checkpoint or implementation segment was started.

### Implementation batch continuation

Selected YCCE-047, YCCE-048, YCCE-049, YCCE-049A, YCCE-050, YCCE-050A, and YCCE-051 for YCCE-TEST-07. Earlier checkpoint dependencies passed. All seven passed this checkpoint.

| Task ID | Implementation state | Verification owner | Verification state | Changed paths or revision | Batch review |
|---|---|---|---|---|---|
| YCCE-047 | Verified at checkpoint | YCCE-TEST-07 | Shared triggers, causality, timers, and protected offense checked against documented estimates. | `server/match/runtime-effects.ts`, `tests/scenarios/checkpoint07.test.js` | Completion authorized by user. |
| YCCE-048 | Verified at checkpoint | YCCE-TEST-07 | Revision-checked slot changes, replacement defaults, learned abilities, and cooldown retention checked. | `server/match/match.ts`, `tests/scenarios/checkpoint03.test.js`, `tests/scenarios/checkpoint07.test.js` | Completion authorized by user. |
| YCCE-049 | Verified at checkpoint | YCCE-TEST-07 | Ordinary and branch reroll pricing, stale requests, expiry, and wallet conservation checked. | `tests/scenarios/checkpoint07.test.js` | Completion authorized by user. |
| YCCE-049A | Verified at checkpoint | YCCE-TEST-07 | Rarity purchases, selected result, reroll reset, and rank order checked. | `tests/scenarios/checkpoint07.test.js` | Completion authorized by user. |
| YCCE-050 | Verified at checkpoint | YCCE-TEST-07 | Branch replacement, rank-sensitive exclusions, and catalogue child reachability checked. | `server/content/registry.ts`, `tests/scenarios/checkpoint07.test.js` | Completion authorized by user. |
| YCCE-050A | Verified at checkpoint | YCCE-TEST-07 | Fixture specialization choice, skip, timeout, and duplicate handling checked; later ability tasks supply actual specializations. | `tests/scenarios/checkpoint07.test.js` | Completion authorized by user. |
| YCCE-051 | Verified at checkpoint | YCCE-TEST-07 | Module visibility, collision radius, combat cues, and live equipment display checked. | `tests/scenarios/checkpoint07*.js`, `test-results/checkpoint07/` | Completion authorized by user. |
| YCCE-TEST-07 | Verified at checkpoint | YCCE-TEST-07 | Progression and shared effect runtime checked; see evidence below. | `tests/scenarios/checkpoint07*.js`, `test-results/checkpoint07/` | Completion authorized by user. |

Working source values: the unversioned [community evolution page](https://everythingiscrab.wiki.gg/wiki/Evolution) describes ordinary rerolls starting at 1 and increasing by 1, branch rerolls starting at 10, and offer-wide rarity purchases starting at 10 and increasing by 10, with rarity purchases reset by a reroll. The implementation estimates that the branch reroll also increases by 1. The [1.1 developer notes](https://steamdb.info/patchnotes/23879270/) state a 10-currency specialization skip. None is verified against the pinned game version. The Arms/Tentacles rank-three exclusion is interpreted symmetrically: acquiring a conflicting third rank is disallowed while any rank of the other is owned. The source leaves acquisition order unresolved, so this is an estimate. Hypothetical graph roots with unresolved prerequisites are treated as available solely for graph exploration, not offered in play. Unresolved specialization triggers are estimated at rank three or the maximum rank, whichever is lower; infinite ranks use the maximum safe integer for the bounded search. Trail pursuit is estimated as a bot targeting the owner or another player closing at more than 0.25 units/second within the configured range; movement requires 0.25 units/second. Values and source fidelity remain unverified. The remaining runtime and graph work is not blocked on source fidelity.

`npm run typecheck` passed after connecting poison tick speed and stun duration, adding size-based maximum health and a timed self-stun/boost action, and correcting ally status ownership. Before those changes, `npm run lint`, `npm run build`, `npm run format:check`, and `git diff --check` passed; refresh them at batch end. The build reported the existing large client chunk warning. No tests or gameplay checks ran. YCCE-TEST-07 remains pending.

Continuation note: When a revised offer is not acknowledged by the deadline, timeout resolves the last acknowledged offer with its recorded rank and rarity. No behavioral verification has run.

Charm effects reuse the existing manual charm chance, target cooldown, companion cap, and elite penalty. An automatic attempt chooses the nearest eligible bot in its configured range; this targeting and reuse of the manual rules are playable estimates pending source confirmation. Retaliatory status bursts and periodic vegetation or repair salvage generation are also available as typed runtime effects. Generated salvage uses common rarity, spawns at the owner, and skips a tick if another resource is within one unit or the resource cap is full; these are playable estimates. Individual upgrades will supply their own intervals, ranges, and magnitudes.

Unharmed progress scales with the current Prey affinity count and pauses after actual direct or contact damage; its rate and pause duration are supplied by the eventual upgrade. A timed movement action multiplies speed and expires on host time. Manual hits can reduce the cooldown of a named learned ability, bounded at the current time. These are configurable interpretations of catalogue descriptions, not verified source values.

Companion scaling counts owned charmed allies and applies to direct or contact damage at causal depth zero; its combined multiplier is capped at ten. Finale stat effects start at arena shrink onset. Both are playable interpretations pending source confirmation; individual upgrades supply their own values.

Companion resistance uses the living charmed count at damage and snapshot time, capped at 100 resistance. An allied attack bonus can also be restricted to the finale. Shrink onset is the provisional finale threshold; source coefficients remain unverified.

On-hit charm uses the configured chance, the existing charm cooldown and ally cap, and the existing elite penalty. Multiple eligible charm effects use their highest chance for one attempt. Capped self-damage is queued after an actual manual hit and is limited per effect by a configurable fraction of maximum hull. These interpretations and their future upgrade-specific values are not source verified.

Melee and projectile attacks can now carry plating bypass through to damage and any deferred portion. Configurable bonuses against stunned targets apply to manual hits while the stun source is active. Manual repair can optionally scale with salvage speed using its 100-based stat. These are extension contracts for later upgrade bindings; gameplay verification remains pending.

Resumed with YCCE-047 in progress. Poison tick speed uses the existing 100-based stat: 100 means one tick per second, higher values shorten the interval, and intervals are bounded to 250–10,000 ms. Extra poison ticks extend duration by their actual interval. Stun duration uses the source owner's 100-based duration stat, combined with player-target stun resistance; self-stuns retain their configured duration. Status inputs now reject invalid durations and magnitudes. These interpretations and bounds are playable estimates, not verified source values. Continue comparing the remaining catalogue effect families and trigger lifecycles with the runtime, implement missing shared contracts, and inspect the integrated diff. Keep later individual upgrade bindings and all behavioral tests for their assigned work and checkpoint; do not start YCCE-TEST-07 in this implementation batch.

Size-based maximum health is derived from the current size stat, with a configurable health amount per 100 size; the ordinary maximum-health cap still applies. This is an extension contract for a later upgrade, with its source coefficient unverified.

A configurable delayed-boost action applies a self-stun, then gives physical and ability bonuses proportional to Carcinisation for a fixed host-time duration. The stun ignores self-resistance; a player immune to stun cannot activate the action. Timers continue while selection or disconnect suppresses action. These are playable interpretations; the later upgrade supplies its unverified coefficients and durations.

Status application rejects unknown kinds and friendly effects from owned bots. When a bot is charmed, its prior effects are cleared from all targets so ownership cannot transfer retroactively, and effects from its new owner and allies are cleared from the bot. Bot-owned offensive statuses use their player's poison and stun modifiers. Eliminating an owner removes statuses sourced by their companions before charmed bots return to the wild.

Deployable slowing fields reuse the existing bounded, owner-aware trail system. The existing 100-based effect-area stat scales field and area-status radii; attack-area scales melee reach, capped at four times its base. Radius caps and treating attack area as reach are playable estimates pending source confirmation. Type checking passed after these additions; the remaining static checks need refreshing at batch end.

Learned ability cooldowns now use the 100-based cooldown stat, and dashes also use the dash-cooldown stat. Both are interpreted as duration multipliers, matching the existing basic-attack convention; their exact source formulas remain unverified. Type checking passed after this change.

Paused at the user's request. Resume YCCE-047 with the full catalogue scope: compare remaining effect families and trigger lifecycles against the shared runtime, including whether stationary channeled area damage needs a shared contract. Inspect status tick catch-up and protected-owner lifecycle behavior before deciding whether changes are needed. Then inspect the integrated diff, refresh the static checks listed above, and update this record. The other six selected tasks remain implemented pending YCCE-TEST-07; do not run tests or start that checkpoint during this batch.

Resumed YCCE-047. Added a typed stationary channel for the catalogue's area stun and damage-over-time family. It ends on movement input, displacement over 0.2 world units, stun, expiry, selection, shelter, disconnect, or teardown. It emits at most one pulse per host update and does not bank missed pulses. The displacement tolerance and pulse scheduling are playable estimates; later ability work supplies the individual binding and values. Status tick advancement consumes elapsed ticks before filtering disabled owners, so those ticks are not retained for later release. `npm run typecheck` passed. Behavioral verification remains deferred to YCCE-TEST-07.

Bounded status catch-up to 32 ticks per status per host update and skip any additional overdue ticks. This avoids unbounded burst work after long stalls at the cost of some status damage during exceptional stalls; the cap is a playable estimate. Type checking passed after the change.

The stationary channel permits ordinary attacks while active, as required by YCCE-066B. Reusing the channel action itself while already channeling is rejected. Type checking passed after this adjustment.

Channel damage uses the current physical and general damage stats on each pulse; its configured damage is a multiplier. The formula follows the existing basic attack convention and is an estimate. Type checking passed.

Channel cancellation is also immediate at disconnect, shelter entry, and selection entry, including when the player reconnects or exits before the next host update. Type checking passed.

Added a typed contact-only reflection effect for the catalogue's contact retaliation family. It combines with existing reflection, capped at the damage received, and uses the existing causal depth limit. The cap is a playable estimate; later upgrade work supplies bindings and values. Stun application cancels an active channel immediately. Type checking passed after both changes.

Slowing fields and trails can carry typed periodic stun or corrosion, with configurable central radius and corrosion scaling from the target's current slow. Each field emits at most once per host update and advances its timer while the owner is unable to attack. These are shared contracts for the recorded field specializations; pulse timing and scaling formula are playable estimates, and later tasks own bindings and values. Type checking passed.

Added a once-per-new-discovery bonus contract for random server-selected stat growth and optional common vegetation salvage. Growth is capped at 999 per effect and stat. Salvage is skipped when the resource cap is reached or another resource is within one unit, and multiple effects generate at most one resource for that discovery. The bonus type, permanence, placement, and limits are playable estimates; later content work owns individual values and bindings. Type checking passed. Lint, format checking, and `git diff --check` also passed before this most recent addition and should be refreshed at batch end.

After the discovery addition, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, and `git diff --check` passed. The build retained its large client-chunk warning. No tests or gameplay checks ran. Re-run relevant static checks if implementation changes again.

Added a typed manual-hit mark for a named ability. Its owner's allies deal a configurable multiplier to the marked target until expiry, using the existing ally targeting system. Each effect keeps its latest target; duration, replacement behavior, and stacking by highest multiplier are playable estimates. Later ability work owns bindings and values. Type checking passed; refresh the other static checks at batch end.

Charm auras can also trigger on a successful manual hit, using the existing nearest-eligible target, cooldown, chance, and ownership rules. This covers the recorded attack-triggered nearby charm family. Type checking passed; exact source targeting remains unverified.

Projectile actions can root their owner while the projectile exists. Hits, expiry, selection, shelter entry, disconnect, and teardown remove the projectile and release the root; steering and dashes are suppressed while rooted. Projectiles are now removed immediately on disconnect, shelter entry, and direct offer selection, and disconnected players cannot launch them. Projectile-flight duration as the root duration is a playable estimate; individual ability binding, visuals, and pull specifics remain in YCCE-055C. Type checking passed; refresh the other static checks at batch end.

Dash actions can now specify a duration of damage immunity. The existing boundary and deferred-damage rules still apply. This is a shared timing contract; leap obstacle traversal, its values, and the individual binding remain in YCCE-057C. Type checking passed. Source immunity timing is unverified.

Projectile abilities may now declare a finite ammunition capacity and timed reload. Firing with no charge fails; successful launches spend one charge, and learned ability ammunition survives slot changes. Reloading one charge per configured interval is a playable estimate; YCCE-055 owns its source values, binding, and player-facing presentation. Type checking passed.

Added a typed progress reserve that diverts a configurable fraction of collected progress up to its capacity, passes overflow through immediately, and consumes the reserve at a configured rate while connected, playing, and outside shelter. Reserve is conserved when a capacity decreases and drains before accepting more. This is a shared approximation for stored consumption, not a complete food-item inventory; YCCE-058D owns the individual binding, values, overflow presentation, and any source-specific food behavior. Type checking passed. Refresh the other static checks at batch end.

Automatic follow-up damage can include a configurable amount per currently saved currency, capped at one million damage per follow-up. This supports the recorded currency-scaling family without spending currency or consuming an equipment slot. The formula and cap are playable estimates; later ability work supplies its values and binding. Type checking passed.

Added a typed shelter-entry progress trigger. Both direct and managed selection cancel pending attacks and projectiles immediately, so closing an offer before the next host update cannot release earlier offense. Trigger coverage is represented by manual and follow-up attacks, contact reflection, damage and dodge reactions, actual healing and pickups, kill growth, interval effects, pursuit and movement trails, discoveries, shelter entry and exit, and phase modifiers. Behavioral evidence remains assigned to YCCE-TEST-07.

Final batch static checks passed: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, and `git diff --check`. The build retained its large client-chunk warning. No tests, browser checks, or gameplay checks ran. YCCE-TEST-07 remains pending.

YCCE-TEST-07 passed on 2026-11-15. The user authorized autonomous completion. Source fidelity of the documented estimates remains unverified. Future ability tasks supply their individual effects, values, and specializations.

| Evidence | Result |
| --- | --- |
| Transactions | Insufficient funds, stale revisions, duplicates, expiry, disconnect, rarity purchases, selected rarity, two ordinary rerolls, branch reroll, next-offer reset, specialization choice, skip, and timeout passed. Costs and rewards matched wallet changes and deadlines did not extend. |
| Equipment | Attack, movement, and ultimate swaps retained learned abilities and cooldowns. A disconnected replacement prompt retained its deadline and kept current equipment on timeout. Combat-time swaps were rejected. |
| Graph | All seven selectable non-starting cards had reachable rank-one paths. All 103 blocked non-starting entries had hypothetical rank-one paths. Levels 12 and 24 offered branches in place of ordinary rewards. Arms and Tentacles excluded each other at rank three in both directions. Maximum-rank searches returned the state limit for seven unbounded entries and Virulent at a 5,000-state budget; this is not evidence that their maximum ranks are unreachable. |
| Trigger traces | Manual follow-up and contact reflection produced bounded, attributed events. Dodge, damage, healing, full-health pickup, kill, periodic strike, movement, pursuit, discovery, shelter entry and exit, and phase transition cases passed. Deferred lethal damage retained attribution and resolved once, including damage during a disconnected selection. Protected periodic offense did not bank a burst. |
| Visuals | Owner-only specialization attachment stayed private; hidden players stayed hidden. Modules did not alter the authoritative collision radius on small and large craft. Attack and hit cues followed host events. The four-client recording `test-results/checkpoint07/progression.webm` shows acquisition, equipment reassignment, and a fixture specialization; the starter catalogue has no selectable source specialization yet. |

The graph search now stores parent links instead of copying each growing path, and returns a limit result when the requested rank cannot fit its state budget. The effectively unbounded request that previously exhausted memory now returns a limit result; a 1,000-rank hypothetical path resolves. The checkpoint 03 resource and bot fixtures now use controlled positions and a hunter bot. The combined checkpoint 03, 04, 06, and 07 scenario run passed 113 tests. The four-client browser journey, `npm run build`, `npm run typecheck`, `npm run lint`, `npm run format:check`, and `git diff --check` passed. The build retained the existing large client-chunk warning.

### YCCE-052 through YCCE-052I implementation batch

Selected YCCE-052 through YCCE-052I in plan order. YCCE-047 through YCCE-051 passed YCCE-TEST-07. YCCE-052F uses YCCE-052E, and YCCE-052G uses YCCE-052B. All ten are **Implemented, checkpoint pending** for YCCE-TEST-08. User review is pending. Original full-completion boxes remain unchecked.

| Task | Implementation |
| --- | --- |
| YCCE-052 | Arms preserves physical, ability and salvage reach gains and the limb-weapon graph gate. |
| YCCE-052A | Tentacles has speed and ability tables, limb gates, Legs exclusion and rank-sensitive Arms competition. |
| YCCE-052B | Legs has speed ranks, Arthropod's single risk point and Scuttle adjustment, and Bipedal's Arms grant and speed cost. |
| YCCE-052C | Slithery retains speed, terrain adaptation, mutually exclusive Legs and More Legs routes, and child requirements. |
| YCCE-052D | Wings applies speed and terrain adaptation while retaining ground collision. |
| YCCE-052E | Tail is an ordinary five-rank card with Ability and Social tables and its child requirements. |
| YCCE-052F | Prehensile Tail applies reach and offers Arboreal obstacle-proximity speed or Thrower Stoner damage. |
| YCCE-052G | More Legs requires rank-three Legs and Arthropod, adds speed and one distinct risk point, and has its own module. |
| YCCE-052H | Fin has one rank, water-specific adaptation and the documented body exclusions. |
| YCCE-052I | Hollow Bones adds speed and subtracts damage resistance, including below zero. |

The [community Arms](https://everythingiscrab.wiki.gg/wiki/Arms), [Tentacles](https://everythingiscrab.wiki.gg/wiki/Tentacles), [Legs](https://everythingiscrab.wiki.gg/wiki/Legs), [Bipedal](https://everythingiscrab.wiki.gg/wiki/Bipedal), [Arthropod](https://everythingiscrab.wiki.gg/wiki/Arthropod), [Tail](https://everythingiscrab.wiki.gg/wiki/Tail), [Prehensile Tail](https://everythingiscrab.wiki.gg/wiki/Prehensile_Tail), and [More Legs](https://everythingiscrab.wiki.gg/wiki/More_Legs%21) records supply the chosen relationships and tables. The [data-derived trait table](https://www.neoseeker.com/everything-is-crab/Evolution_Traits) supplies Hollow Bones and Wings values. The [1.1 notes](https://steamdb.info/patchnotes/23879270/) establish Fin's single rank and the Thrower increase. These sources do not establish pinned-version fidelity.

The older bundle gives Tentacles three ranks; the newer community table gives five, which this implementation uses. That table conflicts about whether any Arms or rank-two Arms blocks Tentacles rank three. The detailed rank-two rule is the current estimate, and Arms cannot first be acquired after Tentacles rank three. Legs and Tentacles are mutually exclusive according to the community table. Wings uses 0.5 speed and 80 terrain adaptation from the data-derived table instead of the earlier 1 speed and 40 adaptation estimate. Fin uses estimated 60, 80 and 100 water adaptation by rarity. The official notes describe a large single-rank improvement but give no numbers. The community list and bundle say Fin has no affinity; the older trait table says Trickster, so no affinity is the current estimate.

Arboreal treats the seven interior obstacles as trees because this arena has no trees. It grants 30% speed per obstacle within five units, capped at 90%, and fades by 30 percentage points per second after leaving. The range, cap, decay, and obstacle substitution are gameplay estimates. Thrower's 75% modifier is bound to Stoner projectiles, and Arthropod's half-cooldown lateral adjustment is bound to Scuttle. Stoner and Scuttle remain unselectable until their own later tasks. Their live combined behavior belongs to YCCE-TEST-08. The upgrade graph and specialization handlers remain subject to that checkpoint.

Inspected the changed source and diff. `npm run build`, `npm run typecheck`, `npm run lint`, `npm run format:check`, and `git diff --check` passed. The build retained the existing large client-chunk warning. No tests, gameplay verification, browser journeys or benchmarks ran. Verify behavior against the recorded estimates at YCCE-TEST-08 and report source fidelity as unverified.

### YCCE-053 through YCCE-055A batch continuation

Selected the eleven tasks YCCE-053, YCCE-053A, YCCE-053B, YCCE-053C, YCCE-053D, YCCE-054, YCCE-054A, YCCE-054B, YCCE-054C, YCCE-055, and YCCE-055A in plan order. Dependencies YCCE-047 through YCCE-051 passed YCCE-TEST-07; YCCE-052 is implemented pending YCCE-TEST-08. YCCE-TEST-08 is not due until after YCCE-057D.

Status for each of the eleven tasks: **Implemented, checkpoint pending**, assigned to YCCE-TEST-08. Body Slam and Claws use their rank and rarity tables; Pincer and Pincers share an identity; Toe Beans can charm eligible bots but not humans. Antlers applies capped self-damage, Jaws supports its stunned-target and specialization effects, Horns charges through plating, and Trunk combines attack scaling with retained reach. Stoner has limited recharging ammunition, hold-and-release charging, Training and Signal. Beak provides its range, retained salvage benefit, Sharp and Long. The graph, specializations, shared damage path, existing combat cues and ammunition HUD are wired for checkpoint review.

Source comparison used the individual wiki pages for [Body Slam](https://everythingiscrab.wiki.gg/wiki/Body_Slam), [Claws](https://everythingiscrab.wiki.gg/wiki/Claws), [Pincer](https://everythingiscrab.wiki.gg/wiki/Pincer), [Toe Beans](https://everythingiscrab.wiki.gg/wiki/Toe_Beans), [Antlers](https://everythingiscrab.wiki.gg/wiki/Antlers), [Jaws](https://everythingiscrab.wiki.gg/wiki/Jaws), [Horns](https://everythingiscrab.wiki.gg/wiki/Horns), [Trunk](https://everythingiscrab.wiki.gg/wiki/Trunk), [Stoner](https://everythingiscrab.wiki.gg/wiki/Stoner), and [Beak](https://everythingiscrab.wiki.gg/wiki/Beak), plus the linked specialization records. The [1.2 patch notes](https://everythingiscrab.org/patch-notes/version-1-2-full-patch-notes/) support Antlers' 90% maximum-health self-damage cap. Version 1.2.1 fidelity is not established for all source tables.

The [older game-data listing](https://hinamizawa.ai/everything-is-crab/evolutions/) identifies hidden Bop as Attack_BasicStarting, ID 100; [Neoseeker](https://www.neoseeker.com/everything-is-crab/Evolution_Traits) lists learned Body Slam as ID 241. The tail-labelled candidate is provisionally treated as an alias of learned Body Slam based on its rarity and ranks, not as a separate selectable ability. Its exact versioned mapping remains unconfirmed and needs review at the checkpoint; Bop remains separate.

Estimates requiring checkpoint review: published damage ranges use midpoints except Stoner, which interpolates by charge; Stoner uses a 1.2-second charge, 0.8-second cooldown, three-second per-stone reload, and 0.5–1.8-second projectile lifetime. Beak range is four units, Trunk range two units, and Horns charges for 200 ms at 22.5 units per second. Toe Beans multiplies the existing social charm chance within the ally cap. Long closes unoccupied shelters within one unit of its attack ray and yields one common vegetation salvage. Signal tracks hit targets until the match ends. These estimates and the existing attack cues need gameplay and visual comparison at YCCE-TEST-08.

Static verification: `npm run build`, `npm run typecheck`, `npm run lint`, `npm run format:check`, and `git diff --check` passed. The build retains its large client chunk warning. No tests, browser journeys, manual gameplay, or benchmarks ran in this batch; behavior, source fidelity, presentation, and user review remain pending at the assigned checkpoint.

### YCCE-055B through YCCE-057D batch continuation

Selected YCCE-055B, YCCE-055C, YCCE-056, YCCE-056A, YCCE-056B, YCCE-057, YCCE-057A, YCCE-057B, YCCE-057C, and YCCE-057D. YCCE-047 through YCCE-051 passed YCCE-TEST-07; YCCE-052 and YCCE-054A are implemented pending YCCE-TEST-08. Each selected task is **Implemented, checkpoint pending**. YCCE-TEST-08 is now due and has not run.

Spit uses the Beak, Jaws and future Saliva prerequisites. Projectile Tongue applies stun, roots the owner during flight, and offers Sticky and Whiplash. Leech drains actual damage and offers Anaesthetic and Vasodilators. Stinger applies corrosion. Spur follows qualifying attacks without an equipment slot and offers Marking and Primal. Dash retains its existing implementation. Slide, Sprint, Leap and Scuttle use the movement slot, their progression rules, and the existing authoritative movement system. Leap's Bouncy and Heavy choices add a second jump and landing damage. Scuttle adds its Carcinisation contribution once on acquisition.

Source tables and behavior were compared with the community pages for [Spit](https://everythingiscrab.wiki.gg/wiki/Spit), [Projectile Tongue](https://everythingiscrab.wiki.gg/wiki/Projectile_Tongue), [Leech](https://everythingiscrab.wiki.gg/wiki/Leech), [Stinger](https://everythingiscrab.wiki.gg/wiki/Stinger), [Spur](https://everythingiscrab.wiki.gg/wiki/Spur), [Sprint](https://everythingiscrab.wiki.gg/wiki/Sprint), [Leap](https://everythingiscrab.wiki.gg/wiki/Leap), and [Scuttle](https://everythingiscrab.wiki.gg/wiki/Scuttle). [Neoseeker](https://www.neoseeker.com/everything-is-crab/Evolution_Traits) supplies Slide's table. The [official 1.2 notes](https://steamcommunity.com/app/3526710?l=koreana) describe Tongue and its specializations. A [player discussion](https://steamcommunity.com/app/3526710/discussions/0/418424310691165555/) describes Bouncy as a second jump. Source fidelity to the target version remains unverified.

Estimates for checkpoint review: damage ranges use midpoints. Tongue range is 12 units, Whiplash halves its cooldown and increases projectile speed by 50%, and Sticky pulls for one second at strength 12 and gathers resources within 0.75 units of its path. Ordinary manual hits provoke wild non-hunters for an estimated five seconds; Anaesthetic Leech hits do not provoke or cancel existing aggression. Spur makes a separate short-range strike when an attack is used; its reach uses the existing 1.5-unit melee estimate. Its physical coefficient uses the rarity table and Primal adds 1% per saved currency. Slide uses the listed duration and distance, with a 15% distance bonus when activated on snow. Leap uses an immediate clear landing up to 6.5 units, up to 50% extra distance after one second held, and 400 ms of immunity; Bouncy permits a second jump within 2.5 seconds. Heavy deals physical damage scaled by size within two units of landing. The arena limits landing points inside its walls. These timing, targeting, damage and traversal approximations need comparison at the checkpoint.

Inspected the changed source and diff. After correcting an effect-registry type inference error, `npm run build`, `npm run typecheck`, `npm run lint`, `npm run format:check`, and `git diff --check` passed. The build retained its large client chunk warning. No tests, manual gameplay, browser journeys, or benchmarks ran. Gameplay, presentation, graph behavior and source fidelity remain pending at YCCE-TEST-08.

### Planar gameplay clarification

On 2026-11-15 the user clarified that gameplay is two-dimensional and 3D height is presentation only. Craft bodies now lock vertical translation, including after a selection. Rapier remains responsible for collisions on the X/Z plane. Leap uses a planar obstacle-crossing rule, not a simulated jump or a visual-height threshold. The [community Leap record](https://everythingiscrab.wiki.gg/wiki/Leap) says it crosses enemies and obstacles; it does not establish a height-based obstacle distinction. The current clear landing and arena boundary are implementation rules, and the exact source landing behavior remains unverified. YCCE-TEST-08 must test the planar crossing, clear landing, immunity, and boundary behavior without requiring low-versus-tall obstacle classes.
