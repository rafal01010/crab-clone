import { CONTROL_BUTTON } from '../../../shared/protocol/index.js';

type Control = { x: number; y: number; aim: number; buttons: number };

export function createControls(
  canvas: HTMLCanvasElement,
  projectAim: (x: number, y: number) => number | null,
  send: (control: Control) => void,
) {
  const keys = new Set<string>();
  const mouse = new Set<number>();
  const relevant = new Set([
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'Space',
    'KeyQ',
    'KeyE',
  ]);
  let enabled = false;
  let pointer: { x: number; y: number } | null = null;
  let aim = 0;
  const modalCapture = () =>
    Boolean(document.querySelector('[data-game-capture], [aria-modal="true"]'));
  const captured = () => {
    const active = document.activeElement;
    return (
      modalCapture() ||
      (active instanceof HTMLElement &&
        active !== canvas &&
        (active.isContentEditable ||
          active.matches('input, textarea, select, button')))
    );
  };
  function transmit() {
    if (!enabled) return;
    if (captured()) {
      keys.clear();
      mouse.clear();
    }
    const x = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
    const y = Number(keys.has('KeyS')) - Number(keys.has('KeyW'));
    const length = Math.hypot(x, y) || 1;
    if (pointer) aim = projectAim(pointer.x, pointer.y) ?? aim;
    const buttons =
      (mouse.has(0) ? CONTROL_BUTTON.primary : 0) |
      (mouse.has(2) ? CONTROL_BUTTON.secondary : 0) |
      (keys.has('Space') ? CONTROL_BUTTON.movement : 0) |
      (keys.has('KeyQ') ? CONTROL_BUTTON.ultimate : 0) |
      (keys.has('KeyE') ? CONTROL_BUTTON.interact : 0);
    send({ x: x / length, y: y / length, aim, buttons });
  }
  function clear() {
    keys.clear();
    mouse.clear();
    transmit();
  }
  function keydown(event: KeyboardEvent) {
    if (!enabled || captured() || !relevant.has(event.code)) return;
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
    if (
      !enabled ||
      modalCapture() ||
      (event.button !== 0 && event.button !== 2)
    )
      return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    pointer = { x: event.clientX, y: event.clientY };
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
  const timer = window.setInterval(transmit, 50);
  return {
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
    },
  };
}
