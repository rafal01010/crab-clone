import { CONTROL_BUTTON } from '../../../shared/protocol/index.js';
import { DEFAULT_BINDINGS, type Bindings, isInput } from './preferences.js';

type Control = { x: number; y: number; aim: number; buttons: number };

export function createControls(
  canvas: HTMLCanvasElement,
  projectAim: (x: number, y: number) => number | null,
  send: (control: Control) => void,
) {
  const keys = new Set<string>();
  const mouse = new Set<number>();
  let bindings: Bindings = { ...DEFAULT_BINDINGS };
  let enabled = false;
  let pointer: { x: number; y: number } | null = null;
  let aim = 0;
  const modalCapture = () =>
    Boolean(
      document.querySelector(
        '[data-game-capture]:not(details), details[data-game-capture][open], [aria-modal="true"]',
      ),
    );
  const captured = () => {
    const active = document.activeElement;
    return (
      modalCapture() ||
      (active instanceof HTMLElement &&
        active !== canvas &&
        (active.isContentEditable ||
          active.matches('input, textarea, select, button, summary, a[href]')))
    );
  };
  function transmit() {
    if (!enabled) return;
    if (captured()) {
      keys.clear();
      mouse.clear();
    }
    const held = (action: keyof Bindings) => {
      const input = bindings[action];
      return input.startsWith('Mouse')
        ? mouse.has(Number(input.slice(5)))
        : keys.has(input);
    };
    const x = Number(held('right')) - Number(held('left'));
    const y = Number(held('down')) - Number(held('up'));
    const length = Math.hypot(x, y) || 1;
    if (pointer) aim = projectAim(pointer.x, pointer.y) ?? aim;
    const buttons =
      (held('primary') ? CONTROL_BUTTON.primary : 0) |
      (held('secondary') ? CONTROL_BUTTON.secondary : 0) |
      (held('movement') ? CONTROL_BUTTON.movement : 0) |
      (held('ultimate') ? CONTROL_BUTTON.ultimate : 0) |
      (held('interact') ? CONTROL_BUTTON.interact : 0);
    send({ x: x / length, y: y / length, aim, buttons });
  }
  function clear() {
    keys.clear();
    mouse.clear();
    transmit();
  }
  function keydown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey) {
      clear();
      return;
    }
    if (
      !enabled ||
      captured() ||
      !isInput(event.code) ||
      !Object.values(bindings).includes(event.code)
    )
      return;
    if (event.repeat && !keys.has(event.code)) return;
    event.preventDefault();
    keys.add(event.code);
    transmit();
  }
  function keyup(event: KeyboardEvent) {
    if (keys.delete(event.code)) {
      event.preventDefault();
      transmit();
    }
  }
  function move(event: MouseEvent) {
    pointer = { x: event.clientX, y: event.clientY };
  }
  function down(event: MouseEvent) {
    if (!enabled || modalCapture()) return;
    canvas.focus({ preventScroll: true });
    pointer = { x: event.clientX, y: event.clientY };
    if (
      !Object.values(bindings).some((input) => input === `Mouse${event.button}`)
    )
      return;
    event.preventDefault();
    mouse.add(event.button);
    transmit();
  }
  function up(event: MouseEvent) {
    if (mouse.delete(event.button)) transmit();
  }
  function focusin() {
    if (captured()) clear();
  }
  function visibility() {
    if (document.hidden) clear();
  }
  function contextmenu(event: MouseEvent) {
    event.preventDefault();
  }
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', clear);
  window.addEventListener('mouseup', up);
  document.addEventListener('focusin', focusin);
  document.addEventListener('visibilitychange', visibility);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mousedown', down);
  canvas.addEventListener('contextmenu', contextmenu);
  canvas.addEventListener('auxclick', contextmenu);
  const timer = window.setInterval(transmit, 50);
  return {
    setBindings(next: Bindings) {
      clear();
      bindings = { ...next };
    },
    setEnabled(next: boolean) {
      if (!next && enabled) clear();
      enabled = next;
    },
    dispose() {
      clear();
      window.clearInterval(timer);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', clear);
      window.removeEventListener('mouseup', up);
      document.removeEventListener('focusin', focusin);
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mousedown', down);
      canvas.removeEventListener('contextmenu', contextmenu);
      canvas.removeEventListener('auxclick', contextmenu);
    },
  };
}
