<script lang="ts">
  import { usePreferences, actionLabel } from '../game-client/preferences.js';
  const preferences = usePreferences();
  import type { MatchView } from '../../../shared/match.js';
  import type { ConnectionState, RoomSummary } from '../net/session.js';
  import { timeLabel } from './presentation.js';
  import RarityBadge from './RarityBadge.svelte';
  import FieldGuide from './FieldGuide.svelte';

  let {
    match,
    playerId,
    connection,
    rooms,
    loadingMessage,
    onjoin,
    onready,
    onstart,
    onleave,
    onreturn,
    onretry,
  }: {
    match: MatchView | null;
    playerId: string | null;
    connection: ConnectionState;
    rooms: RoomSummary[];
    loadingMessage: string;
    onjoin: (roomId: string | null, name: string) => void;
    onready: (ready: boolean) => void;
    onstart: () => void;
    onleave: () => void;
    onreturn: () => void;
    onretry: () => void;
  } = $props();
  let name = $state('');
  const me = $derived(match?.players.find((player) => player.id === playerId));
  const available = $derived(connection.kind === 'connected');
  const connectionLabel = {
    connected: 'Host connected',
    connecting: 'Connecting to host',
    disconnected: 'Host disconnected',
    restoring: 'Waiting for the room',
  } satisfies Record<ConnectionState['kind'], string>;
  const allReady = $derived(
    !!match?.players.length &&
      match.players.every((player) => player.connected && player.ready),
  );
  const result = $derived(match?.result);
  const title = $derived(
    !playerId
      ? 'You Can Crab Everything'
      : !match
        ? 'Finding your room.'
        : match.phase === 'lobby'
          ? 'A small crew. A wild world.'
          : match.phase === 'loading'
            ? 'Getting everyone aboard.'
            : match.phase === 'countdown'
              ? 'Ready for the wild.'
              : match.phase === 'aborted'
                ? 'The run was interrupted.'
                : result?.outcome.kind === 'draw'
                  ? 'A shared ending.'
                  : result?.outcome.kind === 'run-ended'
                    ? 'The run ends here.'
                    : `${result?.players.find((player) => result.outcome.kind === 'winner' && player.id === result.outcome.playerId)?.name ?? 'A survivor'} wins.`,
  );
  const eyebrow = $derived(
    !playerId
      ? 'One to four players · Offline LAN'
      : match?.phase === 'finished'
        ? 'Match results'
        : match?.phase === 'aborted'
          ? 'Host stopped the match'
          : match?.phase === 'loading' || match?.phase === 'countdown'
            ? 'Synchronized departure'
            : 'Your local room',
  );
  function displayName(id: string) {
    return result?.players.find((player) => player.id === id)?.name ?? id;
  }
  function contentName(id: string) {
    return result?.contentNames[id] ?? 'Unknown module';
  }
</script>

<div class="menu-journey">
  <nav aria-label="Game">
    <span class="wordmark">YCCE <span aria-hidden="true">△</span></span><span
      class="connection"
      role="status">{connectionLabel[connection.kind]}</span
    >
  </nav>
  {#if connection.message}<div class="notice" role="alert">
      <p>{connection.message}</p>
      {#if !available && (connection.kind !== 'restoring' || playerId)}<button
          class="ghost"
          onclick={onretry}>Retry connection</button
        >{/if}
    </div>{/if}
  <div class="menu-grid">
    <header>
      <p class="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {#if !playerId}
        <p class="introduction">
          Build a hovercraft from the life around you. Salvage, evolve, and
          survive together until only one remains.
        </p>
        <svg class="constellation" viewBox="0 0 420 280" aria-hidden="true">
          <g fill="none" stroke="#8052ff" stroke-width="1.5">
            <path
              d="M205 24 370 239 50 239Z M205 59 327 218 93 218Z M141 172 205 83 269 172 247 217 163 217Z M163 217l-17 29 M247 217l17 29 M205 83v67 M141 172h128"
            />
            <path
              d="m67 54 6 11H61Z m278 12 6 11h-12Z m49 95 5 9h-10Z m-365-27 5 9H24Z m103-98 5 9h-10Z m170 226 5 9h-10Z"
            />
          </g>
          <g fill="#ffb829"
            ><circle cx="205" cy="24" r="3" /><circle
              cx="370"
              cy="239"
              r="3"
            /><circle cx="50" cy="239" r="3" /><circle
              cx="205"
              cy="150"
              r="2.5"
            /></g
          >
          <g fill="#bdbdbd"
            ><circle cx="141" cy="172" r="2" /><circle
              cx="269"
              cy="172"
              r="2"
            /><circle cx="163" cy="217" r="2" /><circle
              cx="247"
              cy="217"
              r="2"
            /></g
          >
        </svg>
      {:else if match?.phase === 'lobby'}
        <p class="introduction">
          Everyone starts with Standard. Ready up when you want to launch. The
          host can start with one to four players once everyone is connected and
          ready.
        </p>
        <details class="field-guide">
          <summary>First run? Controls and field guide</summary><FieldGuide />
        </details>
        <p class="caption">
          Room {match.id.slice(0, 8)} · {match.players.length} / 4
        </p>
      {:else if match?.phase === 'loading' || match?.phase === 'countdown'}
        <p class="introduction">
          Local assets load before the match clock starts. No one takes damage
          during loading or the countdown.
        </p>
        <p class="caption">
          A failed load returns everyone to the lobby to ready again.
        </p>
      {:else if result}
        <p class="introduction">
          {result.outcome.kind === 'run-ended'
            ? 'Your hull reached zero.'
            : result.outcome.kind === 'draw'
              ? 'The final survivors were eliminated together.'
              : 'The last survivor takes this round.'} Each rematch starts a fresh
          build.
        </p>
        <p class="duration">
          {timeLabel(result.durationMs)} <span>match time</span>
        </p>
      {:else if match?.phase === 'aborted'}
        <p class="introduction">
          The host stopped this match. No winner or draw was recorded. Return to
          the lobby for a fresh start.
        </p>
      {:else}<p class="introduction">
          Waiting for the host's room snapshot.
        </p>{/if}
    </header>
    <section
      class="menu-content"
      aria-label={!playerId
        ? 'Find a room'
        : match?.phase === 'finished'
          ? 'Results and rematch'
          : 'Room status'}
    >
      {#if !playerId}
        <form
          onsubmit={(event) => {
            event.preventDefault();
            if (available && name.trim()) onjoin(null, name.trim());
          }}
        >
          <label for="display-name">Your display name</label>
          <input
            id="display-name"
            bind:value={name}
            maxlength="24"
            autocomplete="nickname"
            placeholder="Choose a name"
            required
            aria-describedby="name-help"
          />
          <p id="name-help" class="caption">
            Up to 24 characters. Your name is visible to this room.
          </p>
          <button
            class="primary"
            type="submit"
            disabled={!name.trim() || !available}
            >Create a room <span aria-hidden="true">↗</span></button
          >
        </form>
        <div class="rooms-heading">
          <h2>Or join a crew</h2>
          <span>{rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}</span>
        </div>
        <div class="rooms">
          {#each rooms as room (room.id)}
            <div class="room-row">
              <div>
                <strong>Room {room.id.slice(0, 8)}</strong>
                <p>
                  {room.players} / 4 players · {room.players >= 4
                    ? 'Full'
                    : room.phase === 'lobby'
                      ? 'Open lobby'
                      : room.phase === 'running'
                        ? 'Match in progress'
                        : room.phase}
                </p>
              </div>
              <button
                class="ghost"
                disabled={!available ||
                  !name.trim() ||
                  room.players >= 4 ||
                  room.phase !== 'lobby'}
                onclick={() => onjoin(room.id, name.trim())}
                >{room.players >= 4
                  ? 'Full'
                  : room.phase !== 'lobby'
                    ? 'Unavailable'
                    : 'Join room'}</button
              >
            </div>
          {:else}<p class="empty">
              {available
                ? 'No rooms yet. Create one to invite your crew.'
                : 'Waiting for the host to send available rooms.'}
            </p>{/each}
        </div>
        <p class="caption">
          Other players open the host's LAN address in their browser. Creating a
          room uses the running host.
        </p>
      {:else if match?.phase === 'lobby'}
        <h2>Your crew</h2>
        <ol class="crew">
          {#each [0, 1, 2, 3] as index (index)}
            {@const player = match.players[index]}
            <li>
              <span class="crew-number">0{index + 1}</span>{#if player}<div>
                  <strong
                    >{player.name}{player.id === playerId
                      ? ' · you'
                      : ''}</strong
                  >
                  <p>{player.host ? 'Host · ' : ''}Standard</p>
                </div>
                <span
                  class="crew-status"
                  class:ready={player.connected && player.ready}
                  >{!player.connected
                    ? 'Disconnected'
                    : player.ready
                      ? '✓ Ready'
                      : 'Not ready'}</span
                >{:else}<span class="empty">Open seat</span>{/if}
            </li>
          {/each}
        </ol>
        {#if match.loadingError}<p class="notice" role="alert">
            {match.loadingError}
          </p>{/if}
        <div class="actions">
          {#if me?.host && me.ready}<button
              class="primary"
              disabled={!available || !allReady}
              onclick={onstart}>Start match</button
            ><button
              class="ghost"
              disabled={!available}
              onclick={() => onready(false)}>Unready</button
            >{:else}<button
              class="primary"
              disabled={!available}
              onclick={() => onready(!me?.ready)}
              >{me?.ready ? 'Unready' : 'Ready to play'}</button
            >{/if}
          <button class="ghost" disabled={!available} onclick={onleave}
            >Leave room</button
          >
        </div>
        <p class="caption">
          {!allReady
            ? 'Waiting for everyone to connect and ready up.'
            : me?.host
              ? 'Your crew is ready. Start when you are.'
              : 'Everyone is ready. Waiting for the host to start.'}
        </p>
      {:else if match?.phase === 'loading' || match?.phase === 'countdown'}
        <p class="stage-label">
          {match.phase === 'countdown' ? 'Launching in' : 'Your loading status'}
        </p>
        {#if match.phase === 'countdown'}<p
            class="countdown"
            aria-live="polite"
          >
            {Math.ceil((match.countdown ?? 0) / 1000)}
          </p>{:else}<h2 role="status">
            {loadingMessage || 'Preparing local assets'}
          </h2>
          <p class="caption">
            Once your assets are ready, wait here for the rest of the crew. The
            host cancels loading after 30 seconds if someone cannot finish.
          </p>{/if}
        <p class="caption">Keep this tab open.</p>
      {:else if match?.phase === 'finished' || match?.phase === 'aborted'}
        {#if result}
          <h2>Round summary</h2>
          <div class="table-scroll">
            <table>
              <thead
                ><tr
                  ><th scope="col">Player</th><th scope="col">Level</th><th
                    scope="col">Damage dealt</th
                  ><th scope="col">Damage taken</th><th scope="col"
                    >Eliminations</th
                  ><th scope="col">Salvage stages</th></tr
                ></thead
              ><tbody
                >{#each result.players as player (player.id)}<tr
                    ><th scope="row">{player.name}</th><td>{player.level}</td
                    ><td>{Math.round(player.damageDealt)}</td><td
                      >{Math.round(player.damageTaken)}</td
                    ><td>{player.eliminations}</td><td
                      >{player.salvageStages}</td
                    ></tr
                  >{/each}</tbody
              >
            </table>
          </div>
          <p class="caption">
            Elimination order, first to last. Shared groups were simultaneous.
          </p>
          <ol class="eliminations">
            {#each result.eliminationGroups as group (group.join(':'))}<li>
                {group.map(displayName).join(' and ')}
              </li>{:else}<li>No eliminations.</li>{/each}
          </ol>
          <details class="builds">
            <summary>Final builds</summary
            >{#each result.players as player (player.id)}<article>
                <h3>{player.name} · level {player.level}</h3>
                <ul>
                  {#each player.upgrades as upgrade (upgrade.id)}<li>
                      {contentName(upgrade.id)}
                      <RarityBadge rarity={upgrade.rarity} /><span
                        >Rank {upgrade.rank}</span
                      >
                    </li>{:else}<li>No upgrades.</li>{/each}
                </ul>
                <p>
                  Specializations. {player.specializations
                    .map(contentName)
                    .join(', ') || 'None'}
                </p>
                <p>
                  Learned abilities. {player.learnedAbilities
                    .map(contentName)
                    .join(', ') || 'None'}
                </p>
                <p>
                  Equipment. {Object.entries(player.equipment)
                    .map(
                      ([slot, id]) =>
                        `${slot} ${id ? contentName(id) : slot === 'primary' ? 'basic strike' : 'empty'}`,
                    )
                    .join(' · ')}
                </p>
              </article>{/each}
          </details>
        {/if}
        <div class="actions">
          {#if me?.host}<button
              class="primary"
              disabled={!available}
              onclick={onreturn}>Return everyone to lobby</button
            >{/if}<button class="ghost" disabled={!available} onclick={onleave}
            >Leave room</button
          >
        </div>
        {#if !me?.host}<p class="caption">
            Waiting for the host to return everyone to the lobby.
          </p>{/if}
      {:else}<p role="status">Waiting for room information.</p>{/if}
    </section>
  </div>
  <footer>
    One life. Endless ways to evolve. <span
      >{actionLabel(preferences, 'up')}/{actionLabel(
        preferences,
        'left',
      )}/{actionLabel(preferences, 'down')}/{actionLabel(preferences, 'right')} to
      move · mouse to aim</span
    >
  </footer>
</div>

<style>
  .menu-journey {
    max-width: 1280px;
    width: calc(100vw / var(--ui-scale, 1));
    min-height: calc(100svh / var(--ui-scale, 1));
    zoom: var(--ui-scale, 1);
    box-sizing: border-box;
    margin: auto;
    padding: 24px 36px;
    display: flex;
    flex-direction: column;
    gap: 36px;
  }
  nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
  }
  .wordmark {
    font-weight: 600;
    letter-spacing: 0.08em;
  }
  .wordmark span {
    color: #8052ff;
    margin-left: 8px;
  }
  .connection {
    color: #bdbdbd;
  }
  .menu-grid {
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: clamp(30px, 6vw, 90px);
    flex: 1;
    align-items: start;
  }
  header {
    min-width: 0;
  }
  h1 {
    margin: 18px 0 24px;
    max-width: 8.5em;
    font-size: clamp(52px, 6.9vw, 96px);
    line-height: 0.96;
    font-weight: 400;
    letter-spacing: -0.055em;
    overflow-wrap: anywhere;
  }
  .eyebrow {
    color: #ffb829;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    font-size: 12px;
    font-weight: 600;
  }
  .field-guide {
    max-height: 36vh;
    overflow-y: auto;
    font-size: 14px;
    line-height: 1.5;
  }
  .field-guide summary {
    cursor: pointer;
    margin-bottom: 12px;
  }
  .introduction {
    font-size: 18px;
    font-weight: 200;
    line-height: 1.5;
    max-width: 28em;
  }
  .constellation {
    display: block;
    width: min(100%, 370px);
    margin: 12px 0 0 auto;
  }
  .menu-content {
    padding-top: 24px;
    min-width: 0;
  }
  h2 {
    font-size: 26px;
    line-height: 1.2;
    font-weight: 400;
    letter-spacing: -0.03em;
    margin: 0 0 18px;
  }
  h3 {
    font-size: 18px;
    font-weight: 400;
  }
  form {
    margin-bottom: 42px;
  }
  label {
    font-size: 14px;
  }
  input {
    box-sizing: border-box;
    display: block;
    width: 100%;
    margin-top: 12px;
    padding: 14px 0;
    color: #fff;
    background: transparent;
    border: 0;
    border-bottom: 1px solid #777;
    font: inherit;
    font-size: 24px;
    border-radius: 0;
  }
  input::placeholder {
    color: #898989;
  }
  button {
    display: inline-flex;
    gap: 20px;
    align-items: center;
    justify-content: center;
    color: white;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }
  .primary {
    background: #8052ff;
    border: 1px solid #8052ff;
    border-radius: 24px;
    padding: 14px 22px;
  }
  .ghost {
    padding: 10px 0;
    background: transparent;
    border: 0;
    text-decoration: underline;
    text-underline-offset: 5px;
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  :is(button, input, summary):focus-visible {
    outline: 2px solid #ffb829;
    outline-offset: 5px;
  }
  .caption {
    color: #bdbdbd;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.5;
  }
  form .caption {
    margin-bottom: 22px;
  }
  .rooms-heading {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }
  .rooms-heading > span {
    color: #9a9a9a;
    font-size: 12px;
  }
  .room-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 0;
    border-top: 1px solid #444;
  }
  .room-row strong {
    font-size: 15px;
    font-weight: 400;
  }
  .room-row p,
  .crew p {
    color: #bdbdbd;
    font-size: 13px;
    margin: 6px 0 0;
  }
  .empty {
    color: #9a9a9a;
    line-height: 1.5;
  }
  .crew {
    list-style: none;
    margin: 0 0 24px;
    padding: 0;
  }
  .crew li {
    min-height: 65px;
    border-top: 1px solid #444;
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 10px 0;
  }
  .crew-number {
    color: #9a9a9a;
    font-size: 12px;
  }
  .crew strong {
    font-weight: 400;
    overflow-wrap: anywhere;
  }
  .crew-status {
    font-size: 12px;
    color: #ffb829;
    margin-left: auto;
    white-space: nowrap;
  }
  .crew-status.ready {
    color: #fff;
  }
  .actions {
    display: flex;
    gap: 22px;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 24px;
  }
  .notice {
    color: #ffb829;
    border-left: 2px solid #ffb829;
    padding: 0 0 0 16px;
    font-size: 14px;
    line-height: 1.5;
  }
  .notice p {
    margin: 0;
  }
  .stage-label {
    color: #bdbdbd;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.06em;
  }
  .countdown {
    font-size: 160px;
    line-height: 1;
    font-weight: 400;
    margin: 18px 0;
    font-variant-numeric: tabular-nums;
  }
  .duration {
    font-size: 56px;
    letter-spacing: -0.04em;
  }
  .duration span {
    display: block;
    color: #bdbdbd;
    font-size: 14px;
    letter-spacing: 0;
  }
  .table-scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 12px;
    text-align: left;
  }
  th,
  td {
    padding: 12px 7px;
    border-bottom: 1px solid #444;
    font-weight: 400;
  }
  thead {
    color: #bdbdbd;
  }
  tbody th {
    overflow-wrap: anywhere;
    min-width: 70px;
  }
  .eliminations {
    padding-left: 18px;
    font-size: 14px;
    line-height: 1.6;
  }
  .builds {
    margin-top: 18px;
    border-top: 1px solid #444;
    padding-top: 16px;
    font-size: 13px;
    line-height: 1.5;
  }
  summary {
    width: fit-content;
    cursor: pointer;
  }
  .builds article {
    border-bottom: 1px solid #444;
    padding-bottom: 12px;
    overflow-wrap: anywhere;
  }
  .builds ul {
    padding: 0;
    list-style: none;
  }
  .builds li {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin: 10px 0;
  }
  footer {
    border-top: 1px solid #333;
    padding-top: 18px;
    display: flex;
    justify-content: space-between;
    gap: 18px;
    color: #9a9a9a;
    font-size: 12px;
  }
  @media (max-width: 760px) {
    .menu-journey {
      padding: 20px;
      gap: 24px;
    }
    .menu-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }
    h1 {
      font-size: clamp(50px, 10vw, 76px);
    }
    .constellation {
      width: 220px;
    }
    .menu-content {
      padding-top: 0;
    }
    footer {
      flex-wrap: wrap;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
    }
  }
</style>
