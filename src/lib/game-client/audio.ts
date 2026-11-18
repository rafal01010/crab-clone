import type { MatchView } from '../../../shared/match.js';
import type { Preferences } from './preferences.js';

type Cue = 'hit' | 'pickup' | 'upgrade' | 'warning';
// Original synthesized cues. No recordings, sound packs, or network assets.
const CUES = {
  hit: { start: 210, end: 110, duration: 0.055, gain: 0.16, interval: 100 },
  pickup: { start: 560, end: 760, duration: 0.075, gain: 0.1, interval: 180 },
  upgrade: { start: 480, end: 960, duration: 0.18, gain: 0.13, interval: 200 },
  warning: { start: 740, end: 370, duration: 0.22, gain: 0.14, interval: 1500 },
} satisfies Record<
  Cue,
  {
    start: number;
    end: number;
    duration: number;
    gain: number;
    interval: number;
  }
>;

export function createAudio(onstatus: (message: string | null) => void) {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let preferences: Pick<Preferences, 'muted' | 'volume'> = {
    muted: true,
    volume: 0.35,
  };
  let deafened = false;
  let connected = false;
  let disposed = false;
  let identity = '';
  let lastFeedback = 0;
  let seeded = false;
  let warnedBoundary: 'calm' | 'soon' | 'closing' = 'calm';
  let warnedMeteors = new Set<number>();
  const voices = new Map<OscillatorNode, GainNode>();
  const lastCue = new Map<Cue, number>();
  function stopVoices() {
    for (const [oscillator, gain] of voices) {
      oscillator.onended = null;
      oscillator.stop();
      oscillator.disconnect();
      gain.disconnect();
    }
    voices.clear();
  }
  function volume() {
    if (master && context)
      master.gain.setValueAtTime(
        preferences.muted || deafened || !connected || document.hidden
          ? 0
          : preferences.volume,
        context.currentTime,
      );
  }
  function unlock() {
    if (
      disposed ||
      preferences.muted ||
      preferences.volume === 0 ||
      document.hidden
    )
      return;
    try {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.connect(context.destination);
        volume();
      }
      if (context.state === 'running') return;
      void context
        .resume()
        .then(() => {
          if (!disposed) onstatus(null);
        })
        .catch(() => {
          if (!disposed)
            onstatus('Sound is blocked. Click or press a key to retry.');
        });
    } catch {
      onstatus(
        'Sound is unavailable in this browser. Visual cues remain active.',
      );
    }
  }
  function cue(kind: Cue) {
    if (
      !context ||
      !master ||
      context.state !== 'running' ||
      preferences.muted ||
      preferences.volume === 0 ||
      deafened ||
      !connected ||
      document.hidden ||
      voices.size >= 6
    )
      return;
    const now = context.currentTime;
    const spec = CUES[kind];
    if (now - (lastCue.get(kind) ?? -Infinity) < spec.interval / 1000) return;
    lastCue.set(kind, now);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === 'warning' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(spec.start, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      spec.end,
      now + spec.duration,
    );
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(spec.gain, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, now + spec.duration);
    oscillator.connect(gain);
    gain.connect(master);
    voices.set(oscillator, gain);
    oscillator.onended = () => {
      voices.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(now);
    oscillator.stop(now + spec.duration + 0.01);
  }
  function visibility() {
    stopVoices();
    volume();
    if (document.hidden) void context?.suspend().catch(() => {});
    // Returning to the tab waits for a new gesture, without replaying cues.
  }
  const gesture = (event: Event) => {
    if (event.isTrusted) unlock();
  };
  window.addEventListener('pointerdown', gesture);
  window.addEventListener('keydown', gesture);
  document.addEventListener('visibilitychange', visibility);
  return {
    unlock,
    setPreferences(next: Pick<Preferences, 'muted' | 'volume'>) {
      preferences = { ...next };
      if (next.muted || next.volume === 0) stopVoices();
      volume();
    },
    setConnected(value: boolean) {
      connected = value;
      if (!value) {
        stopVoices();
        seeded = false;
      }
      volume();
    },
    confirmedUpgrade() {
      cue('upgrade');
    },
    reset() {
      stopVoices();
      identity = '';
      lastFeedback = 0;
      seeded = false;
      warnedBoundary = 'calm';
      warnedMeteors.clear();
      lastCue.clear();
    },
    update(match: MatchView, playerId: string | null) {
      const nextIdentity = `${match.roundId}:${playerId ?? ''}`;
      if (identity !== nextIdentity) {
        this.reset();
        identity = nextIdentity;
      }
      deafened = match.firmwareSensory.deafened;
      volume();
      const player = match.players.find((item) => item.id === playerId);
      const running =
        match.phase === 'running' && player?.life.kind === 'alive';
      if (!running) stopVoices();
      const boundary =
        match.boundary.elapsedMs >= match.boundary.shrinkStartMs
          ? 'closing'
          : match.boundary.shrinkStartMs - match.boundary.elapsedMs <= 60000
            ? 'soon'
            : 'calm';
      const meteors = new Set(match.meteors.map((item) => item.id));
      if (
        seeded &&
        running &&
        ((boundary !== 'calm' && boundary !== warnedBoundary) ||
          [...meteors].some((id) => !warnedMeteors.has(id)))
      )
        cue('warning');
      warnedBoundary = boundary;
      warnedMeteors = meteors;
      for (const event of match.feedback ?? []) {
        if (
          seeded &&
          running &&
          event.id > lastFeedback &&
          event.at >= match.time - 500
        ) {
          if (event.kind === 'salvage' && event.targetId === playerId)
            cue('pickup');
          else if (
            event.localAttacker &&
            (event.kind === 'hull' ||
              event.kind === 'plating' ||
              event.kind === 'break')
          )
            cue('hit');
        }
        lastFeedback = Math.max(lastFeedback, event.id);
      }
      seeded = true;
    },
    dispose() {
      disposed = true;
      stopVoices();
      window.removeEventListener('pointerdown', gesture);
      window.removeEventListener('keydown', gesture);
      document.removeEventListener('visibilitychange', visibility);
      void context?.close().catch(() => {});
    },
  };
}
