import React from 'react';
import { COMPONENT_METADATA, computeComponentHealth } from '../utils/componentSensorMap.js';
import { ShieldCheck, AlertTriangle, Activity, X, Gauge, Layers, Thermometer } from 'lucide-react';

export const ComponentTooltip = ({
  selectedComponentId,
  onSelectComponent,
  telemetryTick,
  onClose
}) => {
  if (!selectedComponentId) {
    return (
      <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-aerospace-900/90 backdrop-blur-md border border-aerospace-800 rounded-xl p-3.5 shadow-xl pointer-events-auto text-xs font-mono text-aerospace-400">
        <div className="flex items-center gap-2 text-slate-200 font-semibold mb-1">
          <Activity className="w-4 h-4 text-telemetry-cyan animate-pulse" />
          <span>Interactive 3D Inspection Mode</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Click any internal turbofan component (Fan, LPC, HPC, Combustor, HPT, LPT) to isolate subsystem telemetry and thermal stress gradients.
        </p>
      </div>
    );
  }

  const meta = COMPONENT_METADATA[selectedComponentId];
  if (!meta) return null;

  const { score, status, thermalDelta } = computeComponentHealth(selectedComponentId, telemetryTick);
  const sensors = telemetryTick?.sensors || {};

  const getStatusStyle = (s) => {
    if (s.includes('Severe') || s.includes('Borescope')) {
      return { bg: 'bg-rose-950/70 border-rose-500/50 text-rose-300', dot: 'bg-rose-400 animate-ping' };
    }
    if (s.includes('Elevated') || s.includes('Watch')) {
      return { bg: 'bg-amber-950/70 border-amber-500/50 text-amber-300', dot: 'bg-amber-400' };
    }
    return { bg: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300', dot: 'bg-emerald-400' };
  };

  const statusStyle = getStatusStyle(status);

  return (
    <div className="absolute top-4 right-4 w-84 sm:w-96 bg-aerospace-900/95 backdrop-blur-md border border-aerospace-750 rounded-xl p-4 shadow-2xl z-20 pointer-events-auto animate-fadeIn">
      
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-aerospace-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-telemetry-cyan font-semibold">
            {meta.subsystem}
          </span>
          <h3 className="text-sm font-bold text-white tracking-wide mt-0.5">
            {meta.name}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-aerospace-400 hover:text-white p-1 rounded-md hover:bg-aerospace-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Health Score & Status Badge */}
      <div className="my-3 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-aerospace-300">Subsystem Health:</span>
          <span className={`font-bold ${score > 70 ? 'text-telemetry-emerald' : score > 40 ? 'text-telemetry-amber' : 'text-rose-400'}`}>
            {score}%
          </span>
        </div>

        {/* Health bar */}
        <div className="w-full bg-aerospace-950 rounded-full h-1.5 overflow-hidden border border-aerospace-800">
          <div
            className={`h-full transition-all duration-300 ${
              score > 70 ? 'bg-telemetry-emerald' : score > 40 ? 'bg-telemetry-amber' : 'bg-telemetry-rose'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>

        <div className={`mt-2 px-2.5 py-1 rounded-md text-[11px] font-mono border flex items-center gap-2 ${statusStyle.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
          <span className="font-semibold">{status}</span>
        </div>
      </div>

      {/* Real-Time Associated Sensor Array */}
      <div className="mt-3">
        <h4 className="text-[10px] font-mono uppercase tracking-wider text-aerospace-400 mb-2 flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-telemetry-cyan" />
          <span>Real-Time Sensor Readouts</span>
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          {meta.sensors.map((s) => {
            const val = sensors[s.id] !== undefined ? sensors[s.id].toFixed(1) : s.nominal.toFixed(1);
            return (
              <div key={s.id} className="bg-aerospace-950/80 p-2 rounded-lg border border-aerospace-850">
                <div className="text-[10px] text-aerospace-400 truncate">{s.name}</div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-white font-bold">{val}</span>
                  <span className="text-[10px] text-aerospace-500">{s.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Description */}
      <p className="text-[11px] text-aerospace-400 mt-3 pt-2.5 border-t border-aerospace-800 leading-relaxed">
        {meta.description}
      </p>

      {/* Component selector pills */}
      <div className="mt-3 pt-2.5 border-t border-aerospace-800 flex items-center justify-between gap-1 flex-wrap">
        {['fan', 'lpc', 'hpc', 'combustor', 'hpt', 'lpt'].map((id) => (
          <button
            key={id}
            onClick={() => onSelectComponent(id)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition ${
              id === selectedComponentId
                ? 'bg-telemetry-cyan text-white font-bold'
                : 'bg-aerospace-950 text-aerospace-400 hover:text-white border border-aerospace-800'
            }`}
          >
            {id}
          </button>
        ))}
      </div>

    </div>
  );
};
