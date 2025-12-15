// presets.js
// Exposes: window.DEFAULT_PARAMS, window.DEFAULT_STEPS, window.PRESETS
(() => {
  const DEFAULT_PARAMS = {
    vco1Freq: 0.35, vco1Wave: 0, vco1Level: 1.0, vco1EgAmt: 0.2,
    vco2Freq: 0.35, vco2Wave: 0, vco2Level: 0.3, vco2EgAmt: 0.5,
    hardSync: 0, fmAmount: 0.2,
    vcoDecay: 0.4, seqPitchMod: 1, noiseLevel: 0.0,
    cutoff: 0.45, resonance: 0.2, vcfEgAmt: 0.7, vcfDecay: 0.35, noiseVcfMod: 0.2,

    // CHANGED: vcaAttack replaces vcaEgMode
    vcaAttack: 0.003,
    vcaDecay: 0.0,

    velModTarget: 0,

    volume: 0.8,
    tempo: 128, run: 0,
    reverbDecay: 0.7, reverbMix: 0.0,
    dataBenderMix: 0.0, dataBenderCrush: 0.6, dataBenderDrop: 0.25, dataBenderDrive: 0.5, dataBenderRate: 0.35,
    delayRate: 0.25, delayFdbk: 0.4, delayWidth: 0.5, delayWet: 0.0,
    masterHP: 0.0, masterLP: 1.0, masterRes: 0.2
  };

  const DEFAULT_STEPS = [
    { pitch: 0.5, velocity: 0.5 }, { pitch: 0.5, velocity: 0.4 }, { pitch: 0.7, velocity: 0.7 }, { pitch: 0.6, velocity: 0.2 },
    { pitch: 0.5, velocity: 0.5 }, { pitch: 0.4, velocity: 0.2 }, { pitch: 0.5, velocity: 0.6 }, { pitch: 0.6, velocity: 0.3 }
  ];

  const PRESETS = [
    { name: "DEFAULT", params: { ...DEFAULT_PARAMS }, steps: [...DEFAULT_STEPS] },
    {
      name: "THUMP-THUMP",
      params: {
        tempo: 128,
        vco1Freq: 0.2, vco1Wave: 1, vco1Level: 0.9, vco1EgAmt: 0.5,
        vco2Freq: 0.7, vco2Wave: 0, vco2Level: 0.4, vco2EgAmt: 0.5,
        vcoDecay: 0.3,
        cutoff: 0.25, resonance: 0.3, vcfEgAmt: 0.5,
        vcaDecay: 0.2,
        vcaAttack: 0.003, // Was FAST
        volume: 0.9,
        reverbMix: 0.0, delayWet: 0.0,
        masterHP: 0.0, masterLP: 1.0
      },
      steps: [
        { pitch: 0.5, velocity: 0.9 }, { pitch: 0.5, velocity: 0.0 }, { pitch: 0.5, velocity: 0.0 }, { pitch: 0.5, velocity: 0.0 },
        { pitch: 0.5, velocity: 0.9 }, { pitch: 0.5, velocity: 0.0 }, { pitch: 0.5, velocity: 0.0 }, { pitch: 0.5, velocity: 0.0 }
      ]
    },
    // BASIC DRUM PRESETS (3-12)
    {
      name: "METAL-HATS",
      params: { tempo: 128, vco1Level: 0.0, vco2Level: 0.0, noiseLevel: 1.0, cutoff: 0.85, resonance: 0.3, vcaDecay: 0.08, vcaAttack: 0.001, delayWet: 0.0, masterHP: 0.6, masterLP: 1.0, volume: 0.7 },
      steps: [{ p: 0.5, v: 0.6 }, { p: 0.5, v: 0.4 }, { p: 0.5, v: 0.7 }, { p: 0.5, v: 0.5 }, { p: 0.5, v: 0.6 }, { p: 0.5, v: 0.4 }, { p: 0.5, v: 0.7 }, { p: 0.5, v: 0.5 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "TOM-TOM-CLUB",
      params: { tempo: 115, vco1Freq: 0.35, vco1Wave: 1, vco1Level: 0.9, vco1EgAmt: 0.7, vcoDecay: 0.35, cutoff: 0.4, resonance: 0.6, vcfEgAmt: 0.6, vcaDecay: 0.3, vcaAttack: 0.005, reverbMix: 0.15, masterHP: 0.0, masterLP: 1.0 },
      steps: [{ p: 0.4, v: 0.8 }, { p: 0.0, v: 0.0 }, { p: 0.5, v: 0.7 }, { p: 0.0, v: 0.0 }, { p: 0.3, v: 0.9 }, { p: 0.0, v: 0.0 }, { p: 0.6, v: 0.6 }, { p: 0.4, v: 0.5 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "ROLL-CALL",
      params: { tempo: 140, vco1Freq: 0.5, vco1Wave: 0, vco1Level: 0.5, noiseLevel: 0.6, cutoff: 0.65, resonance: 0.4, vcfEgAmt: 0.5, vcaDecay: 0.12, vcaAttack: 0.002, reverbMix: 0.2, masterHP: 0.2, masterLP: 1.0 },
      steps: [{ p: 0.5, v: 0.7 }, { p: 0.5, v: 0.75 }, { p: 0.5, v: 0.8 }, { p: 0.5, v: 0.85 }, { p: 0.5, v: 0.9 }, { p: 0.5, v: 0.85 }, { p: 0.5, v: 0.8 }, { p: 0.5, v: 0.9 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "KICK-FLIP",
      params: { tempo: 128, vco1Freq: 0.18, vco1Wave: 1, vco1Level: 1.0, vco1EgAmt: 0.6, vcoDecay: 0.25, cutoff: 0.3, resonance: 0.25, vcfEgAmt: 0.7, vcaDecay: 0.2, vcaAttack: 0.003, delayWet: 0.0, masterHP: 0.0, masterLP: 1.0 },
      steps: [{ p: 0.5, v: 0.9 }, { p: 0.0, v: 0.0 }, { p: 0.5, v: 0.0 }, { p: 0.0, v: 0.0 }, { p: 0.5, v: 0.9 }, { p: 0.5, v: 0.6 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.7 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "DOUBLE-TAP",
      params: { tempo: 128, vco1Freq: 0.16, vco1Wave: 1, vco1Level: 1.0, vco1EgAmt: 0.5, vcoDecay: 0.28, cutoff: 0.25, resonance: 0.3, vcfEgAmt: 0.6, vcaDecay: 0.22, vcaAttack: 0.003, delayWet: 0.0, masterHP: 0.0, masterLP: 1.0 },
      steps: [{ p: 0.5, v: 0.9 }, { p: 0.5, v: 0.8 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.9 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.7 }, { p: 0.5, v: 0.0 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "CLOSED-CASE",
      params: { tempo: 135, vco1Level: 0.0, vco2Level: 0.0, noiseLevel: 1.0, cutoff: 0.75, resonance: 0.2, vcaDecay: 0.04, vcaAttack: 0.001, delayWet: 0.0, masterHP: 0.7, masterLP: 1.0, volume: 0.7 },
      steps: [{ p: 0.5, v: 0.0 }, { p: 0.5, v: 0.7 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.8 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.7 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.8 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "RIM-SHOT-CITY",
      params: { tempo: 120, vco1Freq: 0.6, vco1Wave: 0, vco1Level: 0.7, noiseLevel: 0.4, vco1EgAmt: 0.7, vcoDecay: 0.06, cutoff: 0.6, resonance: 0.5, vcaDecay: 0.06, vcaAttack: 0.001, reverbMix: 0.1, masterHP: 0.3, masterLP: 1.0 },
      steps: [{ p: 0.5, v: 0.0 }, { p: 0.5, v: 0.0 }, { p: 0.6, v: 0.9 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.0 }, { p: 0.6, v: 0.9 }, { p: 0.5, v: 0.0 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "SNARE-TRAP",
      params: { tempo: 128, vco1Freq: 0.45, vco1Wave: 0, vco1Level: 0.6, noiseLevel: 0.7, vco1EgAmt: 0.6, vcoDecay: 0.15, cutoff: 0.55, resonance: 0.35, vcfEgAmt: 0.6, vcaDecay: 0.15, vcaAttack: 0.002, reverbMix: 0.15, masterHP: 0.15, masterLP: 1.0 },
      steps: [{ p: 0.5, v: 0.0 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.9 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.9 }, { p: 0.5, v: 0.3 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "CRASH-LANDING",
      params: { tempo: 100, vco1Level: 0.0, vco2Level: 0.0, noiseLevel: 1.0, cutoff: 0.9, resonance: 0.5, vcaDecay: 0.6, vcaAttack: 0.005, reverbMix: 0.4, reverbDecay: 0.8, delayWet: 0.0, masterHP: 0.4, masterLP: 1.0, volume: 0.75 },
      steps: [{ p: 0.5, v: 0.9 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.0 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "OPEN-WINDOW",
      params: { tempo: 128, vco1Level: 0.0, vco2Level: 0.0, noiseLevel: 1.0, cutoff: 0.8, resonance: 0.4, vcaDecay: 0.25, vcaAttack: 0.002, delayWet: 0.0, reverbMix: 0.1, masterHP: 0.5, masterLP: 1.0, volume: 0.7 },
      steps: [{ p: 0.5, v: 0.0 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.8 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.8 }, { p: 0.5, v: 0.0 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    // EXPERIMENTAL PRESETS (13-39)
    {
      name: "SNAP-CRACKLE",
      params: { tempo: 110, vco1Freq: 0.6, noiseLevel: 0.6, cutoff: 0.6, vcfDecay: 0.1, vcaDecay: 0.1, reverbMix: 0.1, delayWet: 0.0, masterHP: 0.2, masterLP: 1.0, vcaAttack: 0.003 },
      steps: [{ p: 0.5, v: 0.8 }, { p: 0.5, v: 0.2 }, { p: 0.6, v: 0.9 }, { p: 0.5, v: 0.3 }, { p: 0.5, v: 0.8 }, { p: 0.5, v: 0.2 }, { p: 0.7, v: 0.9 }, { p: 0.5, v: 0.1 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "WOBBLE-GHOST",
      // Was SLOW mode (1), set to 0.05 for ghost feel
      params: { tempo: 75, vco1Freq: 0.2, vco2Freq: 0.21, vco1Wave: 1, fmAmount: 0.3, cutoff: 0.35, resonance: 0.6, vcfEgAmt: 0.4, vcaAttack: 0.05, vcaDecay: 0.6, reverbMix: 0.4, reverbDecay: 0.8, delayWet: 0.3, delayRate: 0.5, masterHP: 0.0, masterLP: 0.8 },
      steps: Array(8).fill(null).map(() => ({ pitch: Math.random() * 0.4 + 0.3, velocity: Math.random() * 0.5 + 0.4 }))
    },
    {
      name: "LASER-TAG",
      params: { tempo: 145, vco1Freq: 0.6, vco2Freq: 0.8, hardSync: 1, vco2EgAmt: 0.9, vcoDecay: 0.2, cutoff: 0.8, resonance: 0.1, vcaDecay: 0.1, delayWet: 0.2, delayRate: 0.125, delayFdbk: 0.6, masterHP: 0.0, masterLP: 1.0, vcaAttack: 0.003 },
      steps: [{ p: 0.8, v: 0.9 }, { p: 0.1, v: 0.0 }, { p: 0.7, v: 0.8 }, { p: 0.1, v: 0.0 }, { p: 0.9, v: 0.9 }, { p: 0.1, v: 0.0 }, { p: 0.6, v: 0.8 }, { p: 0.1, v: 0.0 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "RUST-BUCKET",
      params: { tempo: 90, vco1Wave: 1, vco2Wave: 1, fmAmount: 0.8, noiseLevel: 0.3, cutoff: 0.7, resonance: 0.7, vcaDecay: 0.2, delayWet: 0.1, masterHP: 0.1, masterLP: 0.9, vcaAttack: 0.003 },
      steps: Array(8).fill(null).map(() => ({ pitch: Math.random(), velocity: Math.random() > 0.3 ? 0.7 : 0.0 }))
    },
    {
      name: "DEEP-DIVE",
      // Was SLOW mode
      params: { tempo: 60, vco1Freq: 0.05, vco1Wave: 0, cutoff: 0.2, vcfEgAmt: 0.1, vcaAttack: 0.02, vcaDecay: 0.9, reverbMix: 0.6, reverbDecay: 0.9, delayWet: 0.0, masterHP: 0.0, masterLP: 0.4 },
      steps: [{ p: 0.5, v: 0.8 }, { p: 0.5, v: 0.0 }, { p: 0.4, v: 0.0 }, { p: 0.5, v: 0.0 }, { p: 0.6, v: 0.7 }, { p: 0.5, v: 0.0 }, { p: 0.3, v: 0.0 }, { p: 0.5, v: 0.0 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "DATA-SKIP",
      params: { tempo: 100, vco1Freq: 0.4, fmAmount: 0.5, seqPitchMod: 1, cutoff: 0.5, vcfEgAmt: 0.8, vcfDecay: 0.1, vcaDecay: 0.1, delayWet: 0.3, delayRate: 0.125, delayWidth: 0.9, masterHP: 0.1, masterLP: 1.0, vcaAttack: 0.003 },
      steps: Array(8).fill(null).map(() => ({ pitch: Math.random(), velocity: Math.random() > 0.4 ? 0.8 : 0.0 }))
    },
    {
      name: "PING-PONGER",
      params: { tempo: 125, vco1Freq: 0.7, vcoDecay: 0.05, cutoff: 0.8, vcaDecay: 0.05, delayWet: 0.5, delayFdbk: 0.7, delayRate: 0.25, delayWidth: 1.0, masterHP: 0.0, masterLP: 1.0, vcaAttack: 0.003 },
      steps: [{ p: 0.9, v: 0.9 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }, { p: 0.8, v: 0.7 }, { p: 0.0, v: 0.0 }, { p: 0.9, v: 0.9 }, { p: 0.0, v: 0.0 }, { p: 0.7, v: 0.7 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "ACID-RAIN",
      params: { tempo: 135, vco1Freq: 0.3, vco1Wave: 1, cutoff: 0.3, resonance: 0.85, vcfEgAmt: 0.7, vcfDecay: 0.3, delayWet: 0.3, delayRate: 0.25, masterHP: 0.0, masterLP: 1.0, vcaAttack: 0.003 },
      steps: Array(8).fill(null).map(() => ({ pitch: Math.random(), velocity: 0.8 }))
    },
    {
      name: "STATIC-SHOCK",
      params: { tempo: 150, noiseLevel: 1.0, vco1Level: 0.0, vco2Level: 0.0, cutoff: 0.9, resonance: 0.4, vcaDecay: 0.05, delayWet: 0.0, masterHP: 0.5, masterLP: 1.0, vcaAttack: 0.001 },
      steps: Array(8).fill(null).map(() => ({ pitch: 0.5, velocity: Math.random() > 0.5 ? 0.9 : 0.0 }))
    },
    {
      name: "WOOD-BLOCK",
      params: { tempo: 128, vco1Freq: 0.5, vco1Wave: 0, vco1EgAmt: 0.6, vcoDecay: 0.05, cutoff: 0.5, resonance: 0.5, vcaDecay: 0.05, reverbMix: 0.2, masterHP: 0.1, masterLP: 1.0, vcaAttack: 0.003 },
      steps: [{ p: 0.5, v: 0.9 }, { p: 0.6, v: 0.7 }, { p: 0.4, v: 0.8 }, { p: 0.7, v: 0.6 }, { p: 0.5, v: 0.9 }, { p: 0.8, v: 0.5 }, { p: 0.4, v: 0.8 }, { p: 0.6, v: 0.7 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "SUB-ORBITAL",
      // Was SLOW mode
      params: { tempo: 50, vco1Freq: 0.1, vco2Freq: 0.15, fmAmount: 0.2, cutoff: 0.25, resonance: 0.6, vcaAttack: 0.05, vcaDecay: 0.8, delayWet: 0.4, delayRate: 1, reverbMix: 0.5, masterHP: 0.0, masterLP: 0.3 },
      steps: [{ p: 0.2, v: 0.8 }, { p: 0.0, v: 0.0 }, { p: 0.3, v: 0.0 }, { p: 0.0, v: 0.0 }, { p: 0.25, v: 0.7 }, { p: 0.0, v: 0.0 }, { p: 0.1, v: 0.0 }, { p: 0.0, v: 0.0 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "KLAXON-ALARM",
      params: { tempo: 160, vco1Freq: 0.5, vco2Freq: 0.52, vco1Wave: 1, vco2Wave: 1, cutoff: 1.0, vcaDecay: 0.5, delayWet: 0.0, masterHP: 0.0, masterLP: 1.0, vcaAttack: 0.005 },
      steps: [{ p: 0.8, v: 0.9 }, { p: 0.8, v: 0.9 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }, { p: 0.8, v: 0.9 }, { p: 0.8, v: 0.9 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "DATA-STREAM",
      params: { tempo: 140, vco1Freq: 0.8, fmAmount: 0.9, vco2Freq: 0.1, cutoff: 0.6, vcfEgAmt: 0.9, vcfDecay: 0.05, vcaDecay: 0.05, delayWet: 0.2, masterHP: 0.0, masterLP: 1.0, vcaAttack: 0.003 },
      steps: Array(8).fill(null).map(() => ({ pitch: Math.random(), velocity: Math.random() }))
    },
    {
      name: "CAVE-DRIP",
      params: { tempo: 80, vco1Freq: 0.8, vco1Wave: 0, vcoDecay: 0.1, cutoff: 0.4, resonance: 0.8, vcfEgAmt: 0.6, reverbMix: 0.8, reverbDecay: 0.9, delayWet: 0.0, masterHP: 0.1, masterLP: 1.0, vcaAttack: 0.003 },
      steps: [{ p: 0.9, v: 0.8 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }, { p: 0.8, v: 0.6 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "MECHA-STOMP",
      params: { tempo: 70, vco1Freq: 0.15, vco1Wave: 1, noiseLevel: 0.4, cutoff: 0.4, vcfEgAmt: 0.8, vcfDecay: 0.4, vcaDecay: 0.4, delayWet: 0.2, delayRate: 0.125, masterHP: 0.0, masterLP: 1.0, vcaAttack: 0.01 },
      steps: [{ p: 0.5, v: 0.9 }, { p: 0.0, v: 0.0 }, { p: 0.5, v: 0.9 }, { p: 0.0, v: 0.0 }, { p: 0.5, v: 0.9 }, { p: 0.0, v: 0.0 }, { p: 0.6, v: 0.9 }, { p: 0.2, v: 0.3 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "SWARM-HIVE",
      // Was SLOW mode
      params: { tempo: 170, vco1Freq: 0.4, vco2Freq: 0.43, fmAmount: 0.4, noiseLevel: 0.2, cutoff: 0.6, vcfEgAmt: 0.2, vcaAttack: 0.02, vcaDecay: 0.2, delayWet: 0.5, delayRate: 0.0625, delayFdbk: 0.8, masterHP: 0.0, masterLP: 1.0 },
      steps: Array(8).fill(null).map(() => ({ pitch: 0.5 + Math.random() * 0.2, velocity: 0.7 }))
    },
    {
      name: "VOID-CALLER",
      // Was SLOW mode
      params: { tempo: 40, vco1Freq: 0.1, vco2Freq: 0.105, vco1Wave: 0, vco2Wave: 0, cutoff: 0.2, resonance: 0.3, vcaAttack: 0.05, vcaDecay: 1.0, reverbMix: 0.9, reverbDecay: 1.0, delayWet: 0.6, delayRate: 1, masterHP: 0.0, masterLP: 1.0 },
      steps: [{ p: 0.1, v: 0.9 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }, { p: 0.2, v: 0.8 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "BRAIN-MELT",
      params: { tempo: 220, vco1Freq: 0.5, vco2Freq: 0.9, fmAmount: 1.0, hardSync: 1, noiseLevel: 0.5, cutoff: 0.8, resonance: 0.9, noiseVcfMod: 0.8, vcaDecay: 0.3, delayWet: 0.4, delayRate: 0.125, delayFdbk: 0.9, reverbMix: 0.3, masterHP: 0.0, masterLP: 1.0, vcaAttack: 0.003 },
      steps: Array(8).fill(null).map(() => ({ pitch: Math.random(), velocity: Math.random() }))
    },
    // NEW EXPERIMENTAL PRESETS (30-39)
    {
      name: "FREQUENCY-DRIFT",
      params: { tempo: 55, vco1Freq: 0.3, vco2Freq: 0.305, vco1Wave: 1, vco2Wave: 1, fmAmount: 0.6, seqPitchMod: 1, cutoff: 0.4, resonance: 0.5, vcfEgAmt: 0.3, vcaAttack: 0.03, vcaDecay: 0.7, reverbMix: 0.7, delayWet: 0.5, delayRate: 0.75, masterHP: 0.0, masterLP: 0.7 },
      steps: Array(8).fill(null).map((_, i) => ({ pitch: 0.3 + (i * 0.08), velocity: 0.6 + Math.random() * 0.3 }))
    },
    {
      name: "GLITCH-STORM",
      params: { tempo: 180, vco1Freq: 0.7, noiseLevel: 0.4, cutoff: 0.7, vcfDecay: 0.03, vcaDecay: 0.03, dataBenderMix: 0.8, dataBenderCrush: 0.9, dataBenderDrop: 0.7, dataBenderDrive: 0.8, delayWet: 0.3, delayFdbk: 0.5, masterHP: 0.2, masterLP: 1.0, vcaAttack: 0.001 },
      steps: Array(8).fill(null).map(() => ({ pitch: Math.random(), velocity: Math.random() > 0.2 ? Math.random() : 0.0 }))
    },
    {
      name: "REVERB-TUNNEL",
      params: { tempo: 95, vco1Freq: 0.4, vco1Wave: 0, vcoDecay: 0.2, cutoff: 0.5, vcfEgAmt: 0.4, vcaDecay: 0.2, reverbMix: 0.95, reverbDecay: 1.0, delayWet: 0.7, delayFdbk: 0.85, delayRate: 0.5, masterHP: 0.0, masterLP: 0.9, vcaAttack: 0.01 },
      steps: [{ p: 0.6, v: 0.8 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }, { p: 0.4, v: 0.6 }, { p: 0.0, v: 0.0 }, { p: 0.7, v: 0.7 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "CHAOS-THEORY",
      params: { tempo: 155, vco1Freq: Math.random() * 0.6 + 0.2, vco2Freq: Math.random() * 0.6 + 0.2, vco1Wave: Math.random() > 0.5 ? 1 : 0, hardSync: Math.random() > 0.5 ? 1 : 0, fmAmount: Math.random() * 0.8, noiseLevel: Math.random() * 0.6, cutoff: Math.random(), resonance: Math.random() * 0.7, vcaDecay: Math.random() * 0.5, delayWet: Math.random() * 0.5, masterHP: 0.0, masterLP: 1.0, vcaAttack: 0.003 },
      steps: Array(8).fill(null).map(() => ({ pitch: Math.random(), velocity: Math.random() }))
    },
    {
      name: "BIT-CRUSHER",
      params: { tempo: 130, vco1Freq: 0.35, vco1Wave: 0, vco1Level: 0.9, cutoff: 0.6, resonance: 0.3, vcaDecay: 0.15, dataBenderMix: 1.0, dataBenderCrush: 0.95, dataBenderDrop: 0.3, dataBenderDrive: 0.7, dataBenderRate: 0.2, masterHP: 0.0, masterLP: 1.0, vcaAttack: 0.003 },
      steps: [{ p: 0.5, v: 0.9 }, { p: 0.5, v: 0.0 }, { p: 0.6, v: 0.7 }, { p: 0.4, v: 0.5 }, { p: 0.5, v: 0.9 }, { p: 0.5, v: 0.0 }, { p: 0.7, v: 0.8 }, { p: 0.3, v: 0.6 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "ECHO-CHAMBER",
      params: { tempo: 105, vco1Freq: 0.55, vcoDecay: 0.08, cutoff: 0.75, vcfDecay: 0.1, vcaDecay: 0.08, delayWet: 0.9, delayFdbk: 0.9, delayRate: 0.375, delayWidth: 1.0, reverbMix: 0.5, masterHP: 0.0, masterLP: 1.0, vcaAttack: 0.003 },
      steps: [{ p: 0.8, v: 0.8 }, { p: 0.0, v: 0.0 }, { p: 0.6, v: 0.7 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }, { p: 0.9, v: 0.8 }, { p: 0.0, v: 0.0 }, { p: 0.5, v: 0.6 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "PHASE-SHIFTER",
      params: { tempo: 118, vco1Freq: 0.45, vco2Freq: 0.453, vco1Wave: 1, vco2Wave: 1, vco1Level: 0.8, vco2Level: 0.8, fmAmount: 0.15, cutoff: 0.6, resonance: 0.55, vcfEgAmt: 0.5, vcaDecay: 0.25, delayWet: 0.4, delayRate: 0.25, masterHP: 0.0, masterLP: 1.0, vcaAttack: 0.003 },
      steps: Array(8).fill(null).map((_, i) => ({ pitch: 0.4 + (i % 4) * 0.1, velocity: i % 2 === 0 ? 0.8 : 0.0 }))
    },
    {
      name: "NOISE-FLOOR",
      params: { tempo: 140, vco1Level: 0.2, vco2Level: 0.0, noiseLevel: 1.0, cutoff: 0.65, resonance: 0.6, vcfEgAmt: 0.7, vcfDecay: 0.12, vcaDecay: 0.12, noiseVcfMod: 0.6, delayWet: 0.2, masterHP: 0.3, masterLP: 1.0, vcaAttack: 0.002 },
      steps: [{ p: 0.5, v: 0.8 }, { p: 0.5, v: 0.5 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.9 }, { p: 0.5, v: 0.0 }, { p: 0.5, v: 0.7 }, { p: 0.5, v: 0.6 }, { p: 0.5, v: 0.0 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "COSMIC-DUST",
      params: { tempo: 45, vco1Freq: 0.6, vco1Wave: 0, vco1Level: 0.5, noiseLevel: 0.3, vcoDecay: 0.15, cutoff: 0.7, resonance: 0.7, vcfEgAmt: 0.5, vcaAttack: 0.02, vcaDecay: 0.4, reverbMix: 0.85, reverbDecay: 1.0, delayWet: 0.6, delayRate: 1.0, masterHP: 0.2, masterLP: 0.9 },
      steps: [{ p: 0.8, v: 0.7 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }, { p: 0.6, v: 0.5 }, { p: 0.0, v: 0.0 }, { p: 0.0, v: 0.0 }].map(s => ({ pitch: s.p, velocity: s.v }))
    },
    {
      name: "TIME-WARP",
      params: { tempo: 165, vco1Freq: 0.4, vco2Freq: 0.6, vco1Wave: 1, fmAmount: 0.5, cutoff: 0.55, resonance: 0.4, vcfEgAmt: 0.6, vcaDecay: 0.18, delayWet: 0.8, delayFdbk: 0.75, delayRate: 0.1875, delayWidth: 0.8, reverbMix: 0.3, masterHP: 0.0, masterLP: 1.0, vcaAttack: 0.003 },
      steps: [{ p: 0.3, v: 0.9 }, { p: 0.5, v: 0.7 }, { p: 0.7, v: 0.8 }, { p: 0.4, v: 0.0 }, { p: 0.6, v: 0.9 }, { p: 0.3, v: 0.0 }, { p: 0.8, v: 0.8 }, { p: 0.2, v: 0.6 }].map(s => ({ pitch: s.p, velocity: s.v }))
    }
  ];

  window.DEFAULT_PARAMS = DEFAULT_PARAMS;
  window.DEFAULT_STEPS = DEFAULT_STEPS;
  window.PRESETS = PRESETS;
})();
