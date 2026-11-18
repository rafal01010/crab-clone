import { getContext } from 'svelte';

export const ACTIONS = [
  { id: 'up', name: 'Move forward' },
  { id: 'left', name: 'Move left' },
  { id: 'down', name: 'Move backward' },
  { id: 'right', name: 'Move right' },
  { id: 'primary', name: 'Primary attack' },
  { id: 'secondary', name: 'Secondary attack' },
  { id: 'movement', name: 'Movement ability' },
  { id: 'ultimate', name: 'Ultimate ability' },
  { id: 'interact', name: 'Nearby interaction' },
] as const;
export type Action = (typeof ACTIONS)[number]['id'];
// Menu navigation and choice shortcuts stay reserved, including Escape to cancel.
const INPUTS = [
  'KeyA',
  'KeyB',
  'KeyC',
  'KeyD',
  'KeyE',
  'KeyF',
  'KeyG',
  'KeyH',
  'KeyI',
  'KeyJ',
  'KeyK',
  'KeyL',
  'KeyM',
  'KeyN',
  'KeyO',
  'KeyP',
  'KeyQ',
  'KeyR',
  'KeyS',
  'KeyT',
  'KeyU',
  'KeyV',
  'KeyW',
  'KeyX',
  'KeyY',
  'KeyZ',
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ShiftLeft',
  'ShiftRight',
  'AltLeft',
  'AltRight',
  'Digit0',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
  'Digit9',
  'Minus',
  'Equal',
  'BracketLeft',
  'BracketRight',
  'Backslash',
  'Semicolon',
  'Quote',
  'Comma',
  'Period',
  'Slash',
  'Backquote',
  'Numpad0',
  'Numpad1',
  'Numpad2',
  'Numpad3',
  'Numpad4',
  'Numpad5',
  'Numpad6',
  'Numpad7',
  'Numpad8',
  'Numpad9',
  'NumpadAdd',
  'NumpadSubtract',
  'NumpadMultiply',
  'NumpadDivide',
  'NumpadDecimal',
  'Mouse0',
  'Mouse1',
  'Mouse2',
  'Mouse3',
  'Mouse4',
] as const;
export type Input = (typeof INPUTS)[number];
export type Bindings = Record<Action, Input>;
export const DEFAULT_BINDINGS: Readonly<Bindings> = {
  up: 'KeyW',
  left: 'KeyA',
  down: 'KeyS',
  right: 'KeyD',
  primary: 'Mouse0',
  secondary: 'Mouse2',
  movement: 'Space',
  ultimate: 'KeyQ',
  interact: 'KeyE',
};
export type Preferences = {
  uiScale: number;
  renderScale: number;
  quality: 'low' | 'balanced';
  motion: 'system' | 'reduced';
  damageNumbers: boolean;
  muted: boolean;
  volume: number;
  bindings: Bindings;
};
export const DEFAULT_PREFERENCES: Readonly<Preferences> = {
  uiScale: 1,
  renderScale: 1,
  quality: 'low',
  motion: 'system',
  damageNumbers: false,
  muted: true,
  volume: 0.35,
  bindings: { ...DEFAULT_BINDINGS },
};
export const PREFERENCE_KEY = 'ycce.presentation.v1';
export const PREFERENCE_CONTEXT = Symbol('presentation preferences');
export type PreferenceContext = {
  readonly current: Preferences;
  update: (patch: Partial<Preferences>) => void;
};
export const usePreferences = () =>
  getContext<PreferenceContext | undefined>(PREFERENCE_CONTEXT);
export function isInput(value: unknown): value is Input {
  return INPUTS.some((input) => input === value);
}
export function inputLabel(input: Input): string {
  if (input.startsWith('Key')) return input.slice(3);
  if (input.startsWith('Digit')) return input.slice(5);
  if (input.startsWith('Mouse')) {
    const names: Readonly<Record<string, string>> = {
      Mouse0: 'Mouse 1',
      Mouse1: 'Middle mouse',
      Mouse2: 'Mouse 2',
      Mouse3: 'Mouse back',
      Mouse4: 'Mouse forward',
    };
    return names[input] ?? input;
  }
  return input.replace(/([a-z])([A-Z])/g, '$1 $2');
}
export function actionLabel(
  preferences: PreferenceContext | undefined,
  action: Action,
): string {
  return inputLabel(
    preferences?.current.bindings[action] ?? DEFAULT_BINDINGS[action],
  );
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function parsePreferences(value: unknown): Preferences {
  const result: Preferences = {
    ...DEFAULT_PREFERENCES,
    bindings: { ...DEFAULT_BINDINGS },
  };
  if (!record(value)) return result;
  for (const [key, min, max] of [
    ['uiScale', 1, 1.25],
    ['renderScale', 0.5, 1],
    ['volume', 0, 1],
  ] as const) {
    const number = value[key];
    if (typeof number === 'number' && Number.isFinite(number))
      result[key] = Math.max(min, Math.min(max, number));
  }
  if (value.quality === 'low' || value.quality === 'balanced')
    result.quality = value.quality;
  if (value.motion === 'system' || value.motion === 'reduced')
    result.motion = value.motion;
  if (typeof value.damageNumbers === 'boolean')
    result.damageNumbers = value.damageNumbers;
  if (typeof value.muted === 'boolean') result.muted = value.muted;
  const stored = value.bindings;
  if (record(stored)) {
    const bindings = { ...DEFAULT_BINDINGS };
    const used = new Set<Input>();
    for (const { id } of ACTIONS) {
      const input = stored[id];
      if (!isInput(input) || used.has(input)) return result;
      bindings[id] = input;
      used.add(input);
    }
    result.bindings = bindings;
  }
  return result;
}
