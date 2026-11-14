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

The Node adapter writes `build/`, and the host compiler writes `build-host/`. The host serves the app on port 3000. `Ctrl+C` stops the process. For a fixed LAN origin, set `ORIGIN` to the host's full address, such as `http://192.168.1.20:3000`. The host initializes local Rapier physics and a Socket.IO endpoint. The browser connects to the host and displays its lobby. Gameplay is still under construction.

## Controls

During a running match, use WASD to move and the mouse to aim. The left and right mouse buttons send attack controls. Space sends the movement ability control, Q sends the ultimate control, and E sends the interaction control. Combat, abilities, interactions, and the lobby start flow are still under construction. Controls clear when the window loses focus, a text field or modal captures input, the connection drops, or the player cannot act.

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
