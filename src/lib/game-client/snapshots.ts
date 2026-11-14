export type Position = { x: number; y: number; z: number };
type Snapshot = { timestamp: number; position: Position };

const DELAY_MS = 100;
const HISTORY_MS = 1000;

export class SnapshotClock {
  #offset = Infinity;

  observe(timestamp: number, receivedAt: number): void {
    this.#offset = Math.min(this.#offset, receivedAt - timestamp);
  }
  time(now: number): number {
    return now - this.#offset - DELAY_MS;
  }
}

export class SnapshotTimeline {
  readonly #clock: SnapshotClock;
  readonly #samples: Snapshot[] = [];

  constructor(clock = new SnapshotClock()) {
    this.#clock = clock;
  }

  add(timestamp: number, position: Position, receivedAt: number): void {
    const last = this.#samples.at(-1);
    if (last && timestamp <= last.timestamp) return;
    this.#clock.observe(timestamp, receivedAt);
    this.#samples.push({ timestamp, position: { ...position } });
    while (this.#samples.length > 2) {
      const next = this.#samples[1];
      if (!next || next.timestamp >= timestamp - HISTORY_MS) break;
      this.#samples.shift();
    }
  }

  sample(now: number): Position | null {
    const first = this.#samples[0];
    if (!first) return null;
    const time = this.#clock.time(now);
    while (this.#samples.length > 2) {
      const next = this.#samples[1];
      if (!next || next.timestamp > time) break;
      this.#samples.shift();
    }
    const previous = this.#samples[0];
    if (!previous) return null;
    const next = this.#samples[1];
    if (!next || time <= previous.timestamp) return previous.position;
    const fraction = Math.min(
      1,
      (time - previous.timestamp) / (next.timestamp - previous.timestamp),
    );
    return {
      x:
        previous.position.x +
        (next.position.x - previous.position.x) * fraction,
      y:
        previous.position.y +
        (next.position.y - previous.position.y) * fraction,
      z:
        previous.position.z +
        (next.position.z - previous.position.z) * fraction,
    };
  }
}
