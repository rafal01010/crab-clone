export function observePresentation() {
  const probe = (window.presentationProbe = {
    draws: null,
    audio: [],
    active: 0,
    peaks: 0,
    recordings: [],
  });

  const gl = WebGL2RenderingContext.prototype;
  let calls = 0;
  let triangles = 0;
  for (const [name, countIndex, instanceIndex] of [
    ['drawArrays', 2],
    ['drawElements', 1],
    ['drawArraysInstanced', 2, 3],
    ['drawElementsInstanced', 1, 4],
  ]) {
    const draw = gl[name];
    gl[name] = function (...args) {
      calls++;
      if (args[0] === this.TRIANGLES)
        triangles += (args[countIndex] * (args[instanceIndex] ?? 1)) / 3;
      return draw.apply(this, args);
    };
  }
  const requestFrame = window.requestAnimationFrame;
  window.requestAnimationFrame = (callback) =>
    requestFrame((time) => {
      calls = 0;
      triangles = 0;
      callback(time);
      if (calls) probe.draws = { calls, triangles };
    });

  const createOscillator = AudioContext.prototype.createOscillator;
  const frequencies = new WeakMap();
  const setValueAtTime = AudioParam.prototype.setValueAtTime;
  AudioParam.prototype.setValueAtTime = function (value, time) {
    frequencies.set(this, value);
    return setValueAtTime.call(this, value, time);
  };
  AudioContext.prototype.createOscillator = function () {
    const oscillator = createOscillator.call(this);
    const start = oscillator.start;
    oscillator.start = (time) => {
      probe.audio.push({
        hz: frequencies.get(oscillator.frequency),
        hidden: document.hidden,
      });
      probe.peaks = Math.max(probe.peaks, ++probe.active);
      oscillator.addEventListener('ended', () => probe.active--, {
        once: true,
      });
      return start.call(oscillator, time);
    };
    return oscillator;
  };
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (destination, ...args) {
    if (destination === this.context.destination) {
      const tap = this.context.createMediaStreamDestination();
      connect.call(this, tap);
      const recorder = new MediaRecorder(tap.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      const chunks = [];
      recorder.addEventListener('dataavailable', (event) =>
        chunks.push(event.data),
      );
      recorder.start();
      probe.recordings.push({
        context: this.context,
        stop: async () => {
          await new Promise((accept) => {
            recorder.addEventListener('stop', accept, { once: true });
            recorder.stop();
          });
          const blob = new Blob(chunks, { type: recorder.mimeType });
          return Array.from(new Uint8Array(await blob.arrayBuffer()));
        },
      });
    }
    return connect.call(this, destination, ...args);
  };
}
