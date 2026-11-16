# You Can Crab Everything

A four-player LAN hovercraft survival game. The repository currently provides the application foundation and source research. Gameplay is under construction.

## Local development

Use Node 24.22.3 and npm 11.19.1. `.nvmrc` and `.node-version` pin Node. `package-lock.json` pins the dependency graph.

```sh
npm ci
npm run dev
```

The development command builds and starts the authoritative host on port 3000, then starts Vite on port 5173. Vite proxies the realtime connection to the host. Restart the command after changing host code. Open `http://localhost:5173` on the host, or use the host's LAN address from another device. Development may require internet access for dependency installation. Production assets must be served locally.

## Production

```sh
npm run build
HOST=0.0.0.0 PORT=3000 npm start
```

The Node adapter writes `build/`, and the host compiler writes `build-host/`. The host serves the app on port 3000. `Ctrl+C` stops the process. For a fixed LAN origin, set `ORIGIN` to the host's full address, such as `http://192.168.1.20:3000`. The host initializes local Rapier physics and a Socket.IO endpoint. The browser shows available rooms. Set `ROOM_LIMIT` to a positive integer to change the default limit of two rooms. Each room holds four players. A starter subset is playable. The complete planned game is still under construction.

## Controls

During a running match, use WASD to move and the mouse to aim. The left mouse button uses the basic strike when its slot is empty. Space activates the equipped movement ability. The right mouse button and Q activate equipped secondary and ultimate abilities. Hold and release Stoner's attack button to throw farther and harder; the HUD shows its remaining ammunition. Hold and release Leap to jump farther. Press E near an available site to open its choices, or use the nearby site button. When you learn an ability with no empty slot, choose whether to replace an equipped ability. Additional abilities and interactions are still under construction. Create or join a room, enter a display name, and ready all four players. The room host can then start the shared loading countdown. Controls clear when the window loses focus, a text field or modal captures input, the connection drops, or the player cannot act.

Move close to salvage to collect it in stages. Yellow salvage repairs hull as it is collected. Bots turn orange before they attack and leave salvage when defeated. Levels offer upgrades from the current starter catalogue. Choose an option before the timer ends, or the host chooses one of the displayed options. Ordinary rerolls start at one currency and branch rerolls start at ten; each additional reroll in the same offer costs one more. An ordinary offer can also be upgraded one rarity at a time, starting at ten currency and increasing by ten per purchase. A reroll clears those temporary rarity upgrades and resets their price. The screen shows the next price, and neither purchase extends the timer. Your craft stops and is protected while the choice is open, but remains vulnerable to boundary damage. Pending choices leave an exposed interval between windows. The HUD shows progress, pending upgrades, currency, and personal Carcinisation risk. The starter catalogue is a subset of the planned upgrades.

Sand, snow, and water slow movement. Darker water is deeper and slows craft more; terrain adaptation reduces these penalties. Each map includes routes through four biomes. Bots forage, flee, or hunt, and stronger encounters appear as the match progresses. Gold bots are elites. The HUD shows the current day or night phase and the time to the next transition.

Chassis upgrades can open different build paths. Legs and Slithery cannot be combined. At rank three, Legs offers Arthropod or Bipedal. Arthropod adds one Carcinisation point and unlocks More Legs. Bipedal grants Arms if you do not already have them. Prehensile Tail requires Tail and increases salvage reach. Its Arboreal specialization grants temporary speed near interior obstacles, while Thrower improves Stoner projectiles when that attack is available. Fin reduces water penalties. Hollow Bones trades damage resistance for speed.

Rain, heatwaves, and blizzards affect their regions. The HUD warns you before local weather begins and shows heat and cold exposure. Heat and cold adaptation slow their respective buildup; leaving the weather lets exposure recover. At full exposure, heat and cold damage hull through plating, and cold also slows movement. At night, senses increase spotting range. Radar shows coarse directions and distance bands for nearby sites and unseen elites.

Sites can be discovered by each player, but only one player can claim each site's reward. Choices include repair, progress, permanent stats, currency, paid upgrades, and changes to future day and night lengths. A site choice expires after ten seconds and can be left without claiming. The protected time at a site is limited per player; later attempts remain vulnerable. Unknown firmware modules have matching appearances within a match. Scan a nearby module from the HUD to identify its effect. Your senses and identification bonuses affect your chance; a failed scan can succeed if those stats improve. Identification is private and applies to matching patterns for the rest of the match. Use a nearby module from the HUD to risk its effect. They provide progress and may heal, cause corrosion, alter temperature or give another effect. Research sites can improve identification, corrosion or future module supply.

Enter a nearby shelter from the HUD for temporary protection; larger craft have less time inside. The boundary still hurts you, and shelters have a cooldown after exit. You can charm a nearby bot up to your social capacity. Companions follow and fight nearby threats, but stop attacking while you are protected. Some sites can provide a companion or challenge you to defend an egg.

Each player has one life. After elimination, follow an available survivor using the spectator buttons. The boundary begins closing after 18 minutes and collapses at 28 minutes; keep inside the orange ring, including while choosing upgrades. Red rings warn of incoming meteors. The last survivor wins; simultaneous final eliminations produce a draw. After the results screen, the host can return everyone to a fresh lobby for another match.

The client renders other craft from buffered host snapshots and predicts the local craft's movement between host updates. The host still owns collisions and gameplay outcomes. Local Inter font files and their license are in `static/fonts/`.

## Commands

| Command                | Purpose                                                             |
| ---------------------- | ------------------------------------------------------------------- |
| `npm ci`               | Install the exact dependency graph and synchronize SvelteKit types. |
| `npm run dev`          | Build and start the host and Vite development server.               |
| `npm run build`        | Build the browser app and Node server.                              |
| `npm start`            | Start the production output.                                        |
| `npm run format`       | Format maintained code and reader guides.                           |
| `npm run format:check` | Inspect formatting without writing.                                 |
| `npm run lint`         | Inspect code and restricted host imports.                           |
| `npm run typecheck`    | Check Svelte, browser, host, and shared TypeScript.                 |
| `npm test`             | Run the foundation scenarios. Build the host first.                 |

## Code ownership

`server/` owns authoritative host code. `shared/` contains definitions usable by both host and browser. `src/lib/game-client/` owns rendering, `src/lib/net/` owns browser networking, and `src/lib/ui/` owns UI components. `src/routes/` contains SvelteKit routes. `static/` contains local assets. These directories are reserved without game-feature placeholders.

Client and shared code must not import host modules. ESLint restricts those imports. SvelteKit also rejects server-directory imports in browser code. The SvelteKit 3 configuration lives in `vite.config.ts`; it does not use the older `svelte.config.js` format. See the [SvelteKit migration reference](https://svelte.dev/docs/kit/migrating-to-sveltekit-3).

[Product rules](docs/product-rules.md) defines the baseline. [Experiment procedures and budgets](docs/experiments.md) defines the assumed low-end laptop target and future measurements. [Source catalogue](docs/content/README.md) explains internal content research and its unresolved source fields.

Run `npm run build` followed by `npm run checkpoint:foundation` to start fresh local servers and run the browser and foundation scenarios. The command uses Chrome at its standard macOS path. Set `CHROME_PATH` to use another Chrome executable. The browser capture is saved to `test-results/foundation.png`. The scenarios use real Match operations and do not expose fixture controls to players.
