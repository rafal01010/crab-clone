export class TrafficBudget {
  #tokens: number;
  #updatedAt = performance.now();

  constructor(
    private readonly perSecond: number,
    private readonly burst: number,
  ) {
    this.#tokens = burst;
  }

  take(): boolean {
    const now = performance.now();
    this.#tokens = Math.min(
      this.burst,
      this.#tokens + ((now - this.#updatedAt) * this.perSecond) / 1000,
    );
    this.#updatedAt = now;
    if (this.#tokens < 1) return false;
    this.#tokens--;
    return true;
  }
}
