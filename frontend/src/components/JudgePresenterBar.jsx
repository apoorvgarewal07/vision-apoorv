/**
 * VISION 2.0: Floating Judge & Presentation Bar
 * Vital Intelligence for System Integrity, Observation & Nostics
 *
 * Fast 1-click & keyboard shortcut switching for the 6 presentation scenarios:
 * Press '1' -> Nominal Baseline (Unit #10)
 * Press '2' -> Imminent HPC Failure (Unit #34)
 * Press '3' -> Multi-Regime Dynamic (FD002 Unit #18)
 * Press '4' -> Oil Wear Metal Surge (Unit #42)
 * Press '5' -> Repeated Chronic Defect (Unit #55)
 * Press '6' -> Economic Conformal Optimization ($1.42M Saved)
 */

import React, { useEffect } from 'react';
import { Sliders, HelpCircle, RotateCcw, Activity } from 'lucide-react';
import { DEMO_PRESETS } from '../utils/demoPresets.js';

export default function JudgePresenterBar({
  activeScenario = null,
  onSelectScenario = null,
  onResetDemo = null,
  onOpenIntegrityCard = null,
  className = '',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName)) {
        return;
      }
      const match = DEMO_PRESETS.find((p) => p.key === e.key);
      if (match && onSelectScenario) {
        e.preventDefault();
        onSelectScenario(match);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectScenario]);

  return (
    <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl px-3 py-2 shadow-2xl flex items-center space-x-2 font-mono text-xs select-none max-w-[96vw] overflow-x-auto ${className}`}>
      {/* Label */}
      <div className="flex items-center space-x-1.5 px-2 text-sky-400 font-bold shrink-0 hidden lg:flex">
        <Activity className="w-3.5 h-3.5 text-sky-400" />
        <span className="text-[11px] uppercase tracking-[0.08em]">Demo Scenarios:</span>
      </div>

      {/* 6 Scenario Buttons */}
      <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
        {DEMO_PRESETS.map((preset) => {
          const isActive = activeScenario?.id === preset.id;

          return (
            <button
              key={preset.id}
              onClick={() => onSelectScenario && onSelectScenario(preset)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl transition-all shrink-0 ${
                isActive
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400 font-bold shadow-md shadow-sky-500/10'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
              title={`${preset.title} (Hotkey: ${preset.key})`}
            >
              <span className="w-4 h-4 rounded bg-slate-800 flex items-center justify-center text-[10px] text-sky-400 border border-slate-700 font-bold">
                {preset.key}
              </span>
              <span className="text-[11px] whitespace-nowrap">
                {preset.shortLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Reset Demo Button */}
      {onResetDemo && (
        <button
          onClick={onResetDemo}
          className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors shrink-0"
          title="Reset to default fleet view"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Integrity Card Quick Open */}
      {onOpenIntegrityCard && (
        <button
          onClick={onOpenIntegrityCard}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 text-[11px] transition-colors shrink-0"
          title="View Scientific Integrity & Provenance Disclosure"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline tracking-[0.04em]">Integrity</span>
        </button>
      )}
    </div>
  );
}
