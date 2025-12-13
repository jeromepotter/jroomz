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

  class LowpassCombFilter {
      constructor(bufferSize) {
          this.bufferSize = bufferSize;
          this.buffer = new Float32Array(bufferSize);
          this.index = 0; this.store = 0; this.feedback = 0.8; this.damping = 0.2;
      }
      setFeedback(val) { this.feedback = val; }
  }

  class AllpassFilter {
      constructor(bufferSize) {
          this.bufferSize = bufferSize;
          this.buffer = new Float32Array(bufferSize);
          this.index = 0;
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

          const tunings = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
          const stereospread = 23;
          this.combsL = tunings.map(t => new LowpassCombFilter(t));
          this.combsR = tunings.map(t => new LowpassCombFilter(t + stereospread));

          this.allpassesL = [new AllpassFilter(556), new AllpassFilter(441), new AllpassFilter(341), new AllpassFilter(225)];
          this.allpassesR = [new AllpassFilter(556+stereospread), new AllpassFilter(441+stereospread), new AllpassFilter(341+stereospread), new AllpassFilter(225+stereospread)];
          this.verbFb = 0.7;

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

              volume: 0.8,
              tempo: 120, run: 0,
              reverbDecay: 0.7, reverbMix: 0.0,
              dataBenderMix: 0.0, dataBenderCrush: 0.6, dataBenderDrop: 0.25, dataBenderDrive: 0.5, dataBenderRate: 0.35,
              delayRate: 0.25, delayFdbk: 0.4, delayWidth: 0.5, delayWet: 0.0,
              masterHP: 0.0, masterLP: 1.0, masterRes: 0.2
          };

          this.dataBenderState = { sampleCounter: 0, sampleHold: 1, lastL: 0, lastR: 0 };

          this.port.onmessage = (e) => {
              const { type, payload } = e.data;
              if (type === 'PARAM_UPDATE') {
                  if (payload.id === 'run' && payload.value === 1 && this.params.run === 0) {
                      this.sequencer.clockPhase = 0.99;
                  }

                  this.params[payload.id] = payload.value;

                  if (payload.id === 'reverbDecay') {
                      this.verbFb = 0.7 + (payload.value * 0.28);
                      this.combsL.forEach(c => c.setFeedback(this.verbFb));
                      this.combsR.forEach(c => c.setFeedback(this.verbFb));
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
          const mix = (inL + inR) * 0.5 * 0.015;
          let oL = 0, oR = 0;

          for (let i = 0; i < 8; i++) {
              const c = this.combsL[i];
              const out = c.buffer[c.index];
              c.store = (out * 0.8) + (c.store * 0.2);
              c.buffer[c.index] = mix + (c.store * this.verbFb);
              c.index = (c.index + 1) % c.bufferSize;
              oL += out;
          }
          for (let i = 0; i < 8; i++) {
              const c = this.combsR[i];
              const out = c.buffer[c.index];
              c.store = (out * 0.8) + (c.store * 0.2);
              c.buffer[c.index] = mix + (c.store * this.verbFb);
              c.index = (c.index + 1) % c.bufferSize;
              oR += out;
          }

          for (let i = 0; i < 4; i++) {
              const ap = this.allpassesL[i];
              const bufOut = ap.buffer[ap.index];
              const out = -oL + bufOut;
              ap.buffer[ap.index] = oL + (bufOut * 0.5);
              ap.index = (ap.index + 1) % ap.bufferSize;
              oL = out;
          }
          for (let i = 0; i < 4; i++) {
              const ap = this.allpassesR[i];
              const bufOut = ap.buffer[ap.index];
              const out = -oR + bufOut;
              ap.buffer[ap.index] = oR + (bufOut * 0.5);
              ap.index = (ap.index + 1) % ap.bufferSize;
              oR = out;
          }
          return [oL, oR];
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

          let stepChanged = false;
          let newStepIndex = -1;
          let stepSampleIndex = -1;

          for (let i = 0; i < channelL.length; i++) {
              let trigger = false;
              if (this.params.run) {
                  this.sequencer.clockPhase += clockDt;
                  if (this.sequencer.clockPhase >= 1.0) {
                      this.sequencer.clockPhase -= 1.0;
                      this.sequencer.currentStep = (this.sequencer.currentStep + 1) % 8;
                      trigger = true; stepChanged = true; newStepIndex = this.sequencer.currentStep; stepSampleIndex = i;
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

              let f1 = vco1Base * vco1EgFactor;
              let f2 = vco2Base * vco2EgFactor;

              if (this.params.seqPitchMod === 1) { f1 *= seqPitchFactor; f2 *= seqPitchFactor; }
              else if (this.params.seqPitchMod === 2) { f2 *= seqPitchFactor; }

              const osc1Out = this.getOscSample(this.vco1, this.params.vco1Wave, f1);

              let f2Mod = osc1Out * this.params.fmAmount * 4000;
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

              let filtered = this.runMoogFilter(mix, finalCutoffFreq, this.params.resonance);
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

          if (stepChanged) {
              const eventTime = currentTime + (stepSampleIndex >= 0 ? (stepSampleIndex / this.fs) : 0);
              this.port.postMessage({ type: 'STEP_CHANGE', step: newStepIndex, time: eventTime });
          }
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
