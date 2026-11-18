# You Can Crab Everything

A one-to-four-player LAN hovercraft survival game. The repository currently provides the application foundation and source research. Gameplay is under construction.

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

## Reconnect to a room

If you lose the connection, keep the same browser tab open. It retries automatically. Use **Retry connection** if the connection stays down. If the host reports that another tab has your session, close that tab and retry.

Your craft stays in play and can take damage. A disconnect releases your site claim and forces you out of any burrow. Open upgrade choices keep their original deadlines. When you return, the host sends your current craft or spectator view. If the match has finished, you see the results until the crew starts a rematch or the room closes. The host keeps an empty lobby or finished room for five minutes.

If someone loses the connection or an asset fails to load before launch, the host sends the crew back to the lobby. Reconnect, then have everyone ready up again. If the host process stops, start it again and create or join a new room.

## Controls

During a running match, use WASD to move and the mouse to aim. The left mouse button uses the basic strike when its slot is empty. Space activates the equipped movement ability. The right mouse button and Q activate equipped secondary and ultimate abilities. Hold and release the Slug Launcher button to fire farther and harder. The HUD shows remaining ammo. Hold and release Leap to jump farther. Press E near a site, shelter, firmware capsule, or recruitable bot to interact. New attacks fill primary and then secondary. If both are occupied, the new attack replaces secondary immediately; the upgrade card names the replacement. Movement and ultimate abilities replace their own slots. You can rearrange learned abilities during upgrade choices. Primary and secondary keep separate cooldowns, with a brief shared attack recovery. Additional abilities and interactions are still under construction. Create or join a room and enter a display name. Once every connected player has selected Ready, the host can start a match with one to four players. Controls clear when the window loses focus, a text field or modal captures input, the connection drops, or the player cannot act.

Move close to salvage to collect it in stages. Yellow salvage repairs hull as it is collected. Bots turn orange before they attack and leave salvage when defeated. Levels offer upgrades from the current starter catalogue. You have 20 seconds per upgrade window. If time runs out, the host chooses one of the displayed options. Ordinary rerolls start at one currency and branch rerolls start at ten; each additional reroll in the same offer costs one more. An ordinary offer can also be upgraded one rarity at a time, starting at ten currency and increasing by ten per purchase. A reroll clears those temporary rarity upgrades and resets their price. The screen shows the next price, and neither purchase extends the timer. Your craft stops and is protected while the choice is open, but remains vulnerable to boundary damage. Pending choices leave an exposed interval between windows. The HUD shows progress, pending upgrades, currency, and personal Overload risk. The starter catalogue is a subset of the planned upgrades.

The current map is a shared 240 × 240-unit world with irregular biomes and separate grassy starting areas. There is no minimap. Nearby terrain loads as you travel. This size is a playtest setting, and performance on the target Intel integrated-graphics laptop remains unmeasured.

Sand, snow, and water slow movement. Sand has wind ripples, grass has moss patches, snow has drifts, and water has pale ripples and foam at the bank. Darker water is deeper and slows craft more. Terrain adaptation reduces these penalties. Each map includes routes through four biomes. Bots forage, flee, or hunt, and stronger encounters appear as the match progresses. The host maintains encounters near living players as they travel. Salvage sites have a limited supply. Defeated bots leave wreck salvage for progression. Gold bots are elites. The HUD shows the current day or night phase and the time to the next transition.

Chassis upgrades can open different build paths. Lift Pods and Low-Friction Skirt cannot be combined. At rank three, Lift Pods offers Vector Fins or Manipulator Retrofit. Vector Fins adds one Overload point and unlocks Auxiliary Lift Pods. Manipulator Retrofit grants Manipulator Arms if you do not already have them. Salvage Boom requires Rear Stabilizer and increases salvage reach. Obstacle Assist grants temporary speed near interior obstacles. High-Caliber Slugs improves Slug Launcher damage. Hydrofoil reduces water penalties. Hollow Frame trades damage resistance for speed.

Rain, heatwaves, and blizzards affect their regions. The HUD warns you before local weather begins and shows heat and cold exposure. Heat and cold adaptation slow their respective buildup; leaving the weather lets exposure recover. At full exposure, heat and cold damage hull through plating, and cold also slows movement. At night, a higher Sensors stat increases spotting range. Radar shows coarse directions and distance bands for nearby sites and unseen elites. Sensor Probe also adds indicators for unseen firmware.

Sites can be discovered by each player, but only one player can claim each site's reward. Choices include repair, progress, permanent stats, currency, paid upgrades, and changes to future day and night lengths. A site choice expires after ten seconds and can be left without claiming. The protected time at a site is limited per player; later attempts remain vulnerable. Unknown firmware modules have matching appearances within a match. Your sensors check nearby capsules automatically. The Sensors stat and identification bonuses affect your chance; a failed scan can succeed if those stats improve. Identification is private and applies to matching patterns for the rest of the match. Press E or use the nearby capsule button to consume four stages and risk its effect. Stay close until consumption finishes. They provide progress and may heal, cause corrosion, alter temperature or give another effect. Research sites can improve identification, corrosion or future module supply.

Shelters are the ground arches. Press E nearby to enter or exit early. Each shelter has about five seconds of total use at normal size, shared across visits and players. Larger craft consume it faster, and each entry uses a little lifetime. An exhausted shelter closes. Inside, your craft hides from enemies and temperature exposure recovers faster. The boundary still hurts you. Approach a green bot and press E before its recruitment offer expires. Attacking cancels pending offers. Signal strength governs how many bots you can recruit. Companions follow and fight nearby threats, but stop attacking while you are protected. Some sites can provide a companion or challenge you to protect a drone dock.

Each player has one life. Solo play continues until your hull reaches zero, then shows Run ended. In multiplayer, the last survivor can keep playing or choose Finish match to win. If that survivor later dies, the final elimination order determines the winner; simultaneous final eliminations can draw. The boundary begins closing after 18 minutes and collapses at 28 minutes. Outside it, you continuously lose hull even while choosing upgrades or hiding. Full collapse increases damage over time instead of ending the run instantly. Red rings warn of incoming meteors. After results, the host can return everyone to a fresh lobby.

After changing host code, stop and restart `npm run dev` to rebuild it. Browser hot reload alone does not update the host.

The client renders other craft from buffered host snapshots and predicts the local craft's movement between host updates. The host still owns collisions and gameplay outcomes. Local Inter font files and their license are in `static/fonts/`.

## Adjust presentation and controls

Open **Settings and controls** in the lobby or during a match. At 100% **Render scale**, the world uses the browser viewport and display pixel density, including 4K when the viewport covers that many pixels. Select 75% or 50% to reduce GPU load. **UI scale** controls text and menus independently. Low quality shows fewer ground marks and weather particles than Balanced. Target laptop performance remains unmeasured.

Select **Reduce motion** to remove cosmetic recoil, propulsion movement, and UI transitions. The default follows your device's reduced-motion preference. Required hit labels and danger markers remain visible.

To change a control, select **Rebind**, then press a key or mouse button. If another action uses that input, select **Swap bindings** or keep your current controls. Escape or Tab cancels capture. **Reset controls** restores the defaults. HUD, help, equipment, and nearby interaction labels show your current controls. Controls clear when bindings change; release held keys and click the world before continuing. Menus and timed choices retain their navigation shortcuts.

Sound starts muted. Enable local cues and adjust master volume for short hit, pickup, confirmed-upgrade, and urgent-warning sounds. Sound requires a click or key press and has no remote assets. All cues have visual equivalents. Returning from a hidden tab may require another gesture to resume sound.

These preferences stay in this browser and do not save gameplay progress. If storage is unavailable, settings last until reload. Opening settings captures game controls while the world continues, without extra protection.

## Inspect your craft and use nearby sites

Open **Build, stats, and help** during a match to inspect your learned abilities, equipped slots, current cooldowns, specializations, and stat totals. The panel includes a field guide and descriptions of the main stats. Inspection captures movement and attack controls, but the world continues and your craft gains no protection. Close the panel or press Escape to resume controls. The same optional field guide is available in the lobby.

Nearby sites show discovery credit separately from reward ownership. A reservation names whether it belongs to you and shows its remaining time. Reward prompts show currency costs, consequences, and current eligibility. Unavailable rewards cannot be selected. Claiming one reward consumes the site for everyone. Leaving or timing out releases the site, but spent protection time stays spent. After an unconfirmed action, check the current site state, build, and wallet before retrying.

Firmware panels show only your identification result, your current identification chance, consumption stages, and whether someone is consuming the capsule. An unknown effect stays hidden until you identify or finish consuming that pattern. Shelters show occupancy, shared lifetime, and the estimated duration of an entry at your current size. Once inside, the host countdown shows the time until forced exit. You can leave early. Boundary warnings remain visible during interactions and inspection.

## Read the world

Crafts share a faceted hull with amber heading marks. Learned structural upgrades add visible mounts, and equipped weapons use front barrels, paired manipulators, blades, or a ram. Side armor, rear propulsion, dorsal sensors, and a command mast identify their roles. Stat-only upgrades remain in the build statistics.

Foragers have broad bodies, hunters have pointed fronts, and scavengers have long runners. One to three diamonds show tier. A larger amber badge marks an elite, and a bright front wedge warns of an attack. A vertical diamond marks stun, paired spikes mark corrosion, and paired bars mark slow.

Plant, wreck, and aquatic salvage have different shapes. A cross marks healing, one to four diamonds show rarity, and small remaining stage marks show salvage progress. Capsule patterns identify appearances, not effects. Use your own identification results to learn firmware effects.

Projectiles have bright cores and directional trails. A landed attack shows a brief impact burst and a label. Hull hit, plating hit, plating break, dodge, and blocked outcomes have distinct wording. Bot health updates from the server and retains a short damage-loss trail. The local attack-outcome label confirms your own hits. Open **Build, stats, and help** in the match HUD and enable **Damage numbers** for numeric amounts. Labels and essential shapes remain visible without numbers or audio, and reduced motion removes cosmetic recoil and propulsion movement.

## Choose upgrades and equipment

The menu lists room occupancy and availability. Enter a display name, create or join a room, and select **Ready to play**. The host starts once everyone is connected and ready. Loading shows your own asset status, then waits for the crew before the shared countdown. Loading errors return to the lobby for another attempt. Results distinguish a winner, draw, solo run ending, and host interruption. Expand **Final builds** to inspect the round before returning to the lobby.

Upgrade offers show rarity by name, color, counted marks, and border treatment. Common uses a plain neutral badge, Rare a dashed blue badge, Epic a double violet border, and Legendary an amber corner badge. Rank appears separately. Branch upgrades and specializations have their own choice labels. Existing upgrades show current and next effects. Expand **Current effects and requirements** for prerequisites, exclusions, and affinities.

Use the numbered shortcuts or click an option, then confirm. Tab reaches purchases, equipment controls, and confirmation. The host deadline and danger warnings remain above long offer content. The world continues during selection. Combat protection does not stop boundary damage. Rerolls, rarity purchases, and equipment changes do not extend the deadline. At timeout, an upgrade is chosen from the displayed options; a specialization is skipped for 10 currency. Queued decisions have an exposed interval between windows.

During an upgrade or specialization choice, expand **Arrange learned abilities**. Select a replacement, review which slots change, then use **Apply slot change**. Moving an ability from another slot clears that slot. An empty primary uses Basic strike. Replaced abilities stay learned and retain their passive benefits. Cooldowns keep running. The displayed loadout changes after the host applies it. Rejected or unconfirmed actions show a retry message while the deadline remains.

**Override Beacon** attempts to recruit a nearby bot from the ultimate slot. **Snare Projector** deploys a slowing field. Its specializations add a stun grid or deploy a drone when the field expires. **Firmware Fabricator** supplies firmware capsules, and **Drag Foam** leaves a slowing trail when pursued.

**Recruitment Transmitter** unlocks through **Rear Stabilizer**. It attempts to recruit nearby bots every five seconds when an ally slot is free. It works passively while you move and fight. You can still accept green recruitment offers by approaching and pressing E.

The combat HUD separates hull, plating, and experience. Ability slots show key labels, cooldowns, and ammunition. Nearby interactions occupy the right edge; danger warnings occupy the top center. **Build, stats, and help** contains affinities, upgrade details, rarity badges, and the damage-number toggle. The central combat area has no minimap.

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
