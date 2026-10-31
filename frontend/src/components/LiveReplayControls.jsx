/**
 * VISION: Live Telemetry Replay Floating Transport Controls
 * Vital Intelligence for System Integrity, Observation & Nostics
 *
 * Controls real-time SSE streaming replay:
 * - Play / Pause / Reconnect toggle
 * - Playback speed multiplier (0.5x, 1x, 2x, 5x)
 * - Critical alert banner when an engine hits LB90% <= 15 cycles
 * - Live cycle counter and active stream indicator
 */

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Radio,
  AlertTriangle,
  Zap,
  Activity,
  StepForward,
} from 'lucide-react';

export default function LiveReplayControls({
  isStreaming = false,
  onToggleStream = null,
  onStepNextCycle = null,
  speed = 1.0,
  onSpeedChange = null,
  onResetStream = null,
  lastEvent = null,
  className = '',
}) {
  const [criticalTriggerAlert, setCriticalTriggerAlert] = useState(null);

  // Monitor incoming stream events for critical maintenance triggers
  useEffect(() => {
    if (lastEvent && lastEvent.trigger_fired) {
      setCriticalTriggerAlert({
        unitId: lastEvent.unit_id,
        cycle: lastEvent.cycle,
        rul: lastEvent.rul_prediction,
        lb: lastEvent.conformal_lower_90,
      });

      // Auto dismiss after 6 seconds
      const timer = setTimeout(() => {
        setCriticalTriggerAlert(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [lastEvent]);

  const speedOptions = [0.5, 1.0, 2.0, 5.0];

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Critical Maintenance Trigger Popup Banner */}
      {criticalTriggerAlert && (
        <div className="bg-rose-950/90 border border-rose-500/80 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between text-white animate-bounce">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-600 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-white animate-spin" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold uppercase text-rose-300">
                CRITICAL TRIGGER: Overhaul Dispatched
              </div>
              <div className="text-sm font-extrabold text-white">
                Engine Unit #{criticalTriggerAlert.unitId} &bull; Cycle {criticalTriggerAlert.cycle}
              </div>
              <div className="text-[11px] text-rose-200 font-mono">
                LB90% = {criticalTriggerAlert.lb}c &le; 15c Lead Time (Point RUL: {criticalTriggerAlert.rul}c)
              </div>
            </div>
          </div>
          <button
            onClick={() => setCriticalTriggerAlert(null)}
            className="text-xs font-mono px-3 py-1 bg-rose-800 hover:bg-rose-700 rounded-lg"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Main Transport Ribbon */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        {/* Stream Status & Active Unit */}
        <div className="flex items-center space-x-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isStreaming ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
            }`}
          />
          <div>
            <div className="flex items-center space-x-2">
              <Radio className={`w-4 h-4 ${isStreaming ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="text-xs font-mono font-bold text-white uppercase">
                {isStreaming ? 'Live Replay Streaming' : 'Replay Paused'}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                SSE
              </span>
            </div>
            {lastEvent && (
              <div className="text-[11px] font-mono text-slate-400">
                Active Tick: Unit <strong>#{lastEvent.unit_id}</strong> &bull; Cycle{' '}
                <strong>{lastEvent.cycle}</strong> &bull; RUL: <strong>{lastEvent.rul_prediction}c</strong>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Play / Pause Toggle Button */}
          <button
            onClick={onToggleStream}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all shadow-md ${
              isStreaming
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
            }`}
          >
            {isStreaming ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause Replay</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Start Live Stream</span>
              </>
            )}
          </button>

          {/* Step Next Cycle Button */}
          {onStepNextCycle && (
            <button
              onClick={onStepNextCycle}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
              title="Step Next Flight Cycle"
            >
              <StepForward className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Step Next</span>
            </button>
          )}

          {/* Speed Selector Buttons */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            {speedOptions.map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange && onSpeedChange(s)}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  speed === s
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Reset Replay Button */}
          {onResetStream && (
            <button
              onClick={onResetStream}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Reset Replay to Cycle 0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

