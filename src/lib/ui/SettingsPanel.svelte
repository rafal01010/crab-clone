<script lang="ts">
  import { onMount, tick } from 'svelte';
  import {
    ACTIONS,
    DEFAULT_BINDINGS,
    DEFAULT_PREFERENCES,
    actionLabel,
    inputLabel,
    isInput,
    usePreferences,
    type Action,
    type Input,
  } from '../game-client/preferences.js';
  let {
    storageMessage,
    audioMessage,
    warning,
    choiceOpen,
  }: {
    storageMessage: string | null;
    audioMessage: string | null;
    warning: string;
    choiceOpen: boolean;
  } = $props();
  const preferences = usePreferences();
  let panel = $state<HTMLDetailsElement>();
  let body = $state<HTMLDivElement>();
  let capture = $state<
    | { kind: 'idle' }
    | { kind: 'listening'; action: Action }
    | { kind: 'conflict'; action: Action; input: Input; other: Action }
  >({ kind: 'idle' });
  let message = $state('');
  $effect(() => {
    if (choiceOpen) capture = { kind: 'idle' };
  });
  function assign(input: Input) {
    if (!preferences || capture.kind !== 'listening') return;
    const action = capture.action;
    const other = ACTIONS.find(
      (item) =>
        item.id !== action && preferences.current.bindings[item.id] === input,
    );
    if (other) capture = { kind: 'conflict', action, input, other: other.id };
    else {
      preferences.update({
        bindings: { ...preferences.current.bindings, [action]: input },
      });
      capture = { kind: 'idle' };
      message = `Bound ${ACTIONS.find((item) => item.id === action)?.name} to ${inputLabel(input)}.`;
    }
  }
  function swap() {
    if (!preferences || capture.kind !== 'conflict') return;
    const { action, other, input } = capture;
    preferences.update({
      bindings: {
        ...preferences.current.bindings,
        [action]: input,
        [other]: preferences.current.bindings[action],
      },
    });
    capture = { kind: 'idle' };
    message =
      'Bindings swapped. Release held controls before returning to the world.';
  }
  async function listen(action: Action) {
    capture = { kind: 'listening', action };
    message = '';
    await tick();
    body?.focus();
  }
  function close() {
    if (!panel) return;
    panel.open = false;
    capture = { kind: 'idle' };
    (
      document.querySelector<HTMLCanvasElement>('canvas[tabindex="0"]') ??
      panel.querySelector('summary')
    )?.focus();
  }
  onMount(() => {
    const key = (event: KeyboardEvent) => {
      if (!panel?.open) return;
      // A timed game choice keeps priority over the settings panel.
      if (document.querySelector('[aria-modal="true"]')) {
        capture = { kind: 'idle' };
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (capture.kind !== 'idle') capture = { kind: 'idle' };
        else close();
        return;
      }
      if (capture.kind !== 'listening') return;
      if (event.key === 'Tab') {
        capture = { kind: 'idle' };
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat || event.ctrlKey || event.metaKey) return;
      if (isInput(event.code)) assign(event.code);
      else
        message =
          'That key is reserved for menus, choices, or the browser. Choose another key.';
    };
    const mouse = (event: MouseEvent) => {
      if (
        capture.kind !== 'listening' ||
        !panel?.open ||
        document.querySelector('[aria-modal="true"]')
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const input = `Mouse${event.button}`;
      if (isInput(input)) assign(input);
    };
    const clear = () => {
      capture = { kind: 'idle' };
    };
    const visibility = () => {
      if (document.hidden) clear();
    };
    const contextmenu = (event: MouseEvent) => {
      if (panel?.open) event.preventDefault();
    };
    window.addEventListener('keydown', key, true);
    window.addEventListener('mousedown', mouse, true);
    window.addEventListener('blur', clear);
    window.addEventListener('contextmenu', contextmenu, true);
    window.addEventListener('auxclick', contextmenu, true);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('mousedown', mouse, true);
      window.removeEventListener('blur', clear);
      window.removeEventListener('contextmenu', contextmenu, true);
      window.removeEventListener('auxclick', contextmenu, true);
      document.removeEventListener('visibilitychange', visibility);
    };
  });
</script>

{#if preferences}
  <details
    class="settings"
    bind:this={panel}
    inert={choiceOpen}
    data-game-capture
    ontoggle={() => {
      if (!panel?.open) capture = { kind: 'idle' };
    }}
  >
    <summary>Settings and controls</summary>
    <div class="settings-body" bind:this={body} tabindex="-1">
      <header>
        <div>
          <h2>Settings and controls</h2>
          {#if warning}<p role="status">{warning}</p>{/if}
        </div>
        <button onclick={close}>Close</button>
      </header>
      <p>
        The world continues while this panel is open. Your craft has no extra
        protection. Escape cancels rebinding or closes this panel.
      </p>
      {#if storageMessage}<p role="status">{storageMessage}</p>{/if}
      <fieldset>
        <legend>Presentation</legend>
        <label
          >UI scale <select
            value={String(preferences.current.uiScale)}
            onchange={(e) =>
              preferences.update({ uiScale: Number(e.currentTarget.value) })}
            ><option value="1">100%</option><option value="1.1">110%</option
            ><option value="1.25">125%</option></select
          ></label
        >
        <label
          >Render scale <select
            value={String(preferences.current.renderScale)}
            onchange={(e) =>
              preferences.update({
                renderScale: Number(e.currentTarget.value),
              })}
            ><option value="1">100%</option><option value="0.75">75%</option
            ><option value="0.5">50%</option></select
          ></label
        >
        <label
          >Quality <select
            value={preferences.current.quality}
            onchange={(e) =>
              preferences.update({
                quality:
                  e.currentTarget.value === 'balanced' ? 'balanced' : 'low',
              })}
            ><option value="low">Low · fewer effects</option><option
              value="balanced">Balanced · more detail</option
            ></select
          ></label
        >
        <p>
          At 100%, the game uses your display's pixel density. Lower render
          scale to lighten GPU load. Quality controls scenery and weather
          detail.
        </p>
        <label
          >Motion <select
            value={preferences.current.motion}
            onchange={(e) =>
              preferences.update({
                motion:
                  e.currentTarget.value === 'reduced' ? 'reduced' : 'system',
              })}
            ><option value="system">Follow device preference</option><option
              value="reduced">Reduce motion</option
            ></select
          ></label
        >
        <label
          ><input
            type="checkbox"
            checked={preferences.current.damageNumbers}
            onchange={(e) =>
              preferences.update({ damageNumbers: e.currentTarget.checked })}
          /> Show damage numbers</label
        >
      </fieldset>
      <fieldset>
        <legend>Sound</legend>
        <label
          ><input
            type="checkbox"
            checked={!preferences.current.muted}
            onchange={(e) =>
              preferences.update({ muted: !e.currentTarget.checked })}
          /> Enable local cues</label
        >
        <label
          >Master volume {Math.round(preferences.current.volume * 100)}%
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={preferences.current.volume}
            oninput={(e) =>
              preferences.update({ volume: Number(e.currentTarget.value) })}
          /></label
        >
        <p>
          Hit, pickup, confirmed upgrade, and danger cues have visual
          equivalents. Sound starts after a key press or click.
        </p>
        {#if audioMessage}<p role="status">{audioMessage}</p>{/if}
      </fieldset>
      <fieldset>
        <legend>Controls</legend>
        <p>
          Choose Rebind, then press one key or mouse button. A conflict can swap
          both actions. Tab, Enter, Escape, and number keys 1 to 4 remain
          available for menus and choices. Labels use physical key positions.
        </p>
        {#each ACTIONS as action (action.id)}<div class="binding">
            <span>{action.name}</span><kbd
              >{actionLabel(preferences, action.id)}</kbd
            ><button
              aria-label={`Rebind ${action.name}`}
              onclick={() => listen(action.id)}>Rebind</button
            >
          </div>{/each}
        {#if capture.kind === 'listening'}<p role="status">
            Press a key or mouse button for {ACTIONS.find(
              (a) => capture.kind === 'listening' && a.id === capture.action,
            )?.name}. Escape or Tab cancels.
          </p>{:else if capture.kind === 'conflict'}<div role="status">
            <p>
              {inputLabel(capture.input)} already controls {ACTIONS.find(
                (a) => capture.kind === 'conflict' && a.id === capture.other,
              )?.name}.
            </p>
            <button onclick={swap}>Swap bindings</button><button
              onclick={() => {
                capture = { kind: 'idle' };
              }}>Keep current bindings</button
            >
          </div>{/if}
        <p role="status">{message}</p>
        <button
          onclick={() => {
            preferences.update({ bindings: { ...DEFAULT_BINDINGS } });
            capture = { kind: 'idle' };
            message = 'Default controls restored.';
          }}>Reset controls</button
        >
      </fieldset>
      <button
        onclick={() => {
          preferences.update({
            ...DEFAULT_PREFERENCES,
            bindings: { ...DEFAULT_BINDINGS },
          });
          capture = { kind: 'idle' };
          message = 'All local preferences reset.';
        }}>Reset all preferences</button
      >
    </div>
  </details>
{/if}

<style>
  .settings {
    position: fixed;
    bottom: 12px;
    right: 12px;
    z-index: 9;
    zoom: var(--ui-scale, 1);
    font-size: 14px;
  }
  summary,
  button,
  select {
    cursor: pointer;
  }
  summary {
    padding: 10px 16px;
    border: 1px solid #bdbdbd;
    border-radius: 24px;
    background: #080b10;
  }
  .settings-body {
    position: fixed;
    top: 12px;
    right: 12px;
    width: min(580px, calc(100vw / var(--ui-scale, 1) - 24px));
    height: calc(100svh / var(--ui-scale, 1) - 24px);
    box-sizing: border-box;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: #080b10;
    border: 1px solid #bdbdbd;
    padding: 20px;
  }
  header,
  .binding {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  header {
    position: sticky;
    top: -20px;
    padding: 12px 0;
    background: #080b10;
    z-index: 1;
  }
  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 500;
  }
  p {
    line-height: 1.5;
    color: #d0d3da;
  }
  fieldset {
    margin: 20px 0;
    border: 1px solid #707989;
    padding: 14px;
    min-width: 0;
  }
  label {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin: 14px 0;
  }
  button,
  select {
    font: inherit;
    color: white;
    border: 1px solid #9ca4b1;
    background: #151c27;
    border-radius: 5px;
    padding: 8px 12px;
  }
  .binding {
    padding: 7px 0;
    flex-wrap: wrap;
    border-bottom: 1px solid #363f4d;
  }
  .binding span {
    flex: 1;
    min-width: 120px;
  }
  kbd {
    font: inherit;
  }
  :is(button, select, input, summary):focus-visible {
    outline: 3px solid #ffb829;
    outline-offset: 3px;
  }
</style>
