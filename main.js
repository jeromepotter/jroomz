// main.js (loaded via Babel in the browser)
// Depends on: React/ReactDOM globals, window.PRESETS, window.DEFAULT_PARAMS, window.DEFAULT_STEPS, window.createJroomzWorkletNode

const { useState, useEffect, useRef } = React;

// --- COMPONENTS ---

const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 modal-overlay bg-black/80" onClick={onClose}>
      <div className="w-full max-w-5xl bg-black text-white border-2 border-white shadow-2xl p-8 relative flex flex-col max-h-[90vh] overflow-y-auto font-poppins" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-3xl font-bold hover:text-gray-400">&times;</button>
        <h2 className="text-4xl mb-8 font-bold tracking-tight border-b-2 border-white pb-4 uppercase">Operational Manual</h2>
        <div className="space-y-10 text-sm leading-relaxed">
          <section>
            <h3 className="text-xl font-bold mb-3 border-b border-gray-700 pb-2 uppercase">1. Sequencer Core</h3>
            <p className="text-gray-300 mb-3">The sequencer drives all movement. It runs 8 steps in order, or you can advance them manually.</p>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li><strong>TEMPO</strong>: Clock speed in BPM. Higher values race through the steps; lower values give the envelopes time to bloom.</li>
              <li><strong>PITCH (top row of small knobs)</strong>: Per-step tuning. Fully left is a low thud, fully right is a high blip.</li>
              <li><strong>VEL (bottom row)</strong>: Per-step velocity. This scales the loudness <em>and</em> how hard envelopes hit the oscillators and filter.</li>
              <li><strong>RUN</strong>: Starts or stops the internal clock. When stopped you can tap <strong>ADV</strong> to walk steps one by one.</li>
              <li><strong>TRIG</strong>: Fires the envelopes immediately on the current step so you can audition sounds without moving the sequencer.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3 border-b border-gray-700 pb-2 uppercase">2. Oscillator Bank</h3>
            <p className="text-gray-300 mb-3">Two VCOs generate the raw tone. They can run independently, sync together, or frequency-modulate one another.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="font-bold text-white mb-1">VCO 1</p>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                  <li><strong>VCO1 FREQ</strong>: Base pitch offset. Centered around midrange; left lowers, right raises.</li>
                  <li><strong>WAVE</strong>: ▲ is a smooth triangle-inspired wave. Π is a bright, edgy pulse.</li>
                  <li><strong>VCO1 LVL</strong>: Mix amount going into the filter.</li>
                  <li><strong>VCO1 EG</strong>: Envelope depth applied to VCO1 pitch. Positive values bend upward on each hit; negative values dive down.</li>
                  <li><strong>DECAY</strong>: Shared pitch envelope decay for both oscillators. Short for blips, long for laser sweeps.</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-white mb-1">VCO 2</p>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                  <li><strong>VCO2 FREQ</strong>: Second oscillator offset. Pair it with hard sync for ripping harmonics or leave unsynced for beating.</li>
                  <li><strong>WAVE</strong>: Same shapes as VCO1.</li>
                  <li><strong>VCO2 LVL</strong>: Mix amount for VCO2.</li>
                  <li><strong>VCO2 EG</strong>: Envelope depth for VCO2 pitch.</li>
                  <li><strong>SYNC</strong>: Forces VCO2 to reset to VCO1’s phase each cycle. Great for growls; turn off for free-running motion.</li>
                  <li><strong>FM AMT</strong>: How much VCO1 modulates VCO2 pitch. Small amounts add grit, high amounts create metallic tones.</li>
                </ul>
              </div>
            </div>
            <div className="mt-4">
              <p className="font-bold text-white mb-1">Sequencer Routing</p>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li><strong>SEQ PITCH</strong>: OFF leaves the oscillators droning. <strong>1&amp;2</strong> tracks both oscillators with the step pitch. <strong>2</strong> only routes the sequencer to VCO2, leaving VCO1 steady.</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3 border-b border-gray-700 pb-2 uppercase">3. Noise & Filter Section</h3>
            <p className="text-gray-300 mb-3">Tone shaping happens here. The noise generator and ladder filter sculpt the attack and brightness.</p>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li><strong>NOISE</strong>: Adds white noise before the filter for snares and shakers.</li>
              <li><strong>CUTOFF</strong>: Sets the main filter ceiling. Turn right for brighter hits, left for muffled thumps.</li>
              <li><strong>RES</strong>: Emphasizes frequencies right at the cutoff. Higher values whistle or ring.</li>
              <li><strong>EG AMT</strong>: Bipolar depth for the filter envelope. Right sweeps upward on each hit; left sweeps downward.</li>
              <li><strong>DECAY</strong>: How long the filter envelope takes to close.</li>
              <li><strong>NOISE MOD</strong>: Lets the noise signal wiggle the cutoff for dusty or unstable highs.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3 border-b border-gray-700 pb-2 uppercase">4. Amplifier & Dynamics</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li><strong>ATTACK</strong>: Controls the onset speed. Low values are punchy; higher values soften the start.</li>
              <li><strong>DECAY</strong>: Tail length of the volume envelope.</li>
              <li><strong>VOLUME</strong>: Final output gain after the entire effects chain.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-3 border-b border-gray-700 pb-2 uppercase">5. Global Filter & Effects</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li><strong>BENDER</strong> (MIX / CRSH / DROP / DRIVE / RATE): Circuit-bent stage that crushes bits, downsamples, drops packets, and overdrives before feeding the delay.</li>
              <li><strong>HPF</strong>: Rolls off low end. Use lightly to tame sub-rumble.</li>
              <li><strong>LPF</strong>: Smooths the final brightness after everything else.</li>
              <li><strong>GLB RES</strong>: Adds a gentle bump at the LPF cutoff. Subtle settings thicken the mix; higher settings give a rounded peak without harshness.</li>
              <li><strong>DELAY</strong> (MIX / RATE / FDBK / WIDTH): Controls wet level, repeat time, feedback amount, and stereo offset.</li>
              <li><strong>REVERB</strong> (MIX / LEN): Mix amount and decay length of the hall-style reverb.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

const delayDivisions = [
  { label: "1/64", value: 1 / 64 },
  { label: "1/32", value: 1 / 32 },
  { label: "1/32 D", value: 3 / 64 },
  { label: "1/16", value: 1 / 16 },
  { label: "1/12", value: 1 / 12 },
  { label: "1/16 D", value: 3 / 32 },
  { label: "1/8", value: 1 / 8 },
  { label: "1/8 D", value: 3 / 16 },
  { label: "1/4", value: 1 / 4 },
  { label: "1/4 D", value: 3 / 8 },
  { label: "1/2", value: 1 / 2 },
  { label: "1", value: 1 },
];

const delayMin = delayDivisions[0].value;
const delayMax = delayDivisions[delayDivisions.length - 1].value;

const clampDelay = (value) => Math.min(delayMax, Math.max(delayMin, value ?? delayMin));

const getNearestDelayDivision = (val) => {
  let closest = delayDivisions[0];
  let minDiff = Math.abs(val - closest.value);
  delayDivisions.forEach((d) => {
    const diff = Math.abs(val - d.value);
    if (diff < minDiff) { minDiff = diff; closest = d; }
  });
  return closest;
};

const delayValueToKnobPos = (value) => {
  const v = clampDelay(value);
  for (let i = 0; i < delayDivisions.length - 1; i++) {
    const current = delayDivisions[i].value;
    const next = delayDivisions[i + 1].value;
    if (v <= next) {
      const t = (v - current) / (next - current);
      return (i + t) / (delayDivisions.length - 1);
    }
  }
  return 1;
};

const knobPosToDelayValue = (pos) => {
  const clamped = Math.min(1, Math.max(0, pos));
  const scaled = clamped * (delayDivisions.length - 1);
  const lowerIndex = Math.floor(scaled);
  const upperIndex = Math.ceil(scaled);

  if (lowerIndex === upperIndex) return delayDivisions[lowerIndex].value;

  const t = scaled - lowerIndex;
  const lowerVal = delayDivisions[lowerIndex].value;
  const upperVal = delayDivisions[upperIndex].value;
  return lowerVal + (upperVal - lowerVal) * t;
};

const Knob = ({ label, value, onChange, min = 0, max = 1, bipolar = false, size = "md", color = "black", darkMode, displayFormatter }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const handleStart = (clientY) => {
    setIsDragging(true);
    startY.current = clientY;
    startVal.current = value;
  };

  const updateValue = (clientY) => {
    const deltaY = startY.current - clientY;
    const range = max - min;
    let newVal = Math.min(max, Math.max(min, startVal.current + (deltaY / 200) * range));
    onChange(newVal);
  };

  useEffect(() => {
    const handleMove = (e) => {
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      if (isDragging) {
        if (e.cancelable && e.type === 'touchmove') e.preventDefault();
        updateValue(clientY);
      }
    };
    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  const pct = (value - min) / (max - min);
  const sizeClasses = size === "lg" ? "w-8 h-8 md:w-14 md:h-14" : size === "sm" ? "w-5 h-5 md:w-8 md:h-8" : "w-6 h-6 md:w-11 md:h-11";
  const textSize = size === "lg" ? "text-[7px] md:text-[9px]" : "text-[6px] md:text-[8px]";
  const textColor = darkMode ? "text-gray-300" : "text-gray-800";

  let knobBg, knobBorder, indicatorBg;
  if (color === "white") {
    knobBg = darkMode ? "bg-gray-400" : "bg-gray-200";
    knobBorder = darkMode ? "border-gray-500" : "border-gray-400";
    indicatorBg = darkMode ? "bg-gray-900" : "bg-gray-800";
  } else {
    knobBg = darkMode ? "bg-gray-900" : "bg-gray-800";
    knobBorder = darkMode ? "border-gray-700" : "border-gray-600";
    indicatorBg = "bg-white";
  }

  const formattedValue = isDragging
    ? (displayFormatter ? displayFormatter(value) : (max > 10 ? Math.round(value) : null))
    : null;

  return (
    <div className="flex flex-col items-center justify-start h-full p-0.5 relative">
      {formattedValue !== null && <div className="knob-value-tooltip">{formattedValue}</div>}

      <div className={`${textSize} font-bold ${textColor} mb-0.5 text-center leading-none px-0.5 tracking-tight uppercase`}>{label}</div>
      <div
        className={`knob-container rounded-full border-2 ${sizeClasses} relative shadow-md cursor-ns-resize ${knobBg} ${knobBorder}`}
        onMouseDown={(e) => handleStart(e.clientY)}
        onTouchStart={(e) => handleStart(e.touches[0].clientY)}
        onDoubleClick={() => onChange(bipolar ? (max + min) / 2 : min)}
      >
        {color !== "white" && <div className="absolute inset-1 rounded-full border border-gray-600 opacity-50"></div>}
        <div
          className={`knob-indicator absolute w-0.5 h-1/2 left-1/2 rounded-full origin-bottom ${indicatorBg}`}
          style={{ bottom: '50%', left: 'calc(50% - 1px)', transform: `rotate(${-135 + pct * 270}deg)` }}
        ></div>
      </div>
    </div>
  );
};

const Switch = ({ label, value, onChange, options, darkMode }) => {
  const textColor = darkMode ? "text-gray-300" : "text-gray-800";
  const baseBg = darkMode ? "bg-gray-700" : "bg-gray-300";
  const switchBg = darkMode ? "bg-gray-900" : "bg-black";
  return (
    <div className="flex flex-col items-center h-full p-0.5 switch-container">
      <div className={`text-[6px] md:text-[8px] font-bold ${textColor} mb-0.5 text-center uppercase`}>{label}</div>
      <div
        className={`w-5 h-6 md:w-6 md:h-9 ${baseBg} border-2 border-gray-500 rounded flex flex-col items-center justify-between p-0.5 cursor-pointer shadow-inner`}
        onClick={() => onChange((value + 1) % options.length)}
      >
        <div className={`w-full h-1/2 ${switchBg} rounded-sm shadow-md transition-transform duration-100 ${value === 0 ? 'translate-y-0' : (value === options.length - 1 ? 'translate-y-full' : 'translate-y-1/2')}`}></div>
      </div>
      <div className="flex flex-col text-[5px] md:text-[7px] text-gray-500 mt-0.5 leading-tight text-center">
        {options.map((o, i) => <span key={i} className={i === value ? `font-bold ${darkMode ? 'text-gray-200' : 'text-black'}` : ''}>{o}</span>)}
      </div>
    </div>
  );
};

const SequencerStep = ({ index, pitch, velocity, onChange, isActive, darkMode, ledRef }) => {
  return (
    <div className={`flex flex-col items-center flex-1 min-w-0 border-r ${darkMode ? 'border-gray-700' : 'border-gray-300'} last:border-0 relative pb-1`}>
      <div className="mb-1 mt-1">
        <div
          ref={ledRef}
          data-step={index}
          className={`w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full transition-colors duration-75 ${isActive ? 'led-active' : 'led-inactive'}`}
        ></div>
      </div>
      <div className="flex flex-col gap-0.5">
        <Knob value={pitch} onChange={(v) => onChange(index, 'pitch', v)} size="sm" label="" darkMode={darkMode} />
        <Knob value={velocity} onChange={(v) => onChange(index, 'velocity', v)} size="sm" label="" darkMode={darkMode} />
      </div>
      <span className="text-[7px] md:text-[9px] font-bold text-gray-500 mt-0.5 absolute bottom-[-10px]">{index + 1}</span>
    </div>
  );
};

const PresetSelector = ({ currentPreset, onSelect, darkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`text-xs font-bold px-2 py-1 rounded border uppercase tracking-wider flex items-center gap-1 transition-colors ${darkMode ? 'text-gray-300 border-gray-600 hover:border-gray-400 bg-gray-800' : 'text-gray-600 border-gray-400 hover:border-gray-600 bg-gray-200'}`}
      >
        {currentPreset ? currentPreset : 'PRESETS'} <span className="text-[8px]">▼</span>
      </button>
      {isOpen && (
        <div className={`absolute top-full right-0 mt-1 w-48 max-h-[320px] overflow-y-auto preset-scroll border-2 shadow-xl z-50 rounded-sm ${darkMode ? 'bg-gray-900 border-gray-600 text-gray-300' : 'bg-white border-gray-800 text-gray-800'}`}>
          {window.PRESETS.map((preset, idx) => (
            <div
              key={idx}
              onClick={() => { onSelect(idx); setIsOpen(false); }}
              className={`px-3 py-2 text-xs font-bold cursor-pointer hover:bg-red-500 hover:text-white border-b last:border-0 uppercase ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}
            >
              {idx + 1}. {preset.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const App = () => {
  const [audioCtx, setAudioCtx] = useState(null);
  const [workletNode, setWorkletNode] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [currentPresetName, setCurrentPresetName] = useState(window.PRESETS[0].name);
  const fileInputRef = useRef(null);
  const ledRefs = useRef([]);
  const scheduledSteps = useRef([]);
  const rafId = useRef(null);
  const lastLedIndex = useRef(null);

  const initialParams = { ...window.PRESETS[0].params, delayRate: clampDelay(window.PRESETS[0].params.delayRate ?? window.DEFAULT_PARAMS.delayRate) };
  const [params, setParams] = useState(initialParams);
  const [steps, setSteps] = useState(window.PRESETS[0].steps);

  const setLedState = (index) => {
    if (!ledRefs.current.length) return;
    if (lastLedIndex.current !== null && ledRefs.current[lastLedIndex.current]) {
      ledRefs.current[lastLedIndex.current].classList.remove('led-active');
      ledRefs.current[lastLedIndex.current].classList.add('led-inactive');
    }
    const target = ledRefs.current[index];
    if (target) {
      target.classList.add('led-active');
      target.classList.remove('led-inactive');
    }
    lastLedIndex.current = index;
  };

  // Merge with defaults when loading
  const applyPatch = (patch) => {
    const p = patch;
    const currentRun = params.run;
    const fullParams = { ...window.DEFAULT_PARAMS, ...p.params, run: currentRun };
    fullParams.delayRate = clampDelay(fullParams.delayRate ?? window.DEFAULT_PARAMS.delayRate);

    // MIGRATION: If incoming patch lacks vcaAttack but has old mode, convert it.
    if (fullParams.vcaAttack === undefined) {
      if (p.params && p.params.vcaEgMode === 1) {
         fullParams.vcaAttack = 0.02; // Slow
      } else {
         fullParams.vcaAttack = 0.003; // Fast
      }
    }

    const incomingSteps = Array.isArray(p.steps) ? p.steps : window.DEFAULT_STEPS;
    const normalizedSteps = incomingSteps.map((s, idx) => ({
      pitch: typeof s.pitch === 'number' ? s.pitch : (window.DEFAULT_STEPS[idx]?.pitch ?? 0.5),
      velocity: typeof s.velocity === 'number' ? s.velocity : (window.DEFAULT_STEPS[idx]?.velocity ?? 0.5),
    }));
    while (normalizedSteps.length < window.DEFAULT_STEPS.length) {
      const idx = normalizedSteps.length;
      normalizedSteps.push({
        pitch: window.DEFAULT_STEPS[idx].pitch,
        velocity: window.DEFAULT_STEPS[idx].velocity,
      });
    }
    if (normalizedSteps.length > window.DEFAULT_STEPS.length) {
      normalizedSteps.length = window.DEFAULT_STEPS.length;
    }

    setParams(fullParams);
    setSteps(normalizedSteps);
    setCurrentPresetName(p.name || 'CUSTOM');

    if (workletNode) {
      Object.keys(fullParams).forEach(key => {
        workletNode.port.postMessage({ type: 'PARAM_UPDATE', payload: { id: key, value: fullParams[key] } });
      });
      workletNode.port.postMessage({ type: 'SEQ_UPDATE', payload: { steps: normalizedSteps } });
    }
  };

  const loadPreset = (index) => applyPatch(window.PRESETS[index]);

  const startAudio = async () => {
    if (audioCtx) return;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    try {
      const node = await window.createJroomzWorkletNode(ctx);
      node.connect(ctx.destination);
      node.port.onmessage = (e) => {
        if (e.data.type === 'STEP_CHANGE') {
          const now = ctx.getOutputTimestamp?.().contextTime ?? ctx.currentTime;
          const targetTime = Number.isFinite(e.data.time) ? e.data.time : now;
          scheduledSteps.current.push({ step: e.data.step, time: targetTime });
          scheduledSteps.current.sort((a, b) => a.time - b.time);
        }
      };

      setAudioCtx(ctx);
      setWorkletNode(node);
      setIsStarted(true);

      if (ctx.state === 'suspended') await ctx.resume();

      Object.keys(params).forEach(key => node.port.postMessage({ type: 'PARAM_UPDATE', payload: { id: key, value: params[key] } }));
      node.port.postMessage({ type: 'SEQ_UPDATE', payload: { steps } });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!audioCtx) return;
    const tick = () => {
      const ts = audioCtx.getOutputTimestamp ? audioCtx.getOutputTimestamp() : null;
      const now = ts && Number.isFinite(ts.contextTime) ? ts.contextTime : audioCtx.currentTime;
      while (scheduledSteps.current.length && scheduledSteps.current[0].time <= now) {
        const evt = scheduledSteps.current.shift();
        setLedState(evt.step);
        setCurrentStep(evt.step);
      }
      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); };
  }, [audioCtx]);

  const updateParam = (id, value) => {
    const newValue = id === 'delayRate' ? clampDelay(value) : value;
    setParams(prev => ({ ...prev, [id]: newValue }));
    if (workletNode) workletNode.port.postMessage({ type: 'PARAM_UPDATE', payload: { id, value: newValue } });
  };

  const handleDelayRateChange = (knobPos) => {
    const actualValue = knobPosToDelayValue(knobPos);
    updateParam('delayRate', actualValue);
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
    if (workletNode) workletNode.port.postMessage({ type: 'SEQ_UPDATE', payload: { steps: newSteps } });
  };

  const savePatch = () => {
    const payload = {
      name: currentPresetName,
      params: { ...params },
      steps,
    };
    const randomId = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const filename = `jroomz-patch-${randomId}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (parsed && parsed.params && parsed.steps) {
          applyPatch(parsed);
        }
      } catch (err) {
        console.error('Invalid patch file', err);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const triggerLoad = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const toggleRun = async () => {
    if (audioCtx && audioCtx.state === 'suspended') { await audioCtx.resume(); }
    const newVal = params.run ? 0 : 1;
    updateParam('run', newVal);
  };

  // --- SPACEBAR LISTENER ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for spacebar and ensure it's not a repeat event (holding down)
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault(); // Prevent scrolling
        toggleRun();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleRun]); 
  // ------------------------------

  const doTrigger = async () => {
    if (audioCtx && audioCtx.state === 'suspended') { await audioCtx.resume(); }
    if (workletNode) workletNode.port.postMessage({ type: 'TRIGGER' });
  };

  const doAdvance = async () => {
    if (audioCtx && audioCtx.state === 'suspended') { await audioCtx.resume(); }
    if (!params.run) {
      const nextStep = (currentStep + 1) % 8;
      setCurrentStep(nextStep);
      setLedState(nextStep);
      if (workletNode) workletNode.port.postMessage({ type: 'SET_STEP', payload: { step: nextStep } });
    }
  };

  if (!isStarted) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#121212] text-white p-4">
        <h1 className="text-5xl md:text-8xl mb-4 font-poppins font-black tracking-tight">JROOMZ</h1>
        <button onClick={startAudio} className="px-12 py-5 bg-white text-black hover:bg-gray-200 font-bold tracking-widest transition-transform active:scale-95 font-poppins text-lg rounded-sm shadow-xl">INITIALIZE</button>
      </div>
    );
  }

  const mainBg = darkMode ? "bg-[#222]" : "bg-[#e5e5e5]";
  const panelBorder = darkMode ? "border-gray-700" : "border-gray-700";
  const seqBg = darkMode ? "bg-[#333]" : "bg-[#d4d4d4]";
  const seqBorder = darkMode ? "border-gray-600" : "border-gray-400";

  return (
    <div className={`h-screen w-full ${darkMode ? 'bg-[#121212]' : 'bg-[#333]'} flex flex-col items-center justify-start md:justify-center p-2 md:p-4 overflow-y-auto transition-colors duration-300`}>
      <HelpModal isOpen={showModal} onClose={() => setShowModal(false)} />

      <div className={`w-full max-w-4xl shrink-0 ${mainBg} rounded-xl shadow-2xl border-4 ${panelBorder} flex flex-col relative transition-colors duration-300 mb-8 md:mb-0`}>
        <div className="absolute top-2 right-4 z-20 flex gap-3 items-center">
          <div className="flex items-center gap-1">
            <PresetSelector currentPreset={currentPresetName} onSelect={loadPreset} darkMode={darkMode} />
            <button
              onClick={savePatch}
              title="Save patch"
              className={`w-6 h-6 flex items-center justify-center rounded border text-xs font-bold ${darkMode ? 'border-gray-500 text-gray-300 hover:border-white hover:text-white bg-gray-800' : 'border-gray-500 text-gray-700 hover:border-black hover:text-black bg-gray-200'}`}
            >
              S
            </button>
            <button
              onClick={triggerLoad}
              title="Load patch"
              className={`w-6 h-6 flex items-center justify-center rounded border text-xs font-bold ${darkMode ? 'border-gray-500 text-gray-300 hover:border-white hover:text-white bg-gray-800' : 'border-gray-500 text-gray-700 hover:border-black hover:text-black bg-gray-200'}`}
            >
              L
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileInput} />
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className={`text-xs font-bold ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}>{darkMode ? 'LIGHT' : 'DARK'}</button>
          <button onClick={() => setShowModal(true)} className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold ${darkMode ? 'border-gray-400 text-gray-400 hover:border-white hover:text-white' : 'border-gray-600 text-gray-600 hover:border-black hover:text-black'}`}>?</button>
        </div>
        <div className={`absolute top-2 left-4 z-20 font-poppins font-black tracking-tight text-lg opacity-80 ${darkMode ? 'text-gray-500' : 'text-gray-700'}`}>JROOMZ</div>

        <div className="flex flex-col md:px-8 py-10 w-full">
          <div className={`${seqBg} border-2 ${seqBorder} rounded-lg p-2 shadow-inner mb-4 transition-colors duration-300`}>
            <div className={`flex items-center justify-between mb-2 px-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'} pb-2`}>
              <h2 className={`text-xs font-black ${darkMode ? 'text-gray-400' : 'text-gray-700'} tracking-wider`}>&nbsp;</h2>
            </div>
            <div className="flex flex-row w-full gap-2 items-stretch">
              <div className={`flex flex-col justify-between items-center pr-2 border-r-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'} min-w-[50px]`}>
                <Knob label="TEMPO" value={params.tempo} onChange={(v) => updateParam('tempo', v)} min={40} max={300} size="lg" darkMode={darkMode} />
                <div className="flex flex-col gap-1 mt-2 w-full">
                  <button onClick={toggleRun} className={`h-6 w-full rounded border border-gray-600 text-[8px] font-bold shadow-sm ${params.run ? 'bg-red-600 text-white' : (darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-black')}`}>{params.run ? 'STOP' : 'RUN'}</button>
                  <div className="flex gap-1 w-full">
                    <button onMouseDown={doTrigger} className={`flex-1 h-6 rounded border border-gray-600 active:bg-red-600 text-white text-[8px] font-bold ${darkMode ? 'bg-gray-800' : 'bg-gray-800'}`}>TRIG</button>
                    <button onClick={doAdvance} className={`flex-1 h-6 rounded border border-gray-600 active:bg-gray-400 text-[8px] font-bold ${darkMode ? 'bg-gray-600 text-white' : 'bg-gray-300 text-black'}`}>ADV</button>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-row justify-between w-full overflow-hidden">
                <div className={`flex flex-col justify-start items-end pr-1 gap-0.5 flex-shrink-0 ${darkMode ? 'opacity-100 text-white' : 'opacity-50 text-gray-800'}`}>
                  <div className="mb-1 mt-1 h-1.5 md:h-2.5"></div>
                  <div className="flex flex-col gap-0.5 items-end h-full">
                    <span className="text-[6px] md:text-[8px] font-bold h-[28px] md:h-[44px] flex items-center leading-none">PITCH</span>
                    <span className="text-[6px] md:text-[8px] font-bold h-[28px] md:h-[44px] flex items-center leading-none">VEL</span>
                  </div>
                </div>

                <div className={`flex-1 flex flex-row border-l ${darkMode ? 'border-gray-600' : 'border-gray-300'} pl-1 w-full gap-0.5`}>
                  {steps.map((s, i) => (
                    <SequencerStep
                      key={i}
                      index={i}
                      pitch={s.pitch}
                      velocity={s.velocity}
                      onChange={updateStep}
                      isActive={currentStep === i}
                      darkMode={darkMode}
                      ledRef={(el) => { ledRefs.current[i] = el; if (el && lastLedIndex.current === null && currentStep === i) setLedState(i); }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-2 px-0.5">
            <div className="grid grid-cols-12 gap-0.5 items-end justify-items-center">
              
              {/* VCO 1 SECTION (Col 1-4) */}
              <div className="col-span-4 flex justify-evenly w-full border-r border-gray-400/30 pr-0.5">
                <Knob label="VCO1 FREQ" value={params.vco1Freq} onChange={(v) => updateParam('vco1Freq', v)} size="lg" darkMode={darkMode} />
                <Switch label="WAVE" value={params.vco1Wave} options={['▲', 'Π']} onChange={(v) => updateParam('vco1Wave', v)} darkMode={darkMode} />
                <Knob label="VCO1 LVL" value={params.vco1Level} onChange={(v) => updateParam('vco1Level', v)} size="sm" darkMode={darkMode} />
                <Knob label="VCO1 EG" value={params.vco1EgAmt} onChange={(v) => updateParam('vco1EgAmt', v)} bipolar darkMode={darkMode} />
              </div>

              {/* MODULATION / SHARED SECTION (Col 5-8) */}
              <div className="col-span-4 flex justify-evenly w-full border-r border-gray-400/30 px-0.5 bg-white/5 rounded-lg">
                {/* Global Pitch Decay */}
                <Knob label="DECAY" value={params.vcoDecay} onChange={(v) => updateParam('vcoDecay', v)} darkMode={darkMode} />
                {/* Routing */}
                <Switch label="SEQ PITCH" value={params.seqPitchMod} options={['OFF', '1&2', '2']} onChange={(v) => updateParam('seqPitchMod', v)} darkMode={darkMode} />
                {/* Interactions */}
                <Switch label="SYNC" value={params.hardSync} options={['OFF', 'ON']} onChange={(v) => updateParam('hardSync', v)} darkMode={darkMode} />
                <Knob label="FM AMT" value={params.fmAmount} onChange={(v) => updateParam('fmAmount', v)} darkMode={darkMode} />
              </div>

              {/* VCO 2 SECTION (Col 9-12) */}
              <div className="col-span-4 flex justify-evenly w-full pl-0.5">
                <Knob label="VCO2 FREQ" value={params.vco2Freq} onChange={(v) => updateParam('vco2Freq', v)} size="lg" darkMode={darkMode} />
                <Switch label="WAVE" value={params.vco2Wave} options={['▲', 'Π']} onChange={(v) => updateParam('vco2Wave', v)} darkMode={darkMode} />
                <Knob label="VCO2 LVL" value={params.vco2Level} onChange={(v) => updateParam('vco2Level', v)} size="sm" darkMode={darkMode} />
                <Knob label="VCO2 EG" value={params.vco2EgAmt} onChange={(v) => updateParam('vco2EgAmt', v)} bipolar darkMode={darkMode} />
              </div>

            </div>

            <div className="grid grid-cols-12 gap-0.5 items-end justify-items-center mt-1">
              <div className="col-span-1">
                <Knob label="NOISE" value={params.noiseLevel} onChange={(v) => updateParam('noiseLevel', v)} size="sm" color="black" darkMode={darkMode} />
              </div>
              <div className="col-span-7 flex justify-evenly w-full bg-black/5 rounded-lg py-1 px-1">
                <div className="w-10"></div>
                <Knob label="CUTOFF" value={params.cutoff} onChange={(v) => updateParam('cutoff', v)} size="lg" darkMode={darkMode} />
                <Knob label="RES" value={params.resonance} onChange={(v) => updateParam('resonance', v)} darkMode={darkMode} />
                <Knob label="EG AMT" value={params.vcfEgAmt} onChange={(v) => updateParam('vcfEgAmt', v)} bipolar darkMode={darkMode} />
                <Knob label="DECAY" value={params.vcfDecay} onChange={(v) => updateParam('vcfDecay', v)} darkMode={darkMode} />
                <Knob label="NOISE MOD" value={params.noiseVcfMod} onChange={(v) => updateParam('noiseVcfMod', v)} darkMode={darkMode} />
              </div>
              <div className="col-span-4 flex justify-evenly w-full pl-1">
                <Knob label="ATTACK" value={params.vcaAttack} onChange={(v) => updateParam('vcaAttack', v)} min={0.001} max={0.4} darkMode={darkMode} />
                <Knob label="DECAY" value={params.vcaDecay} onChange={(v) => updateParam('vcaDecay', v)} darkMode={darkMode} />
                <Knob label="VOLUME" value={params.volume} onChange={(v) => updateParam('volume', v)} size="lg" darkMode={darkMode} />
              </div>
            </div>
          </div>

          <div className={`mt-4 pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-400'} flex flex-col md:flex-row items-center justify-end gap-2`}>
            <div className={`w-full md:w-auto flex items-center justify-between md:justify-end gap-2 md:gap-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-200 border-gray-300'} px-2 py-1.5 rounded-lg shadow-inner border`}>
              <div className="flex items-center gap-1 border-r border-gray-500 pr-1">
                <div className="text-[8px] font-bold text-gray-500 tracking-widest hidden sm:block">BEND</div>
                <Knob label="MIX" value={params.dataBenderMix} onChange={(v) => updateParam('dataBenderMix', v)} size="sm" color="white" darkMode={darkMode} />
                <Knob label="CRSH" value={params.dataBenderCrush} onChange={(v) => updateParam('dataBenderCrush', v)} size="sm" color="white" darkMode={darkMode} />
                <Knob label="DROP" value={params.dataBenderDrop} onChange={(v) => updateParam('dataBenderDrop', v)} size="sm" color="white" darkMode={darkMode} />
                <Knob label="DRIVE" value={params.dataBenderDrive} onChange={(v) => updateParam('dataBenderDrive', v)} size="sm" color="white" darkMode={darkMode} />
                <Knob label="RATE" value={params.dataBenderRate} onChange={(v) => updateParam('dataBenderRate', v)} size="sm" color="white" darkMode={darkMode} />
              </div>
              <div className="flex items-center gap-1 border-r border-gray-500 pr-1">
                <div className="text-[8px] font-bold text-gray-500 tracking-widest hidden sm:block">DELAY</div>
                <Knob label="MIX" value={params.delayWet} onChange={(v) => updateParam('delayWet', v)} size="sm" color="white" darkMode={darkMode} />
                <Knob
                  label="RATE"
                  value={delayValueToKnobPos(params.delayRate)}
                  onChange={handleDelayRateChange}
                  min={0}
                  max={1}
                  size="sm"
                  color="white"
                  darkMode={darkMode}
                  displayFormatter={(v) => `${getNearestDelayDivision(knobPosToDelayValue(v)).label}`}
                />
                <Knob label="FDBK" value={params.delayFdbk} onChange={(v) => updateParam('delayFdbk', v)} size="sm" color="white" darkMode={darkMode} />
                <Knob label="WIDTH" value={params.delayWidth} onChange={(v) => updateParam('delayWidth', v)} size="sm" color="white" darkMode={darkMode} />
              </div>
              <div className="flex items-center gap-1 border-r border-gray-500 pr-1">
                <div className="text-[8px] font-bold text-gray-500 tracking-widest hidden sm:block">REV</div>
                <Knob label="MIX" value={params.reverbMix} onChange={(v) => updateParam('reverbMix', v)} size="sm" color="white" darkMode={darkMode} />
                <Knob label="LEN" value={params.reverbDecay} onChange={(v) => updateParam('reverbDecay', v)} size="sm" color="white" darkMode={darkMode} />
              </div>
              <div className="flex items-center gap-1">
                <div className="text-[8px] font-bold text-gray-500 tracking-widest hidden sm:block">FX</div>
                <Knob label="HPF" value={params.masterHP} onChange={(v) => updateParam('masterHP', v)} size="sm" color="white" darkMode={darkMode} />
                <Knob label="LPF" value={params.masterLP} onChange={(v) => updateParam('masterLP', v)} size="sm" color="white" darkMode={darkMode} />
                <Knob label="GLB RES" value={params.masterRes} onChange={(v) => updateParam('masterRes', v)} size="sm" color="white" darkMode={darkMode} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
