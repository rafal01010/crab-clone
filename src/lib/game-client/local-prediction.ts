import { controlledVelocity, type Movement } from '../../../shared/movement.ts';
import type { Position } from './snapshots.js';

const MAX_PREDICTION_MS = 250;
const MAX_CORRECTION = 1;

type Estimate = {
  position: Position;
  velocity: { x: number; z: number };
  snapshotAt: number;
  lastStep: number;
};

export class LocalPrediction {
  #estimate: Estimate | null = null;
  #input: Movement = { x: 0, y: 0 };

  input(input: Movement): void {
    this.#input = input;
  }

  reset(): void {
    this.#estimate = null;
    this.#input = { x: 0, y: 0 };
  }

  observe(position: Position, receivedAt: number): void {
    const estimate = this.#estimate;
    if (!estimate) {
      this.#estimate = {
        position: { ...position },
        velocity: { x: 0, z: 0 },
        snapshotAt: receivedAt,
        lastStep: receivedAt,
      };
      return;
    }
    const dx = position.x - estimate.position.x;
    const dz = position.z - estimate.position.z;
    const distance = Math.hypot(dx, dz);
    const factor = distance > MAX_CORRECTION ? 1 : 0.5;
    estimate.position.x += dx * factor;
    estimate.position.z += dz * factor;
    estimate.position.y = position.y;
    estimate.snapshotAt = receivedAt;
    estimate.lastStep = receivedAt;
  }

  sample(now: number): Position | null {
    const estimate = this.#estimate;
    if (!estimate) return null;
    const end = Math.min(now, estimate.snapshotAt + MAX_PREDICTION_MS);
    const dt = Math.max(0, Math.min(0.05, (end - estimate.lastStep) / 1000));
    estimate.velocity = controlledVelocity(estimate.velocity, this.#input, dt);
    estimate.position.x += estimate.velocity.x * dt;
    estimate.position.z += estimate.velocity.z * dt;
    estimate.lastStep = Math.max(estimate.lastStep, end);
    return estimate.position;
  }
}
