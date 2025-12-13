// synth-engine.js
// Exposes: window.JROOMZ_WORKLET_CODE, window.createJroomzWorkletNode(ctx)

(() => {
  const workletCode = `
  class SmoothValue {
      constructor(val) { this.val = val; this.target = val; }
      set(v) { this.target = v; }
      process(coeff) {
          this.val += coeff * (this.target - this.val);
          return this.val;
      }
  }

  class DelayLine {
      constructor(maxDelaySamples) {
          this.buffer = new Float32Array(maxDelaySamples);
          this.head = 0;
      }
      write(val) {
          if (!Number.isFinite(val)) val = 0;
          this.buffer[this.head] = val;
          this.head = (this.head + 1) % this.buffer.length;
      }
      read(delaySamples) {
          if (!Number.isFinite(delaySamples) || delaySamples < 0) delaySamples = 0;
          let pos = this.head - delaySamples;
          if (pos < 0) {
              pos += this.buffer.length * Math.ceil(Math.abs(pos)/this.buffer.length);
          }
          pos = pos % this.buffer.length;
          const idxA = Math.floor(pos);
          const idxB = (idxA + 1) % this.buffer.length;
          const frac = pos - idxA;
          return (this.buffer[idxA] * (1 - frac)) + (this.buffer[idxB] * frac);
      }
  }

  class SimpleOnePole {
      constructor() { this.val = 0; }
      process(input, freq, fs) {
          let c = 6.28318 * freq / fs;
          c = Math.max(0.0, Math.min(1.0, c));
          this.val += c * (input - this.val);
          if (!Number.isFinite(this.val)) this.val = 0;
          return this.val;
      }
  }

  class ZitaReverb {
      constructor(sampleRate) {
          this.sampleRate = Math.max(1, Math.min(192000, sampleRate || 44100));

          this.params = {
              preDel: 20.0,
              lfFc: 200.0,
              lowRt60: 1.0,
              midRt60: 1.0,
              hfDamp: 6000.0
          };

          this._decayNorm = 0.7;
          this._needsUpdate = true;

          this.initConstants();
          this.initState();
          this.updateCoefficients();
      }

      initConstants() {
          const SR = this.sampleRate;

          this.fConst0 = Math.min(192000.0, Math.max(1.0, SR));
          this.fConst1 = 6.283185307179586 / this.fConst0;
          this.fConst2 = Math.floor(0.125 * this.fConst0 + 0.5);
          this.fConst3 = (0.0 - (6.907755278982137 * this.fConst2)) / this.fConst0;
          this.fConst4 = 3.141592653589793 / this.fConst0;

          this.fConst5 = Math.floor(0.0134579996 * this.fConst0 + 0.5);
          this.iConst6 = Math.min(8192, Math.max(0, this.fConst2 - this.fConst5));
          this.fConst7 = 0.001 * this.fConst0;
          this.iConst8 = Math.min(1024, Math.max(0, this.fConst5 - 1));

          this.delayConsts = [
              { main: Math.floor(0.219990999 * this.fConst0 + 0.5), apf: Math.floor(0.0191229992 * this.fConst0 + 0.5) },
              { main: Math.floor(0.192303002 * this.fConst0 + 0.5), apf: Math.floor(0.0292910002 * this.fConst0 + 0.5) },
              { main: Math.floor(0.174713001 * this.fConst0 + 0.5), apf: Math.floor(0.0229039993 * this.fConst0 + 0.5) },
              { main: Math.floor(0.256891012 * this.fConst0 + 0.5), apf: Math.floor(0.0273330007 * this.fConst0 + 0.5) },
              { main: Math.floor(0.127837002 * this.fConst0 + 0.5), apf: Math.floor(0.0316039994 * this.fConst0 + 0.5) },
              { main: Math.floor(0.210389003 * this.fConst0 + 0.5), apf: Math.floor(0.0244210009 * this.fConst0 + 0.5) },
              { main: Math.floor(0.153128996 * this.fConst0 + 0.5), apf: Math.floor(0.0203460008 * this.fConst0 + 0.5) },
              { main: this.fConst2, apf: this.fConst5 }
          ];

          this.decayConsts = this.delayConsts.map((dc) => ({
              main: (0.0 - (6.907755278982137 * dc.main)) / this.fConst0,
              apf: dc.apf
          }));
      }

      initState() {
          const maxDelay = 32768;

          this.inputL = new Float32Array(maxDelay);
          this.inputR = new Float32Array(maxDelay);

          this.delays = [];
          for (let i = 0; i < 8; i++) {
              this.delays.push({
                  main: new Float32Array(maxDelay),
                  apf: new Float32Array(4096)
              });
          }

          this.filterStates = [];
          for (let i = 0; i < 8; i++) {
              this.filterStates.push({
                  damping: new Float32Array(2),
                  lowpass: new Float32Array(2),
                  combOut: new Float32Array(2),
                  rec: new Float32Array(3)
              });
          }

          this.lfFilter = new Float32Array(2);
          this.combScratch = new Float32Array(8);
          this.IOTA = 0;
      }

      power2(x) { return x * x; }

      updateCoefficients() {
          const params = this.params;

          const fSlow0 = Math.cos(this.fConst1 * params.hfDamp);
          this.coeffs = [];

          for (let i = 0; i < 8; i++) {
              const decayConst = this.decayConsts[i].main;

              const fSlow2 = Math.exp(decayConst / params.midRt60);
              const fSlow3 = this.power2(fSlow2);
              const fSlow4 = 1.0 - (fSlow0 * fSlow3);
              const fSlow5 = 1.0 - fSlow3;
              const fSlow6 = fSlow4 / fSlow5;
              const fSlow7 = Math.sqrt(Math.max(0.0, (this.power2(fSlow4) / this.power2(fSlow5)) - 1.0));
              const fSlow8 = fSlow6 - fSlow7;
              const fSlow9 = fSlow2 * (fSlow7 + (1.0 - fSlow6));

              const fSlow11 = (Math.exp(decayConst / params.lowRt60) / fSlow2) - 1.0;

              this.coeffs.push({ b0: fSlow8, a1: fSlow9, lowMult: fSlow11 });
          }

          const fSlow12 = 1.0 / Math.tan(this.fConst4 * params.lfFc);
          const fSlow13 = fSlow12 + 1.0;
          this.lfCoeff = {
              scale: 1.0 / fSlow13,
              feedback: (1.0 - fSlow12) / fSlow13
          };

          this.preDelaySamples = Math.min(8192, Math.max(0, Math.floor(this.fConst7 * params.preDel)));
          this._needsUpdate = false;
      }

      setDecayNormalized(decayNorm) {
          const clamped = Math.max(0.0, Math.min(1.0, decayNorm));
          if (Math.abs(clamped - this._decayNorm) < 1e-4) return;

          this._decayNorm = clamped;
          const decaySeconds = 0.35 + clamped * 3.65;
          this.params.midRt60 = decaySeconds;
          this.params.lowRt60 = decaySeconds * 0.92;
          this._needsUpdate = true;
      }

      prepareBlock(decayNorm) {
          this.setDecayNormalized(decayNorm);
          if (this._needsUpdate) {
              this.updateCoefficients();
          }
      }

      processSample(inL, inR) {
          const idx = this.IOTA & 16383;

          this.inputL[idx] = inL;
          this.inputR[idx] = inR;

          const delayedL = this.inputL[(this.IOTA - this.preDelaySamples) & 16383];
          const delayedR = this.inputR[(this.IOTA - this.preDelaySamples) & 16383];

          const fTemp0 = 0.3 * delayedL;
          const fTemp2 = 0.3 * delayedR;

          const combOuts = this.combScratch;

          {
              const f = this.filterStates[0];
              const coeff = this.coeffs[0];

              f.lowpass[0] = (this.lfCoeff.scale * (f.rec[1] + f.rec[2])) + (this.lfCoeff.feedback * f.lowpass[1]);
              f.damping[0] = (coeff.b0 * f.damping[1]) + (coeff.a1 * (f.rec[1] + (coeff.lowMult * f.lowpass[0])));

              const delayIdx = (this.IOTA - this.iConst6) & 16383;
              this.delays[0].main[idx] = (0.353553385 * f.damping[0]) + 9.99999968e-21;

              const apfInput = this.delays[0].main[delayIdx] - (0.6 * f.combOut[1]) - fTemp0;
              const apfIdx = (this.IOTA - this.iConst8) & 2047;
              this.delays[0].apf[(this.IOTA & 2047)] = apfInput;
              f.combOut[0] = this.delays[0].apf[apfIdx];

              combOuts[0] = 0.6 * apfInput;
          }

          {
              const f = this.filterStates[1];
              const coeff = this.coeffs[1];

              f.lowpass[0] = (this.lfCoeff.scale * (f.rec[1] + f.rec[2])) + (this.lfCoeff.feedback * f.lowpass[1]);
              f.damping[0] = (coeff.b0 * f.damping[1]) + (coeff.a1 * (f.rec[1] + (coeff.lowMult * f.lowpass[0])));

              const delayIdx = (this.IOTA - Math.min(16384, Math.max(0, this.delayConsts[1].main - this.delayConsts[1].apf))) & 32767;
              this.delays[1].main[(this.IOTA & 32767)] = (0.353553385 * f.damping[0]) + 9.99999968e-21;

              const apfInput = (0.6 * f.combOut[1]) + this.delays[1].main[delayIdx] - fTemp2;
              const apfIdx = (this.IOTA - Math.min(1024, Math.max(0, this.delayConsts[1].apf - 1))) & 2047;
              this.delays[1].apf[(this.IOTA & 2047)] = apfInput;
              f.combOut[0] = this.delays[1].apf[apfIdx];

              combOuts[1] = -0.6 * apfInput;
          }

          {
              const f = this.filterStates[2];
              const coeff = this.coeffs[2];

              f.lowpass[0] = (this.lfCoeff.scale * (f.rec[1] + f.rec[2])) + (this.lfCoeff.feedback * f.lowpass[1]);
              f.damping[0] = (coeff.b0 * f.damping[1]) + (coeff.a1 * (f.rec[1] + (coeff.lowMult * f.lowpass[0])));

              const delayIdx = (this.IOTA - Math.min(8192, Math.max(0, this.delayConsts[2].main - this.delayConsts[2].apf))) & 16383;
              this.delays[2].main[idx] = (0.353553385 * f.damping[0]) + 9.99999968e-21;

              const apfInput = (0.6 * f.combOut[1]) + this.delays[2].main[delayIdx] + fTemp2;
              const apfIdx = (this.IOTA - Math.min(2048, Math.max(0, this.delayConsts[2].apf - 1))) & 4095;
              this.delays[2].apf[(this.IOTA & 4095)] = apfInput;
              f.combOut[0] = this.delays[2].apf[apfIdx];

              combOuts[2] = -0.6 * apfInput;
          }

          {
              const f = this.filterStates[3];
              const coeff = this.coeffs[3];

              f.lowpass[0] = (this.lfCoeff.scale * (f.rec[1] + f.rec[2])) + (this.lfCoeff.feedback * f.lowpass[1]);
              f.damping[0] = (coeff.b0 * f.damping[1]) + (coeff.a1 * (f.rec[1] + (coeff.lowMult * f.lowpass[0])));

              const delayIdx = (this.IOTA - Math.min(8192, Math.max(0, this.delayConsts[3].main - this.delayConsts[3].apf))) & 16383;
              this.delays[3].main[idx] = (0.353553385 * f.damping[0]) + 9.99999968e-21;

              const apfInput = this.delays[3].main[delayIdx] + fTemp0 - (0.6 * f.combOut[1]);
              const apfIdx = (this.IOTA - Math.min(2048, Math.max(0, this.delayConsts[3].apf - 1))) & 4095;
              this.delays[3].apf[(this.IOTA & 4095)] = apfInput;
              f.combOut[0] = this.delays[3].apf[apfIdx];

              combOuts[3] = 0.6 * apfInput;
          }

          {
              const f = this.filterStates[4];
              const coeff = this.coeffs[4];

              f.lowpass[0] = (this.lfCoeff.scale * (f.rec[1] + f.rec[2])) + (this.lfCoeff.feedback * f.lowpass[1]);
              f.damping[0] = (coeff.b0 * f.damping[1]) + (coeff.a1 * (f.rec[1] + (coeff.lowMult * f.lowpass[0])));

              const delayIdx = (this.IOTA - Math.min(16384, Math.max(0, this.delayConsts[4].main - this.delayConsts[4].apf))) & 32767;
              this.delays[4].main[(this.IOTA & 32767)] = (0.353553385 * f.damping[0]) + 9.99999968e-21;

              const apfInput = (0.6 * f.combOut[1]) + this.delays[4].main[delayIdx] - fTemp2;
              const apfIdx = (this.IOTA - Math.min(2048, Math.max(0, this.delayConsts[4].apf - 1))) & 4095;
              this.delays[4].apf[(this.IOTA & 4095)] = apfInput;
              f.combOut[0] = this.delays[4].apf[apfIdx];

              combOuts[4] = -0.6 * apfInput;
          }

          {
              const f = this.filterStates[5];
              const coeff = this.coeffs[5];

              f.lowpass[0] = (this.lfCoeff.scale * (f.rec[1] + f.rec[2])) + (this.lfCoeff.feedback * f.lowpass[1]);
              f.damping[0] = (coeff.b0 * f.damping[1]) + (coeff.a1 * (f.rec[1] + (coeff.lowMult * f.lowpass[0])));

              const delayIdx = (this.IOTA - Math.min(8192, Math.max(0, this.delayConsts[5].main - this.delayConsts[5].apf))) & 16383;
              this.delays[5].main[idx] = (0.353553385 * f.damping[0]) + 9.99999968e-21;

              const apfInput = this.delays[5].main[delayIdx] - (0.6 * f.combOut[1]) - fTemp0;
              const apfIdx = (this.IOTA - Math.min(2048, Math.max(0, this.delayConsts[5].apf - 1))) & 4095;
              this.delays[5].apf[(this.IOTA & 4095)] = apfInput;
              f.combOut[0] = this.delays[5].apf[apfIdx];

              combOuts[5] = 0.6 * apfInput;
          }

          {
              const f = this.filterStates[6];
              const coeff = this.coeffs[6];

              f.lowpass[0] = (this.lfCoeff.scale * (f.rec[1] + f.rec[2])) + (this.lfCoeff.feedback * f.lowpass[1]);
              f.damping[0] = (coeff.b0 * f.damping[1]) + (coeff.a1 * (f.rec[1] + (coeff.lowMult * f.lowpass[0])));

              const delayIdx = (this.IOTA - Math.min(16384, Math.max(0, this.delayConsts[6].main - this.delayConsts[6].apf))) & 32767;
              this.delays[6].main[(this.IOTA & 32767)] = (0.353553385 * f.damping[0]) + 9.99999968e-21;

              const apfInput = (0.6 * f.combOut[1]) + this.delays[6].main[delayIdx] + fTemp2;
              const apfIdx = (this.IOTA - Math.min(2048, Math.max(0, this.delayConsts[6].apf - 1))) & 4095;
              this.delays[6].apf[(this.IOTA & 4095)] = apfInput;
              f.combOut[0] = this.delays[6].apf[apfIdx];

              combOuts[6] = -0.6 * apfInput;
          }

          {
              const f = this.filterStates[7];
              const coeff = this.coeffs[7];

              f.lowpass[0] = (this.lfCoeff.scale * (f.rec[1] + f.rec[2])) + (this.lfCoeff.feedback * f.lowpass[1]);
              f.damping[0] = (coeff.b0 * f.damping[1]) + (coeff.a1 * (f.rec[1] + (coeff.lowMult * f.lowpass[0])));

              const delayIdx = (this.IOTA - Math.min(8192, Math.max(0, this.delayConsts[7].main - this.delayConsts[7].apf))) & 16383;
              this.delays[7].main[idx] = (0.353553385 * f.damping[0]) + 9.99999968e-21;

              const apfInput = this.delays[7].main[delayIdx] + fTemp0 - (0.6 * f.combOut[1]);
              const apfIdx = (this.IOTA - Math.min(1024, Math.max(0, this.delayConsts[7].apf - 1))) & 2047;
              this.delays[7].apf[(this.IOTA & 2047)] = apfInput;
              f.combOut[0] = this.delays[7].apf[apfIdx];

              combOuts[7] = 0.6 * apfInput;
          }

          const fTemp10 = this.filterStates[7].combOut[1] + combOuts[7];
          const fTemp11 = combOuts[6] + (this.filterStates[6].combOut[1] + fTemp10);
          const fTemp12 = combOuts[4] + (this.filterStates[4].combOut[1] + (combOuts[5] + (this.filterStates[5].combOut[1] + fTemp11)));

          const fRec0 = combOuts[0] + (combOuts[1] + (this.filterStates[1].combOut[1] + (this.filterStates[0].combOut[1] + (combOuts[2] + (this.filterStates[2].combOut[1] + (combOuts[3] + (this.filterStates[3].combOut[1] + fTemp12)))))));

          const fTemp13 = combOuts[5] + (this.filterStates[5].combOut[1] + fTemp10);
          const fTemp14 = this.filterStates[6].combOut[1] + combOuts[6];
          const fTemp15 = combOuts[4] + (this.filterStates[4].combOut[1] + fTemp14);

          const fRec1 = (combOuts[0] + (this.filterStates[0].combOut[1] + (combOuts[3] + (this.filterStates[3].combOut[1] + fTemp13))))) - (combOuts[1] + (this.filterStates[1].combOut[1] + (combOuts[2] + (this.filterStates[2].combOut[1] + fTemp15))));

          const fTemp16 = combOuts[4] + (this.filterStates[4].combOut[1] + (this.filterStates[5].combOut[1] + combOuts[5]));

          const fRec2 = (combOuts[2] + (this.filterStates[2].combOut[1] + (combOuts[3] + (this.filterStates[3].combOut[1] + fTemp11))))) - (combOuts[0] + (combOuts[1] + (this.filterStates[1].combOut[1] + (this.filterStates[0].combOut[1] + fTemp16))));

          const fTemp17 = combOuts[4] + (this.filterStates[4].combOut[1] + fTemp10);
          const fTemp18 = combOuts[5] + (this.filterStates[5].combOut[1] + fTemp14);

          const fRec3 = (combOuts[1] + (this.filterStates[1].combOut[1] + (combOuts[3] + (this.filterStates[3].combOut[1] + fTemp17))))) - (combOuts[0] + (this.filterStates[0].combOut[1] + (combOuts[2] + (this.filterStates[2].combOut[1] + fTemp18))));

          const fRec4 = fTemp12 - (combOuts[0] + (combOuts[1] + (this.filterStates[1].combOut[1] + (this.filterStates[0].combOut[1] + (combOuts[2] + (this.filterStates[2].combOut[1] + (this.filterStates[3].combOut[1] + combOuts[3])))))));

          const fRec5 = (combOuts[1] + (this.filterStates[1].combOut[1] + (combOuts[2] + (this.filterStates[2].combOut[1] + fTemp13))))) - (combOuts[0] + (this.filterStates[0].combOut[1] + (combOuts[3] + (this.filterStates[3].combOut[1] + fTemp15))));

          const fRec6 = (combOuts[0] + (combOuts[1] + (this.filterStates[1].combOut[1] + (this.filterStates[0].combOut[1] + fTemp11))))) - (combOuts[2] + (this.filterStates[2].combOut[1] + (this.filterStates[3].combOut[1] + fTemp16)));

          const fRec7 = (combOuts[0] + (this.filterStates[0].combOut[1] + (combOuts[2] + (this.filterStates[2].combOut[1] + fTemp17))))) - (combOuts[1] + (this.filterStates[1].combOut[1] + (combOuts[3] + (this.filterStates[3].combOut[1] + fTemp18))));

          const outL = 0.37 * (fRec1 + fRec2);
          const outR = 0.37 * (fRec1 - fRec2);

          for (let j = 0; j < 8; j++) {
              const f = this.filterStates[j];
              f.lowpass[1] = f.lowpass[0];
              f.damping[1] = f.damping[0];
              f.combOut[1] = f.combOut[0];
          }

          this.filterStates[0].rec[2] = this.filterStates[0].rec[1];
          this.filterStates[0].rec[1] = this.filterStates[0].rec[0];
          this.filterStates[0].rec[0] = fRec0;

          this.filterStates[1].rec[2] = this.filterStates[1].rec[1];
          this.filterStates[1].rec[1] = this.filterStates[1].rec[0];
          this.filterStates[1].rec[0] = fRec1;

          this.filterStates[2].rec[2] = this.filterStates[2].rec[1];
          this.filterStates[2].rec[1] = this.filterStates[2].rec[0];
          this.filterStates[2].rec[0] = fRec2;

          this.filterStates[3].rec[2] = this.filterStates[3].rec[1];
          this.filterStates[3].rec[1] = this.filterStates[3].rec[0];
          this.filterStates[3].rec[0] = fRec3;

          this.filterStates[4].rec[2] = this.filterStates[4].rec[1];
          this.filterStates[4].rec[1] = this.filterStates[4].rec[0];
          this.filterStates[4].rec[0] = fRec4;

          this.filterStates[5].rec[2] = this.filterStates[5].rec[1];
          this.filterStates[5].rec[1] = this.filterStates[5].rec[0];
          this.filterStates[5].rec[0] = fRec5;

          this.filterStates[6].rec[2] = this.filterStates[6].rec[1];
          this.filterStates[6].rec[1] = this.filterStates[6].rec[0];
          this.filterStates[6].rec[0] = fRec6;

          this.filterStates[7].rec[2] = this.filterStates[7].rec[1];
          this.filterStates[7].rec[1] = this.filterStates[7].rec[0];
          this.filterStates[7].rec[0] = fRec7;

          this.IOTA++;

          return [outL, outR];
      }
  }

  class JroomzProcessor extends AudioWorkletProcessor {
      constructor() {
          super();
          this.fs = (typeof sampleRate !== 'undefined') ? sampleRate : 44100;

          this.vco1 = { phase: 0 };
          this.vco2 = { phase: 0 };
          this.vcoEg = { val: 0, phase: 0 };
          this.vcfEg = { val: 0, phase: 0 };
          this.vcaEg = { val: 0, phase: 0 };
          this.filter = { s1: 0, s2: 0, s3: 0, s4: 0 };

          this.mfL_hp_sub = new SimpleOnePole();
          this.mfR_hp_sub = new SimpleOnePole();
          this.masterLPFilter = {
              l: { x1: 0, x2: 0, y1: 0, y2: 0 },
              r: { x1: 0, x2: 0, y1: 0, y2: 0 }
          };

          const maxDelaySeconds = 12;
          const maxDelaySamples = Math.ceil(this.fs * maxDelaySeconds);
          this.delayL = new DelayLine(maxDelaySamples);
          this.delayR = new DelayLine(maxDelaySamples);
          this.delayTimeSmoother = new SmoothValue(0.3);
          this.pitchSmoother = new SmoothValue(0.5);
          this.velSmoother = new SmoothValue(0.5);

          this.reverb = new ZitaReverb(this.fs);

          this.sequencer = {
              currentStep: 0,
              steps: new Array(8).fill({ pitch: 0.5, velocity: 0.5 }),
              clockPhase: 0,
              lastTrigVel: 0.5
          };

          this.params = {
              vco1Freq: 0.35, vco1Wave: 0, vco1Level: 1.0, vco1EgAmt: 0.5,
              vco2Freq: 0.35, vco2Wave: 0, vco2Level: 0.0, vco2EgAmt: 0.5, hardSync: 0, fmAmount: 0,
              vcoDecay: 0.5, seqPitchMod: 1, noiseLevel: 0,
              cutoff: 0.5, resonance: 0.2, vcfEgAmt: 0.5, vcfDecay: 0.5, noiseVcfMod: 0,
              
              vcaAttack: 0.003,
              vcaDecay: 0.0,

              velModTarget: 0,

              volume: 0.8,
              tempo: 120, run: 0,
              reverbDecay: 0.7, reverbMix: 0.0,
              dataBenderMix: 0.0, dataBenderCrush: 0.6, dataBenderDrop: 0.25, dataBenderDrive: 0.5, dataBenderRate: 0.35,
              delayRate: 0.25, delayFdbk: 0.4, delayWidth: 0.5, delayWet: 0.0,
              masterHP: 0.0, masterLP: 1.0, masterRes: 0.2
          };

          this.dataBenderState = { sampleCounter: 0, sampleHold: 1, lastL: 0, lastR: 0 };

          this.reverb.setDecayNormalized(this.params.reverbDecay);

          this.port.onmessage = (e) => {
              const { type, payload } = e.data;
              if (type === 'PARAM_UPDATE') {
                  if (payload.id === 'run' && payload.value === 1 && this.params.run === 0) {
                      this.sequencer.clockPhase = 0.99;
                  }

                  this.params[payload.id] = payload.value;

                  if (payload.id === 'reverbDecay') {
                      this.reverb.setDecayNormalized(payload.value);
                  }
                  if (payload.id === 'delayRate') {
                      this.delayTimeSmoother.set(payload.value);
                  }
              } else if (type === 'SEQ_UPDATE') {
                  this.sequencer.steps = payload.steps;
              } else if (type === 'TRIGGER') {
                  this.sequencer.lastTrigVel = this.sequencer.steps[this.sequencer.currentStep].velocity;
                  this.triggerEnvelopes();
              } else if (type === 'SET_STEP') {
                  this.sequencer.currentStep = payload.step;
                  this.sequencer.clockPhase = 0;
              }
          };
      }

      polyBlep(t, dt) {
          if (t < dt) { t /= dt; return t + t - t * t - 1.0; }
          else if (t > 1.0 - dt) { t = (t - 1.0) / dt; return t * t + t + t + 1.0; }
          return 0.0;
      }

      getOscSample(vco, type, freq, syncPhase = -1) {
          freq = Math.max(10.0, Math.min(this.fs * 0.48, freq));
          if (!Number.isFinite(freq)) freq = 100.0;

          const dt = freq / this.fs;
          if (syncPhase !== -1 && syncPhase < vco.phase) vco.phase = syncPhase;
          vco.phase += dt;
          if (vco.phase >= 1.0) vco.phase -= 1.0;

          let val = 0.0;
          if (type === 0) {
              val = 4.0 * Math.abs(vco.phase - 0.5) - 1.0;
          } else {
              val = vco.phase < 0.5 ? 1.0 : -1.0;
              val += this.polyBlep(vco.phase, dt);
              val -= this.polyBlep((vco.phase + 0.5) % 1.0, dt);
          }
          return Number.isFinite(val) ? val : 0.0;
      }

      triggerEnvelopes() {
          this.vcoEg.phase = 1;
          this.vcfEg.phase = 1;
          this.vcaEg.phase = 1;
      }

      processEnvelopes() {
          const attackTime = Math.max(0.001, this.params.vcaAttack);
          
          const attackInc = 1.0 / (attackTime * this.fs);
          const runEnv = (env, decayParam) => {
              if (env.phase === 1) {
                  env.val += attackInc;
                  if (env.val >= 1.0) { env.val = 1.0; env.phase = 2; }
              } else if (env.phase === 2) {
                  // CHANGED: Use cubic curve (decayParam^3) for finer control at low values
                  const curvedDecay = Math.pow(decayParam, 3);
                  const time = 0.01 + (curvedDecay * 1.5);
                  env.val *= Math.exp(-1.0 / (time * this.fs));
              }
          };
          runEnv(this.vcoEg, this.params.vcoDecay);
          runEnv(this.vcfEg, this.params.vcfDecay);
          runEnv(this.vcaEg, this.params.vcaDecay);
      }

      runMoogFilter(input, cutoffFreq, res) {
          if (!Number.isFinite(input)) input = 0;
          cutoffFreq = Math.max(10, Math.min(this.fs * 0.48, cutoffFreq));

          let fc = 2.0 * 3.14159 * cutoffFreq / this.fs;
          fc = Math.min(Math.max(fc, 0), 0.98);
          const r = res * 3.8;
          const normalizedCut = cutoffFreq / (this.fs * 0.48);
          const drive = 0.6 + (1 - Math.min(1, normalizedCut)) * 0.4;
          const x = (input * drive) - r * Math.tanh(this.filter.s4);
          const f = fc;

          this.filter.s1 += f * (Math.tanh(x) - Math.tanh(this.filter.s1));
          this.filter.s2 += f * (Math.tanh(this.filter.s1) - Math.tanh(this.filter.s2));
          this.filter.s3 += f * (Math.tanh(this.filter.s2) - Math.tanh(this.filter.s3));
          this.filter.s4 += f * (Math.tanh(this.filter.s3) - Math.tanh(this.filter.s4));

          if (!Number.isFinite(this.filter.s4)) {
              this.filter = { s1: 0, s2: 0, s3: 0, s4: 0 };
              return 0;
          }
          return this.filter.s4;
      }

      computeMasterLPCoeffs(cutoffFreq, resonance) {
          const fc = Math.max(20, Math.min(this.fs * 0.45, cutoffFreq));
          const omega = 2 * Math.PI * fc / this.fs;
          const sin = Math.sin(omega);
          const cos = Math.cos(omega);
          const q = 0.5 + (resonance * 5.5);
          const alpha = sin / (2 * q);

          const b0 = (1 - cos) / 2;
          const b1 = 1 - cos;
          const b2 = (1 - cos) / 2;
          const a0 = 1 + alpha;
          const a1 = -2 * cos;
          const a2 = 1 - alpha;

          return {
              b0: b0 / a0,
              b1: b1 / a0,
              b2: b2 / a0,
              a1: a1 / a0,
              a2: a2 / a0
          };
      }

      processMasterLowpass(inL, inR, coeffs) {
          const st = this.masterLPFilter;

          const yL = coeffs.b0 * inL + coeffs.b1 * st.l.x1 + coeffs.b2 * st.l.x2 - coeffs.a1 * st.l.y1 - coeffs.a2 * st.l.y2;
          st.l.x2 = st.l.x1; st.l.x1 = inL;
          st.l.y2 = st.l.y1; st.l.y1 = Number.isFinite(yL) ? yL : 0;

          const yR = coeffs.b0 * inR + coeffs.b1 * st.r.x1 + coeffs.b2 * st.r.x2 - coeffs.a1 * st.r.y1 - coeffs.a2 * st.r.y2;
          st.r.x2 = st.r.x1; st.r.x1 = inR;
          st.r.y2 = st.r.y1; st.r.y1 = Number.isFinite(yR) ? yR : 0;

          return [st.l.y1, st.r.y1];
      }

      processDelay(inL, inR) {
          const currentRate = this.delayTimeSmoother.process(0.005);
          const tempo = Math.max(40, Math.min(300, this.params.tempo));
          const baseTime = (240 / tempo) * currentRate; // whole note = 240/BPM
          const maxSamples = this.delayL.buffer.length - 2;
          const sampsL = Math.min(baseTime * this.fs, maxSamples);
          const sampsR = Math.min(sampsL * (1.0 + (this.params.delayWidth * 0.5)), maxSamples);

          const dL = this.delayL.read(sampsL);
          const dR = this.delayR.read(sampsR);

          const fb = Math.min(this.params.delayFdbk, 0.95);
          let nL = inL + (dR * fb);
          let nR = inR + (dL * fb);

          nL = Math.max(-1.0, Math.min(1.0, nL));
          nR = Math.max(-1.0, Math.min(1.0, nR));

          this.delayL.write(nL);
          this.delayR.write(nR);

          const wet = this.params.delayWet;
          return [inL + dL * wet, inR + dR * wet];
      }

      processDataBender(inL, inR) {
          const mix = Math.max(0, Math.min(1, this.params.dataBenderMix ?? 0));
          if (mix <= 0.0001) return [inL, inR];

          const crushAmt = Math.max(0, Math.min(1, this.params.dataBenderCrush ?? 0));
          const dropAmt = Math.max(0, Math.min(1, this.params.dataBenderDrop ?? 0));
          const driveAmt = Math.max(0, Math.min(1, this.params.dataBenderDrive ?? 0));
          const rateAmt = Math.max(0, Math.min(1, this.params.dataBenderRate ?? 0));

          const bitDepth = Math.max(3, Math.floor(16 - (crushAmt * 12)));
          const steps = Math.pow(2, bitDepth) - 1;

          const hold = 1 + Math.floor(1 + rateAmt * 96);
          if (this.dataBenderState.sampleCounter-- <= 0) {
              this.dataBenderState.sampleCounter = hold;
              this.dataBenderState.lastL = inL;
              this.dataBenderState.lastR = inR;
          }

          const heldL = this.dataBenderState.lastL;
          const heldR = this.dataBenderState.lastR;

          const crush = (v) => {
              const clipped = Math.max(-1, Math.min(1, v));
              return Math.round(((clipped * 0.5) + 0.5) * steps) / steps * 2 - 1;
          };

          let outL = crush(heldL);
          let outR = crush(heldR);

          const dropoutChance = dropAmt * 0.12 + (Math.random() * dropAmt * 0.02);
          if (Math.random() < dropoutChance) { outL = 0; outR = 0; }

          const drive = 1 + driveAmt * 6;
          outL = Math.tanh(outL * drive);
          outR = Math.tanh(outR * drive);

          return [inL + (outL - inL) * mix, inR + (outR - inR) * mix];
      }

      processReverb(inL, inR) {
          return this.reverb.processSample(inL, inR);
      }

      process(inputs, outputs) {
          const output = outputs[0];
          const channelL = output[0];
          const channelR = output[1] || output[0];

          const stepsPerSec = (this.params.tempo * 4) / 60.0;
          const clockDt = stepsPerSec / this.fs;

          const hpFreq = 20 * Math.pow(20000/20, this.params.masterHP);
          const lpFreq = 20 * Math.pow(20000/20, this.params.masterLP);
          const masterLPCoeffs = this.computeMasterLPCoeffs(lpFreq, this.params.masterRes);

          this.reverb.prepareBlock(this.params.reverbDecay);

          let stepChanged = false;
          let newStepIndex = -1;

          for (let i = 0; i < channelL.length; i++) {
              let trigger = false;
              if (this.params.run) {
                  this.sequencer.clockPhase += clockDt;
                  if (this.sequencer.clockPhase >= 1.0) {
                      this.sequencer.clockPhase -= 1.0;
                      this.sequencer.currentStep = (this.sequencer.currentStep + 1) % 8;
                      trigger = true; stepChanged = true; newStepIndex = this.sequencer.currentStep;
                  }
              }

              if (trigger) {
                  const step = this.sequencer.steps[this.sequencer.currentStep];
                  
                  if (step.velocity > 0.05) {
                      this.sequencer.lastTrigVel = step.velocity;
                      this.triggerEnvelopes();
                  }
              }

              this.processEnvelopes();

              this.velSmoother.set(this.sequencer.lastTrigVel);
              const vel = this.velSmoother.process(0.005);

              const vco1Base = 20 * Math.pow(1000, this.params.vco1Freq);
              const vco2Base = 20 * Math.pow(1000, this.params.vco2Freq);
              const egAmt1 = (this.params.vco1EgAmt - 0.5) * 2.0;
              const vco1EgFactor = Math.pow(2, egAmt1 * 4 * this.vcoEg.val * vel);
              const egAmt2 = (this.params.vco2EgAmt - 0.5) * 2.0;
              const vco2EgFactor = Math.pow(2, egAmt2 * 4 * this.vcoEg.val * vel);

              let targetPitch = this.sequencer.steps[this.sequencer.currentStep].pitch;
              this.pitchSmoother.set(targetPitch);
              let smoothPitch = this.pitchSmoother.process(0.005);

              let seqPitchFactor = 1.0;
              if (this.params.seqPitchMod > 0) {
                  seqPitchFactor = Math.pow(2, (smoothPitch - 0.5) * 10);
              }

              const velAccent = Math.max(0, vel - 0.25);
              const velAccentCurve = velAccent * velAccent;
              let resonanceParam = this.params.resonance;
              let fmAmountParam = this.params.fmAmount;

              if (this.params.velModTarget === 1) {
                  resonanceParam = Math.min(0.99, resonanceParam + velAccentCurve * 0.8);
              } else if (this.params.velModTarget === 2) {
                  fmAmountParam = Math.min(1.0, fmAmountParam + velAccentCurve * 1.0);
              }

              let f1 = vco1Base * vco1EgFactor;
              let f2 = vco2Base * vco2EgFactor;

              if (this.params.seqPitchMod === 1) { f1 *= seqPitchFactor; f2 *= seqPitchFactor; }
              else if (this.params.seqPitchMod === 2) { f2 *= seqPitchFactor; }

              const osc1Out = this.getOscSample(this.vco1, this.params.vco1Wave, f1);

              let f2Mod = osc1Out * fmAmountParam * 4000;
              if (!Number.isFinite(f2Mod)) f2Mod = 0;
              f2 += f2Mod;

              const syncPhase = this.params.hardSync ? this.vco1.phase : -1;
              const osc2Out = this.getOscSample(this.vco2, this.params.vco2Wave, f2, syncPhase);
              const noiseSamp = (Math.random() * 2 - 1);

              let mix = (osc1Out * this.params.vco1Level * 0.7) +
                        (osc2Out * this.params.vco2Level * 0.7) +
                        (noiseSamp * this.params.noiseLevel * 0.5);

              if (!Number.isFinite(mix)) mix = 0;
              mix = Math.tanh(mix * 1.5);

              let cutEgMod = (this.params.vcfEgAmt - 0.5) * 2.0 * (this.vcfEg.val * vel);
              let noiseMod = this.params.noiseVcfMod * noiseSamp;
              let moddedCutoffParam = this.params.cutoff + (cutEgMod * 0.5) + (noiseMod * 0.2);
              moddedCutoffParam = Math.max(0.001, Math.min(0.999, moddedCutoffParam));

              const finalCutoffFreq = 20 * Math.pow(20000/20, moddedCutoffParam);

              let filtered = this.runMoogFilter(mix, finalCutoffFreq, resonanceParam);
              const postVca = Math.tanh(filtered * this.vcaEg.val * vel);

              const [bentL, bentR] = this.processDataBender(postVca, postVca);
              const [delL, delR] = this.processDelay(bentL, bentR);
              const [revL, revR] = this.processReverb(delL, delR);
              const rWet = this.params.reverbMix;

              let mixL = delL + (revL * rWet * 1.5);
              let mixR = delR + (revR * rWet * 1.5);

              let subL = this.mfL_hp_sub.process(mixL, hpFreq, this.fs);
              let subR = this.mfR_hp_sub.process(mixR, hpFreq, this.fs);
              let hpL = mixL - subL;
              let hpR = mixR - subR;

              const [finalL, finalR] = this.processMasterLowpass(hpL, hpR, masterLPCoeffs);

              const boost = 1.1 * this.params.volume;
              channelL[i] = Math.tanh(finalL * boost);
              channelR[i] = Math.tanh(finalR * boost);
          }

          if (stepChanged) { this.port.postMessage({ type: 'STEP_CHANGE', step: newStepIndex }); }
          return true;
      }
  }
  registerProcessor('jroomz-processor', JroomzProcessor);
  `;

  window.JROOMZ_WORKLET_CODE = workletCode;

  window.createJroomzWorkletNode = async function createJroomzWorkletNode(ctx) {
    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    await ctx.audioWorklet.addModule(url);
    const node = new AudioWorkletNode(ctx, 'jroomz-processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2]
    });
    return node;
  };
})();
