import React from 'react';
import { TelemetryTick, AirworthinessStatus } from '../types';
import { Gauge, ShieldAlert, Cpu, Activity, Clock, AlertTriangle } from 'lucide-react';

interface KpiDeckProps {
  tick: TelemetryTick | null;
}

export const KpiDeck: React.FC<KpiDeckProps> = ({ tick }) => {
  if (!tick) {
    return (
      <div className="bg-aerospace-900 border border-aerospace-800 rounded-xl p-8 text-center animate-pulse">
        <Activity className="w-8 h-8 text-aerospace-600 mx-auto mb-2 animate-spin" />
        <p className="text-xs font-mono uppercase tracking-widest text-aerospace-400">
          Awaiting Engine Telemetry Stream...
        </p>
      </div>
    );
  }

  const rul = Math.max(0, Math.round(tick.point_rul));
  const lb90 = Math.max(0, Math.round(tick.lower_bound_90));
  const lb95 = Math.max(0, Math.round(tick.lower_bound_95));
  const healthPercent = Math.max(0, Math.min(100, Math.round(tick.health_index * 100)));

  const getStatusBadge = (status: AirworthinessStatus, abstain: boolean) => {
    if (abstain || status === 'ABSTAIN') {
      return {
        label: 'ABSTAIN (TRUST ENVELOPE)',
        bg: 'bg-purple-950/60 border-purple-500/40 text-purple-300',
        dot: 'bg-purple-400 animate-pulse',
      };
    }
    switch (status) {
      case 'NORMAL':
      case 'OK':
        return {
          label: 'AIRWORTHY - NORMAL',
          bg: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300',
          dot: 'bg-emerald-400',
        };
      case 'WARNING':
      case 'WATCH':
        return {
          label: 'SCHEDULE NOTICE - WARNING',
          bg: 'bg-amber-950/60 border-amber-500/40 text-amber-300',
          dot: 'bg-amber-400',
        };
      case 'CRITICAL':
      case 'TRIGGERED':
        return {
          label: 'REMOVAL TRIGGERED - CRITICAL',
          bg: 'bg-rose-950/80 border-rose-500/60 text-rose-200 animate-pulse',
          dot: 'bg-rose-400 animate-ping',
        };
      default:
        return {
          label: status,
          bg: 'bg-aerospace-800 border-aerospace-700 text-slate-300',
          dot: 'bg-slate-400',
        };
    }
  };

  const statusMeta = getStatusBadge(tick.status, tick.abstain);

  return (
    <div className="space-y-4">
      {/* Top Banner: Status & Cycle */}
      <div className="bg-aerospace-900 border border-aerospace-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-aerospace-400">Unit</span>
            <span className="text-base font-bold font-mono text-white">#{tick.unit}</span>
          </div>
          <span className="text-aerospace-700">•</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-aerospace-400">Cycle</span>
            <span className="text-base font-bold font-mono text-telemetry-cyan">{tick.cycle}</span>
          </div>
          {tick.operational_settings && tick.operational_settings.length >= 3 && (
            <>
              <span className="text-aerospace-700 hidden sm:inline">•</span>
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-aerospace-400">
                <span>Alt: {tick.operational_settings[0].toFixed(2)}</span>
                <span>Mach: {tick.operational_settings[1].toFixed(2)}</span>
                <span>TRA: {tick.operational_settings[2].toFixed(1)}°</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-md text-xs font-mono tracking-wider font-semibold border flex items-center gap-2 ${statusMeta.bg}`}>
            <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
            <span>{statusMeta.label}</span>
          </div>
        </div>
      </div>

      {/* Abstention Warning Banner if any */}
      {tick.abstain && tick.reasons && tick.reasons.length > 0 && (
        <div className="bg-rose-950/40 border border-rose-500/50 rounded-lg p-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-rose-300 uppercase tracking-wider">
              Safety Abstention Active (Model Output Gated)
            </h4>
            <ul className="text-xs text-rose-200/90 mt-1 list-disc list-inside space-y-0.5 font-mono">
              {tick.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Point RUL */}
        <div className="bg-aerospace-900 border border-aerospace-800 rounded-xl p-4 flex flex-col justify-between shadow">
          <div className="flex items-center justify-between text-aerospace-400 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider">Point RUL</span>
            <Clock className="w-4 h-4 text-telemetry-cyan" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono tracking-tight text-white">{rul}</span>
            <span className="text-xs font-mono text-aerospace-400 uppercase">cycles</span>
          </div>
          <p className="text-[11px] text-aerospace-400 mt-2">
            LightGBM Asymmetric Huber estimate
          </p>
        </div>

        {/* Mondrian Conformal Lower Bound 90% */}
        <div className="bg-aerospace-900 border border-aerospace-800 rounded-xl p-4 flex flex-col justify-between shadow">
          <div className="flex items-center justify-between text-aerospace-400 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider">90% Conf. LB</span>
            <ShieldAlert className="w-4 h-4 text-telemetry-emerald" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono tracking-tight text-telemetry-emerald">{lb90}</span>
            <span className="text-xs font-mono text-aerospace-400 uppercase">cycles</span>
          </div>
          <p className="text-[11px] text-aerospace-400 mt-2">
            P(RUL &ge; {lb90}) &ge; 90% (Mondrian nonconformity)
          </p>
        </div>

        {/* Mondrian Conformal Lower Bound 95% */}
        <div className="bg-aerospace-900 border border-aerospace-800 rounded-xl p-4 flex flex-col justify-between shadow">
          <div className="flex items-center justify-between text-aerospace-400 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider">95% Conf. LB</span>
            <Gauge className="w-4 h-4 text-telemetry-blue" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono tracking-tight text-telemetry-blue">{lb95}</span>
            <span className="text-xs font-mono text-aerospace-400 uppercase">cycles</span>
          </div>
          <p className="text-[11px] text-aerospace-400 mt-2">
            Safety Floor (High-criticality dispatch)
          </p>
        </div>

        {/* Monotonic Health Index */}
        <div className="bg-aerospace-900 border border-aerospace-800 rounded-xl p-4 flex flex-col justify-between shadow">
          <div className="flex items-center justify-between text-aerospace-400 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider">Health Index</span>
            <Activity className="w-4 h-4 text-telemetry-amber" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono tracking-tight text-white">{healthPercent}%</span>
            <span className="text-xs font-mono text-aerospace-400">{tick.health_index.toFixed(3)}</span>
          </div>
          {/* Monotonic decay bar */}
          <div className="w-full bg-aerospace-950 rounded-full h-2 mt-2 overflow-hidden border border-aerospace-800">
            <div
              className={`h-full transition-all duration-300 ${
                healthPercent > 50
                  ? 'bg-telemetry-emerald'
                  : healthPercent > 25
                  ? 'bg-telemetry-amber'
                  : 'bg-telemetry-rose'
              }`}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

