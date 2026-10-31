import React from 'react';
import { COMPONENT_METADATA, computeComponentHealth } from '../utils/componentSensorMap.js';
import { ChevronRight, ShieldCheck, AlertTriangle, Activity } from 'lucide-react';

export const ComponentCardsGrid = ({ selectedComponentId, onSelectComponent, telemetryTick }) => {
  const components = Object.keys(COMPONENT_METADATA);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-telemetry-cyan" />
            <span>Component-Specific Inspection & Subsystem Telemetry</span>
          </h3>
          <p className="text-xs text-aerospace-400 mt-0.5">
            Click any section below to smoothly focus camera and isolate aerodynamic stage parameters
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-aerospace-800 text-aerospace-300 border border-aerospace-700">
          6 Modules Monitored
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {components.map((id) => {
          const meta = COMPONENT_METADATA[id];
          const isSelected = id === selectedComponentId;
          const { score, status } = computeComponentHealth(id, telemetryTick);
          const sensors = telemetryTick?.sensors || {};

          const isCritical = status.includes('Severe') || status.includes('Borescope');
          const isWarning = status.includes('Elevated') || status.includes('Watch');

          return (
            <div
              key={id}
              onClick={() => onSelectComponent(id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-aerospace-850 border-telemetry-cyan shadow-lg shadow-telemetry-cyan/15 ring-1 ring-telemetry-cyan'
                  : 'bg-aerospace-900 border-aerospace-800 hover:border-aerospace-700 hover:bg-aerospace-850/60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-telemetry-cyan font-semibold">
                    {meta.subsystem}
                  </span>
                  <h4 className="text-xs font-bold text-white font-mono mt-0.5 truncate max-w-[190px]">
                    {meta.name}
                  </h4>
                </div>
                <span className={`text-xs font-mono font-bold ${
                  score > 70 ? 'text-telemetry-emerald' : score > 40 ? 'text-telemetry-amber' : 'text-rose-400'
                }`}>
                  {score}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-aerospace-950 rounded-full h-1 mt-2 overflow-hidden border border-aerospace-850">
                <div
                  className={`h-full transition-all duration-300 ${
                    score > 70 ? 'bg-telemetry-emerald' : score > 40 ? 'bg-telemetry-amber' : 'bg-telemetry-rose'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>

              {/* Sensors summary */}
              <div className="mt-2.5 pt-2 border-t border-aerospace-800/80 flex items-center justify-between text-[11px] font-mono">
                <span className="text-aerospace-400">
                  {meta.sensors[0]?.name.split(' ')[0]}:{' '}
                  <span className="text-slate-200 font-semibold">
                    {sensors[meta.sensors[0]?.id] !== undefined
                      ? sensors[meta.sensors[0]?.id].toFixed(1)
                      : meta.sensors[0]?.nominal.toFixed(1)}
                  </span>
                </span>
                <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                  isCritical
                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                    : isWarning
                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                    : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                }`}>
                  {isCritical ? 'Critical' : isWarning ? 'Warning' : 'Airworthy'}
                </span>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

