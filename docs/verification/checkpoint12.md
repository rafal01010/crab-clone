# YCCE-TEST-12 verification

The checkpoint covers YCCE-076, 076A, 077, 077A, and 078. The production build ran on the Apple M4 development Mac with Node 24.22.3 and Chrome 157.0.8103.79. The soak used four independent browser profiles and one loopback host. The recovery run used one Chrome profile and one protocol client.

## Recovery

| Case                    | Observed result                                                                                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Combat and held input   | The host kept the disconnected craft in the same round. A direct hit reduced its hull. Held movement stopped, and Chrome resumed the damaged craft. A focused simulation case also verified expiry with a live connection but no fresh input.                       |
| Salvage                 | The first bite paid once. The host awarded no bites or progress during the outage. Reconnect allowed the same player to take the next bite from the same resource.                                                                                                  |
| Choices and shelter     | The original choice deadline carried over on reconnect, and a second selection of the consumed offer failed. A disconnect ended shelter and released a reserved site. A separate outage crossed the choice deadline and returned without the expired offer.         |
| Elimination and results | A spectator reconnected to the same restricted follow view and remained eliminated. In a separate outage, the remaining player finished while Chrome was offline. Chrome returned to the recorded result and could open a fresh lobby.                              |
| Loading                 | An interrupted transport and a blocked local font each returned the crew to the lobby. The crew readied again and played. The loading revision case also rejected an acknowledgment from an earlier attempt.                                                        |
| Host loss               | Abrupt termination closed the world view. Restart cleared the saved identity, rejected its old room token, and allowed a fresh room with a new host ID. Graceful shutdown showed that the match ended. An in-process abort also returned the crew to a clean lobby. |

The [recovery trace](../../test-results/checkpoint12/recovery.json) contains the browser results. The [recovery recording](../../test-results/checkpoint12/recovery.webm) follows the same craft through reconnect, results, rematch, abrupt restart, and graceful shutdown.

## Command rejection

| Input                               | Observed result                                                                                                                                                                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicate session or sequence       | A second controlling session was rejected. Replaying an accepted readiness sequence failed on the active socket, after reconnect, and after rematch. Fresh readiness and movement still worked.                                                                      |
| Invalid fields or oversized message | The production host rejected the wrong field type and an undeclared field. A message above the 4 KiB transport limit closed the test socket. Focused cases rejected undeclared position, hit, damage, XP, currency, rank, ownership, price, slot, and revive fields. |
| Invalid gameplay actions            | Wrong player, stale offer revision, invented choice, overlength ID, unavailable reroll, unlearned equipment, and movement during selection left the match view and offer unchanged. The valid choice then applied exactly once.                                      |
| Work per player                     | After 16 pending commands, the next command stopped before authorization. A second player could still queue work. The action budget stopped the ninth immediate attempt and allowed another after refill. A discarded accepted sequence stayed stale.                |

The [focused scenario log](../../test-results/checkpoint12/focused-final.tap) records 23 passing cases. Three older assertions now use the current progression threshold or observe the next bite directly. Their former constants predated the current progression and salvage tuning.

## Production privacy

- Inspection covered all 11 shipped JavaScript files. Chrome fetched 10 of them. The inspection checked for server catalogue data, firmware mapping and RNG code, and debug or test fixture markers. The production content event contained the expected public catalogue fields.
- A visible ally initially carried its visible owner's ID. Concealment removed the owner ID, the target from observations and feedback, and the hidden action's audio cue. The corresponding visible hit did play a cue. Another player's private prompt stayed with its owner.
- One player identified a firmware capsule. The other browser and the spectator still received `unknown`. Radar hints carried category, direction, and distance band. A focused night case checked that a hidden owner's projectile stayed out of the viewer packet.
- The spectator could follow a visible player but received no option or ID for a concealed player. Reconnect preserved that restriction. An older live observation reached the transport after rematch and never restored the canvas or playing state.

See the [bundle inventory and wire assertions](../../test-results/checkpoint12/verification.json) and the [restricted spectator capture](../../test-results/checkpoint12/restricted-spectator.png).

## Repeated-match measurements

The same host and four Chrome profiles ran one warmup, five measured matches, an interrupted asset load, a populated match abort, and another completed match. The pilot used the browser’s movement ability to lay a web field. The wire probe also confirmed live salvage, a projectile, an ally, and a pending private offer before each reset.

Each lobby sample waited 1.2 seconds and collected garbage before measuring the host and tabs. Host retained memory is V8 heap used plus external allocations. Array buffers are already part of the external count. Host and Chrome renderer RSS are process measurements. The Chrome figures cover the renderer processes Chrome reports through its debugging API.

| Lobby sample         | Host retained (MiB) | Host RSS (MiB) | Highest renderer RSS (MiB) | Matches disposed |
| -------------------- | ------------------: | -------------: | -------------------------: | ---------------: |
| Warmup               |               38.61 |         124.59 |                     169.03 |                1 |
| Match 1              |               38.68 |         127.45 |                     171.28 |                2 |
| Match 2              |               38.73 |         127.37 |                     172.45 |                3 |
| Match 3              |               39.12 |         127.65 |                     173.98 |                4 |
| Match 4              |               39.24 |         127.96 |                     174.98 |                5 |
| Match 5              |               39.30 |         128.09 |                     175.73 |                6 |
| Failed load          |               39.30 |         128.09 |                     176.14 |                6 |
| Abort and rematch    |               39.40 |         128.82 |                     176.98 |                7 |
| Match after recovery |               39.51 |         128.90 |                     177.84 |                8 |

Host retained memory grew 0.69 MiB over the five measured matches and 0.90 MiB through the last recovery sample, within the 10 MiB budget. Every sample had one live match, one Rapier world, eight physics bodies, four player sockets, ten listeners per socket including the probe listener, and zero reachable retired matches. Node reported five active timers at each sample and seven or eight TCP socket handles. Each browser kept two documents and 61 JavaScript event listeners, with zero active audio voices in the lobby.

All sampled lobby canvases cleared and drew zero world geometry. Live WebGL buffer counts ranged from 78–94 per profile at warmup and 99–109 by match five. They held at that range through failure, abort, and the last match. The renderer lazily caches shared geometry by model variant, and the round reset disposes the arena terrain. See [shared geometry](../../src/lib/game-client/assets.ts#L103) and [terrain cleanup](../../src/lib/game-client/world.ts#L281).

Four cold titles took 76–143 ms and three warm titles took 41–49 ms. The interval from Start to an interactive match canvas in all four profiles was 3.16–3.28 s across eight starts, including the three-second countdown. Initial transfer totaled about 0.53 MiB per profile and every observed request stayed on the local host.

See the [resource and loading trace](../../test-results/checkpoint12/verification.json), [rematch recording](../../test-results/checkpoint12/rematch.webm), and [production scenario log](../../test-results/checkpoint12/browser-final.tap).

## Reproduce

Build and run the two production cases serially so the recovery scenario does not compete with the soak for resources.

```sh
npm run build
YCCE_RELIABILITY=1 node --test --test-concurrency=1 tests/scenarios/checkpoint12-{browser,recovery}.test.js
```

The production process uses a private test IPC channel to stage the craft, populate selected objects, and shorten the route to results. Chrome uses the production controls, WebSocket connection, assets, renderer, and rematch flow. The timings describe this loopback setup. Full-duration match pacing and target laptop capacity use their dedicated workloads.
