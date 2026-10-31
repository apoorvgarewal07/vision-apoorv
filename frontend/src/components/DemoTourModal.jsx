/**
 * VISION 2.0: Guided 6-Step Judge & Executive Tour Modal
 * Vital Intelligence for System Integrity, Observation & Nostics
 */

import React, { useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Cpu,
  Layers,
  DollarSign,
  Droplet,
  Network,
  CheckCircle2,
  Activity,
} from 'lucide-react';

export default function DemoTourModal({ isOpen, onClose, onLaunchScenario = null }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      title: '1. Multimodal Airworthiness Fusion Architecture',
      subtitle: 'Moving beyond single-sensor prediction to 8-stream airworthiness intelligence',
      icon: ShieldCheck,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
          <p>
            Traditional PHM systems rely solely on gas-path telemetry numbers, missing critical mechanical degradation.
            VISION 2.0 fuses <strong>8 disparate evidence channels</strong>:
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
            <div className="p-2 rounded bg-slate-950 border border-slate-800">1. Gas-Path Aero Telemetry</div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">2. Oil Spectrography & Viscosity</div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">3. Borescope Optical Grading</div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">4. Chronic Defect Pattern Log</div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">5. Aircraft Subsystems (Hyd/Elec)</div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">6. Flight Hours & Cycles History</div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">7. Environmental Exposure Index</div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">8. Airframe Cumulative Fatigue</div>
          </div>
        </div>
      ),
      actionText: 'View Baseline Scenario',
      scenarioTarget: 1,
    },
    {
      step: 2,
      title: '2. Interactive 3D Digital Twin with Spool Sync',
      subtitle: 'Procedural Three.js WebGL engine with dual spool rotation',
      icon: Cpu,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
          <p>
            Zero external download dependencies. VISION renders an interactive procedural Three.js turbofan
            featuring all 6 aerospace components: <strong>Fan, LPC, HPC, Combustor, HPT, and LPT</strong>.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono text-[11px]">
            <li>N1 Spool (Fan, LPC, LPT) speed dynamically driven by sensor <code className="text-cyan-300">s8 (Nf)</code>.</li>
            <li>N2 Core Spool (HPC, HPT) speed driven by sensor <code className="text-cyan-300">s9 (Nc)</code>.</li>
            <li>Real-time thermal degradation heatmap driven by <code className="text-cyan-300">T30</code> and <code className="text-cyan-300">T50</code>.</li>
            <li>Interactive exploded view, cutaway casing inspection, and component selection.</li>
          </ul>
        </div>
      ),
      actionText: 'Trigger Imminent Failure Demo',
      scenarioTarget: 2,
    },
    {
      step: 3,
      title: '3. Non-Sensor Health: Oil, Borescope & Chronic Defects',
      subtitle: 'Wear element spectrometry, optical blade defect grading, and repeat work orders',
      icon: Droplet,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
          <p>
            Mechanical bearing and blade failure early signatures show up in oil chemistry and optical inspection
            long before gas-path thermodynamic shifts occur:
          </p>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1.5 font-mono">
            <div className="text-amber-400 font-bold">Comprehensive Defect Diagnostic:</div>
            <div className="text-slate-300">
              - Spectrometry tracks Fe, Cu, Cr, Al, Ti ppm wear rates and kinematic viscosity.<br />
              - Borescope module grades thermal barrier coating (TBC) spallation and leading-edge cracks.<br />
              - Chronic Defect Detector automatically flags repeat ATA chapter write-ups across 60 cycles.
            </div>
          </div>
        </div>
      ),
      actionText: 'Inspect Oil Wear Metal Alert',
      scenarioTarget: 4,
    },
    {
      step: 4,
      title: '4. Mondrian Split-Conformal Prediction & Safety Certificate',
      subtitle: 'Distribution-free uncertainty calibration with rigorous finite-sample coverage',
      icon: Layers,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
          <p>
            To handle severe heteroscedasticity across operational regimes, VISION implements 
            <strong> Mondrian Conformal Calibration</strong> with non-asymptotic safety bounds:
          </p>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1 font-mono">
            <div className="font-bold text-emerald-400">Mathematical Safety Certificate:</div>
            <div className="text-slate-300">
              Guarantees coverage: <span className="text-cyan-300">P(RUL &isin; [LB, UB]) &ge; 90%</span>.<br />
              Maintenance triggers on the conservative lower bound (<code className="text-cyan-300">LB90 &le; 15c</code>),
              reducing in-service catastrophic failure rates below 3.8% across 100 engines.
            </div>
          </div>
        </div>
      ),
      actionText: 'View Multi-Regime Demo',
      scenarioTarget: 3,
    },
    {
      step: 5,
      title: '5. Aircraft Systems & Knowledge Graph Diagnostic',
      subtitle: 'Relational entity traversal linking engines, systems, observations, and maintenance',
      icon: Network,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
          <p>
            An isolated anomaly is rarely isolated in aviation. VISION 2.0 constructs a live 
            <strong> Knowledge Graph</strong> connecting:
          </p>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
            <div className="text-indigo-300 font-bold">Relational Traversal:</div>
            <div>Airframe &rarr; Left/Right Turbofans &rarr; 6 Subsystems &rarr; Sensor Telemetry &rarr; Wear Debris Observations &rarr; ATA Work Orders.</div>
            <div className="text-slate-400 mt-1">Enables instantaneous root-cause analysis and fleet-wide defect query propagation.</div>
          </div>
        </div>
      ),
      actionText: 'Review Chronic Defect',
      scenarioTarget: 5,
    },
    {
      step: 6,
      title: '6. Economic Cost Optimization & Hangar Logistics',
      subtitle: '7.76x reduction in discarded engine life and $1.42M annual fleet savings',
      icon: DollarSign,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
          <p>
            Rigid calendar maintenance discards an average of 71.8 cycles of usable life.
            VISION's conformal decision policy optimizes asymmetric costs ($C_{fail}=\$500k$ vs $C_{waste}=\$25k$):
          </p>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1 font-mono">
            <div className="font-bold text-emerald-400">Fleet Logistics Optimization:</div>
            <div className="text-slate-300">
              - Reduces discarded engine life to 9.25 cycles (7.76x efficiency improvement).<br />
              - Automated 60-cycle Gantt scheduling into Hangar Bays A, B, and C prevents overhaul bottlenecks.
            </div>
          </div>
        </div>
      ),
      actionText: 'Explore Economic Sandbox',
      scenarioTarget: 6,
    },
  ];

  const current = steps[currentStep];
  const StepIcon = current.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAction = () => {
    if (onLaunchScenario && current.scenarioTarget) {
      onLaunchScenario(current.scenarioTarget);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-[0.08em] text-slate-200">
              VISION 2.0 Tour &bull; Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start space-x-3.5">
            <div className={`p-2.5 rounded-xl border shrink-0 ${current.color}`}>
              <StepIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">{current.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{current.subtitle}</p>
            </div>
          </div>

          <div className="pt-2">{current.content}</div>
        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentStep ? 'w-5 bg-sky-400' : 'bg-slate-700 hover:bg-slate-600'
                }`}
                title={`Jump to step ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleAction}
              className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-300 text-xs font-mono font-semibold transition-colors"
            >
              {current.actionText}
            </button>
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`p-1.5 rounded-xl border text-slate-300 transition-colors ${
                currentStep === 0
                  ? 'opacity-30 cursor-not-allowed border-slate-800 bg-slate-900'
                  : 'border-slate-700 bg-slate-800 hover:bg-slate-700'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center space-x-1 transition-colors shadow-md shadow-sky-600/20"
            >
              <span>{currentStep === steps.length - 1 ? 'Finish Tour' : 'Next'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
