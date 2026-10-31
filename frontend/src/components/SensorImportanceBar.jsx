/**
 * VISION: Sensor Importance & Explainability Bar
 * Vital Intelligence for System Integrity, Observation & Nostics
 *
 * Explains top thermodynamic sensors driving RUL prediction degradation:
 * - Feature contribution percentages (SHAP / GBDT split feature importances)
 * - Direction of effect (+ elevated temp / - pressure loss)
 * - Clear guidance for maintenance crews
 */

import React from 'react';
import { Cpu, ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';

const DEFAULT_IMPORTANCES = [
  { key: 's3', code: 'T30', name: 'HPC Outlet Temperature', weight: 34, dir: 'up', note: 'Thermal degradation driver' },
  { key: 's7', code: 'P30', name: 'HPC Outlet Pressure', weight: 22, dir: 'down', note: 'Compression ratio decline' },
  { key: 's4', code: 'T50', name: 'LPT Outlet Temp (EGT)', weight: 18, dir: 'up', note: 'Exhaust margin degradation' },
  { key: 's11', code: 'Ps30', name: 'HPC Static Pressure', weight: 14, dir: 'down', note: 'Stage 8 pressure drop' },
  { key: 's9', code: 'Nc', name: 'Core Spool Speed', weight: 8, dir: 'up', note: 'N2 governor compensation' },
  { key: 's12', code: 'phi', name: 'Fuel Flow Ratio', weight: 4, dir: 'up', note: 'Combustion ratio shift' },
];

export default function SensorImportanceBar({
  importances = DEFAULT_IMPORTANCES,
  className = '',
}) {
  return (
    <div className={`bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            Degradation Attribution (Explainability)
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400">GBDT Feature Weights</span>
      </div>

      <div className="space-y-2.5">
        {importances.map((item) => {
          const isUp = item.dir === 'up';

          return (
            <div key={item.key} className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 font-mono">
                  <span className="font-bold text-white">{item.code}</span>
                  <span className="text-slate-400 text-[11px] truncate max-w-[140px] sm:max-w-none">
                    ({item.name})
                  </span>
                </div>

                <div className="flex items-center space-x-1 font-mono">
                  {isUp ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span className={`font-bold ${isUp ? 'text-rose-400' : 'text-cyan-400'}`}>
                    {isUp ? '+' : '-'}{item.weight}%
                  </span>
                </div>
              </div>

              {/* Visual Weight Bar */}
              <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isUp
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                  }`}
                  style={{ width: `${item.weight * 2.5}%` }}
                />
              </div>

              <div className="text-[10px] text-slate-500 font-sans">
                {item.note}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

