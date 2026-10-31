import React from 'react';
import { TelemetryTick } from '../types';
import { Flame, Wind, Gauge, Activity, AlertCircle } from 'lucide-react';

interface GasPathPanelProps {
  tick: TelemetryTick | null;
}

export const GasPathPanel: React.FC<GasPathPanelProps> = ({ tick }) => {
  if (!tick) return null;

  const thermo = tick.thermodynamics || {};
  const t30_t24_ratio = thermo.T30_T24_ratio ?? (tick.sensors && tick.sensors['s3'] && tick.sensors['s2'] ? tick.sensors['s3'] / tick.sensors['s2'] : 2.45);
  const ps30_p30_ratio = thermo.Ps30_P30_ratio ?? (tick.sensors && tick.sensors['s11'] && tick.sensors['s8'] ? tick.sensors['s11'] / tick.sensors['s8'] : 0.86);
  const t30_delta = thermo.T30_T24_delta ?? 0.042;
  const ps30_delta = thermo.Ps30_P30_delta ?? -0.018;

  // Selected key gas-path sensors
  const gasSensors = [
    { id: 's2', name: 'T24 (LPC Outlet Temp)', unit: '°R', nominal: 642.0 },
    { id: 's3', name: 'T30 (HPC Outlet Temp)', unit: '°R', nominal: 1588.0 },
    { id: 's4', name: 'T50 (LPT Outlet Temp)', unit: '°R', nominal: 1405.0 },
    { id: 's7', name: 'P30 (HPC Outlet Press)', unit: 'psia', nominal: 553.0 },
    { id: 's8', name: 'Nf (Fan Speed)', unit: 'rpm', nominal: 2388.0 },
    { id: 's9', name: 'Nc (Core Speed)', unit: 'rpm', nominal: 9050.0 },
    { id: 's11', name: 'Ps30 (Static Pressure)', unit: 'psia', nominal: 47.5 },
    { id: 's12', name: 'Phi (Fuel/Air Ratio)', unit: 'pps/psi', nominal: 521.0 },
  ];

  return (
    <div className="bg-aerospace-900 border border-aerospace-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Gas-Path Thermodynamic Diagnostics</span>
          </h3>
          <p className="text-xs text-aerospace-400 mt-0.5">
            Physics-grounded aero-thermal ratios & compressor/turbine state indicators
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-aerospace-800 text-aerospace-300 border border-aerospace-700">
          Aero-Thermal Model
        </span>
      </div>

      {/* Primary Gas-Path Ratios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        
        {/* HPC Temp Ratio */}
        <div className="bg-aerospace-950 border border-aerospace-800 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-aerospace-400">
              <span className="text-xs font-mono uppercase tracking-wider">HPC Temp Ratio (T30 / T24)</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-white">{t30_t24_ratio.toFixed(4)}</span>
              <span className={`text-xs font-mono font-medium ${t30_delta >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {t30_delta >= 0 ? `+${t30_delta.toFixed(4)}` : t30_delta.toFixed(4)} Δ
              </span>
            </div>
            <p className="text-[11px] text-aerospace-500 mt-1">
              High-Pressure Compressor thermodynamic heat buildup
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        {/* Static-to-Total Pressure Ratio */}
        <div className="bg-aerospace-950 border border-aerospace-800 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-aerospace-400">
              <span className="text-xs font-mono uppercase tracking-wider">Combustor Static/Total (Ps30 / P30)</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-white">{ps30_p30_ratio.toFixed(4)}</span>
              <span className={`text-xs font-mono font-medium ${Math.abs(ps30_delta) > 0.05 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {ps30_delta >= 0 ? `+${ps30_delta.toFixed(4)}` : ps30_delta.toFixed(4)} Δ
              </span>
            </div>
            <p className="text-[11px] text-aerospace-500 mt-1">
              Burner entrance aerodynamic expansion ratio
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-telemetry-cyan/10 border border-telemetry-cyan/20 flex items-center justify-center text-telemetry-cyan">
            <Wind className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Sensor Array Telemetry Matrix */}
      <div>
        <h4 className="text-xs font-mono uppercase tracking-wider text-aerospace-400 mb-2.5">
          Gas-Path Sensor Matrix
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {gasSensors.map((s) => {
            const val = tick.sensors ? tick.sensors[s.id] : undefined;
            const displayVal = val !== undefined ? val.toFixed(1) : s.nominal.toFixed(1);
            return (
              <div
                key={s.id}
                className="bg-aerospace-950/70 border border-aerospace-850 rounded-md p-2.5 hover:border-aerospace-700 transition-colors"
              >
                <div className="text-[10px] font-mono text-aerospace-400 truncate">{s.name}</div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-bold font-mono text-white">{displayVal}</span>
                  <span className="text-[10px] font-mono text-aerospace-500">{s.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

