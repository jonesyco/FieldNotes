export function playUpsideDownSting(enabled: boolean) {
  const AudioContextCtor = window.AudioContext;
  if (!AudioContextCtor) return;

  const context = new AudioContextCtor();
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, context.currentTime);
  master.connect(context.destination);

  const notes = enabled ? [196, 155.56, 116.54] : [146.83, 196, 246.94];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startTime = context.currentTime + index * 0.08;
    const endTime = startTime + 0.42;

    oscillator.type = enabled ? 'sawtooth' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, startTime);
    if (enabled) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(55, frequency * 0.72), endTime);
    } else {
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.18, endTime);
    }

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(enabled ? 0.04 : 0.03, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(startTime);
    oscillator.stop(endTime);
  });

  master.gain.exponentialRampToValueAtTime(enabled ? 0.09 : 0.05, context.currentTime + 0.05);
  master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.8);

  window.setTimeout(() => {
    void context.close();
  }, 1200);
}