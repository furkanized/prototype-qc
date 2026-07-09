// Synthesized startup identity — a warm analog-style pad with soft FM
// overtones and a long generated reverb tail. No audio assets required.

function createImpulseResponse(context: AudioContext, seconds: number, decay: number) {
  const rate = context.sampleRate;
  const length = Math.floor(rate * seconds);
  const impulse = context.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let sample = 0; sample < length; sample += 1) {
      data[sample] = (Math.random() * 2 - 1) * Math.pow(1 - sample / length, decay);
    }
  }
  return impulse;
}

export function playStartupSound(): boolean {
  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return false;

  const context = new AudioContextCtor();
  if (context.state === "suspended") {
    void context.resume();
    if (context.state === "suspended") {
      void context.close();
      return false; // Autoplay blocked — stay silent rather than glitch later.
    }
  }

  const now = context.currentTime + 0.05;
  const total = 2.4;

  const master = context.createGain();
  master.gain.value = 0.0001;
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.32, now + 0.55);
  master.gain.setValueAtTime(0.32, now + 1.15);
  master.gain.exponentialRampToValueAtTime(0.0001, now + total);

  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(650, now);
  lowpass.frequency.exponentialRampToValueAtTime(2400, now + 0.9);
  lowpass.frequency.exponentialRampToValueAtTime(900, now + total);
  lowpass.Q.value = 0.4;

  const reverb = context.createConvolver();
  reverb.buffer = createImpulseResponse(context, 3.2, 2.6);
  const wet = context.createGain();
  wet.gain.value = 0.55;
  const dry = context.createGain();
  dry.gain.value = 0.7;

  master.connect(lowpass);
  lowpass.connect(dry);
  lowpass.connect(reverb);
  reverb.connect(wet);
  dry.connect(context.destination);
  wet.connect(context.destination);

  // Fmaj9-ish voicing with slow harmonic movement (E resolves up to F).
  const voices: Array<{ freq: number; detune: number; type: OscillatorType; gain: number; glideTo?: number }> = [
    { freq: 87.31, detune: -4, type: "triangle", gain: 0.5 },
    { freq: 174.61, detune: 3, type: "sawtooth", gain: 0.18 },
    { freq: 220.0, detune: -6, type: "sawtooth", gain: 0.16 },
    { freq: 261.63, detune: 5, type: "triangle", gain: 0.3 },
    { freq: 329.63, detune: -3, type: "triangle", gain: 0.22, glideTo: 349.23 },
    { freq: 523.25, detune: 7, type: "sine", gain: 0.12 },
  ];

  voices.forEach((voice) => {
    const oscillator = context.createOscillator();
    oscillator.type = voice.type;
    oscillator.frequency.setValueAtTime(voice.freq, now);
    if (voice.glideTo) {
      oscillator.frequency.setValueAtTime(voice.freq, now + 0.9);
      oscillator.frequency.exponentialRampToValueAtTime(voice.glideTo, now + 1.5);
    }
    oscillator.detune.value = voice.detune;

    const voiceGain = context.createGain();
    voiceGain.gain.value = voice.gain;
    oscillator.connect(voiceGain);
    voiceGain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + total + 0.1);
  });

  // Soft FM shimmer: a sine carrier gently modulated, entering late.
  const carrier = context.createOscillator();
  carrier.type = "sine";
  carrier.frequency.value = 698.46;
  const modulator = context.createOscillator();
  modulator.type = "sine";
  modulator.frequency.value = 6.2;
  const modulationDepth = context.createGain();
  modulationDepth.gain.value = 9;
  modulator.connect(modulationDepth);
  modulationDepth.connect(carrier.frequency);

  const shimmerGain = context.createGain();
  shimmerGain.gain.setValueAtTime(0.0001, now);
  shimmerGain.gain.exponentialRampToValueAtTime(0.05, now + 1.1);
  shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + total);
  carrier.connect(shimmerGain);
  shimmerGain.connect(master);
  carrier.start(now + 0.4);
  modulator.start(now + 0.4);
  carrier.stop(now + total + 0.1);
  modulator.stop(now + total + 0.1);

  window.setTimeout(() => {
    void context.close();
  }, (total + 1.5) * 1000);

  return true;
}

// Mechanical split-flap clatter: dense filtered-noise ticks that thin out as
// the board settles, closing with one distinct "clack". Scheduled up-front on
// the audio timeline so it stays in sync regardless of render jitter.
export function playBoardClatter(durationMs: number): boolean {
  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return false;

  const context = new AudioContextCtor();
  if (context.state === "suspended") {
    void context.resume();
    if (context.state === "suspended") {
      void context.close();
      return false;
    }
  }

  const now = context.currentTime + 0.03;
  const duration = durationMs / 1000;

  const master = context.createGain();
  master.gain.value = 0.16;
  master.connect(context.destination);

  const noiseLength = Math.floor(context.sampleRate * 0.012);
  const noiseBuffer = context.createBuffer(1, noiseLength, context.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseLength; i += 1) data[i] = Math.random() * 2 - 1;

  const scheduleClick = (at: number, gainValue: number, freq: number) => {
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const bandpass = context.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = freq;
    bandpass.Q.value = 1.6;
    const gain = context.createGain();
    gain.gain.setValueAtTime(gainValue, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.03);
    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(master);
    source.start(at);
  };

  // Clatter: fast at first, easing off over the spin window.
  let t = 0;
  while (t < duration * 0.82) {
    const progress = t / duration;
    scheduleClick(now + t, 0.5 + Math.random() * 0.5, 1500 + Math.random() * 1600);
    t += 0.024 + progress * 0.09 + Math.random() * 0.02;
  }
  // Final settle clack — lower, firmer.
  scheduleClick(now + duration * 0.86, 1.4, 900);
  scheduleClick(now + duration * 0.86 + 0.012, 0.8, 1400);

  window.setTimeout(() => {
    void context.close();
  }, durationMs + 800);

  return true;
}
