import React from 'react';
import { TelemetryTick } from '../types';
import { Layers, HelpCircle } from 'lucide-react';

interface SensorAttributionProps {
  tick: TelemetryTick | null;
}

export const SensorAttribution: React.FC<SensorAttributionProps> = ({ tick }) => {
  // Default attribution ranking if not streaming live attributions
  const defaultAttributions: Record<string, number> = {
    's11 (Ps30 Static Pressure)': 0.28,
    's4 (T50 LPT Outlet Temp)': 0.22,
    's3 (T30 HPC Outlet Temp)': 0.18,
    's12 (Phi Fuel Flow Ratio)': 0.14,
    's15 (Bypass Duct Bleed)': 0.10,
    's2 (T24 LPC Outlet Temp)': 0.08,
  };

  const attributions = tick?.attributions && Object.keys(tick.attributions).length > 0
    ? tick.attributions
    : defaultAttributions;

  const sorted = Object.entries(attributions).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-aerospace-900 border border-aerospace-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-telemetry-cyan" />
            <span>Degradation Attribution (SHAP / Tree-Gini)</span>
          </h3>
          <p className="text-xs text-aerospace-400 mt-0.5">
            Top sensor deviations driving RUL loss in current operating regime
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-aerospace-800 text-aerospace-300 border border-aerospace-700">
          Feature Importance
        </span>
      </div>

      <div className="space-y-3">
        {sorted.map(([sensorName, weight]) => {
          const percent = Math.min(100, Math.round(weight * 100));
          return (
            <div key={sensorName} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-200">{sensorName}</span>
                <span className="text-telemetry-cyan font-semibold">{percent}%</span>
              </div>
              <div className="w-full bg-aerospace-950 rounded-full h-1.5 overflow-hidden border border-aerospace-850">
                <div
                  className="bg-gradient-to-r from-telemetry-blue to-telemetry-cyan h-full rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-aerospace-800 flex items-center justify-between text-[11px] font-mono text-aerospace-500">
        <span>Attribution Method: TreeSHAP Fast Approximation</span>
        <span>Lead window: 30 cycles</span>
      </div>
    </div>
  );
};

