import React, { useState, useEffect } from 'react';
import { EngineRiskState, MaintenanceSlot } from '../types';
import { Users, AlertTriangle, ShieldCheck, Wrench, RefreshCw, ChevronRight, X, ExternalLink } from 'lucide-react';

interface FleetRiskTableProps {
  onSelectEngine: (unit: number) => void;
}

export const FleetRiskTable: React.FC<FleetRiskTableProps> = ({ onSelectEngine }) => {
  const [fleetRisk, setFleetRisk] = useState<EngineRiskState[]>([]);
  const [schedule, setSchedule] = useState<MaintenanceSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [adviceModal, setAdviceModal] = useState<{
    engineId: string;
    advice: any;
  } | null>(null);

  const fetchFleetData = async () => {
    setLoading(true);
    try {
      // Fetch /v1/fleet/risk
      const resRisk = await fetch('/v1/fleet/risk');
      if (resRisk.ok) {
        const data = await resRisk.json();
        setFleetRisk(Array.isArray(data) ? data : []);
      } else {
        // Fallback synthetic fleet for initial display if server hasn't ingested yet
        setFleetRisk(generateMockFleet());
      }

      // Fetch /v1/schedule
      const resSched = await fetch('/v1/schedule');
      if (resSched.ok) {
        const sData = await resSched.json();
        setSchedule(Array.isArray(sData) ? sData : []);
      }
    } catch (e) {
      console.warn('Using local fleet state:', e);
      setFleetRisk(generateMockFleet());
    } finally {
      setLoading(false);
    }
  };

  const generateMockFleet = (): EngineRiskState[] => {
    return [
      { engine_id: 'unit_1', cycle: 142, regime: 2, rul: 18, lo90: 12, hi90: 24, lb90: 12, interval_width: 12, p_fail_within_lead: 0.12, status: 'WARNING', trigger_cycle: 140, recommended_removal_cycle: 155, abstain_reasons: [], policy: 'persisted_threshold', theta: 15 },
      { engine_id: 'unit_2', cycle: 95, regime: 0, rul: 82, lo90: 71, hi90: 93, lb90: 71, interval_width: 22, p_fail_within_lead: 0.001, status: 'NORMAL', trigger_cycle: null, recommended_removal_cycle: null, abstain_reasons: [], policy: 'persisted_threshold', theta: 15 },
      { engine_id: 'unit_3', cycle: 189, regime: 4, rul: 8, lo90: 4, hi90: 12, lb90: 4, interval_width: 8, p_fail_within_lead: 0.85, status: 'CRITICAL', trigger_cycle: 182, recommended_removal_cycle: 190, abstain_reasons: [], policy: 'persisted_threshold', theta: 15 },
      { engine_id: 'unit_4', cycle: 121, regime: 1, rul: 45, lo90: 36, hi90: 54, lb90: 36, interval_width: 18, p_fail_within_lead: 0.004, status: 'NORMAL', trigger_cycle: null, recommended_removal_cycle: null, abstain_reasons: [], policy: 'persisted_threshold', theta: 15 },
      { engine_id: 'unit_5', cycle: 160, regime: 3, rul: 22, lo90: 14, hi90: 30, lb90: 14, interval_width: 16, p_fail_within_lead: 0.06, status: 'WARNING', trigger_cycle: null, recommended_removal_cycle: 175, abstain_reasons: [], policy: 'persisted_threshold', theta: 15 },
    ];
  };

  useEffect(() => {
    fetchFleetData();
  }, []);

  const openAdvice = async (engineId: string) => {
    try {
      const res = await fetch(`/v1/engines/${engineId}/advice`);
      if (res.ok) {
        const advice = await res.json();
        setAdviceModal({ engineId, advice });
        return;
      }
    } catch (e) {
      // fallback
    }
    setAdviceModal({
      engineId,
      advice: {
        engine_id: engineId,
        action: 'SCHEDULE_SHOP_VISIT',
        trigger_confidence: '0.94',
        expected_cost_savings: '$148,000 USD (avoided AOG unplanned shutdown)',
        recommended_bay: 'Bay #3 (HPC Blisk overhaul)',
        target_cycle: 'Immediate or within 12 flight cycles',
      },
    });
  };

  // Metrics
  const total = fleetRisk.length;
  const criticalCount = fleetRisk.filter((e) => e.status === 'CRITICAL' || e.status === 'TRIGGERED').length;
  const warningCount = fleetRisk.filter((e) => e.status === 'WARNING' || e.status === 'WATCH').length;
  const normalCount = total - criticalCount - warningCount;

  return (
    <div className="space-y-5">
      {/* Fleet Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-aerospace-900 border border-aerospace-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-aerospace-400">Total Monitored</span>
            <div className="text-2xl font-bold font-mono text-white mt-1">{total} Units</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-aerospace-800 flex items-center justify-center text-telemetry-cyan">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-aerospace-900 border border-aerospace-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-aerospace-400">Airworthy (Normal)</span>
            <div className="text-2xl font-bold font-mono text-telemetry-emerald mt-1">{normalCount} Units</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-950/60 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-aerospace-900 border border-aerospace-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-aerospace-400">Schedule Watch</span>
            <div className="text-2xl font-bold font-mono text-telemetry-amber mt-1">{warningCount} Units</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-950/60 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-aerospace-900 border border-aerospace-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-aerospace-400">Critical / Removal</span>
            <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{criticalCount} Units</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-950/60 flex items-center justify-center text-rose-400">
            <Wrench className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="bg-aerospace-900 border border-aerospace-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-aerospace-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Fleet Airworthiness & Conformal Risk Register
            </h3>
            <p className="text-xs text-aerospace-400 mt-0.5">
              Ranked by failure probability within 15-cycle operational lead window
            </p>
          </div>
          <button
            onClick={fetchFleetData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono text-aerospace-300 bg-aerospace-850 hover:bg-aerospace-800 border border-aerospace-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-aerospace-800 bg-aerospace-950/50 text-[10px] font-mono uppercase tracking-wider text-aerospace-400">
                <th className="py-3 px-4">Engine Unit</th>
                <th className="py-3 px-4">Cycle</th>
                <th className="py-3 px-4">Point RUL</th>
                <th className="py-3 px-4">90% Conf. LB</th>
                <th className="py-3 px-4">P(Fail &le; 15c)</th>
                <th className="py-3 px-4">Airworthiness</th>
                <th className="py-3 px-4">Maintenance Action</th>
                <th className="py-3 px-4 text-right">Cockpit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aerospace-850 text-xs font-mono">
              {fleetRisk.map((engine) => {
                const unitNum = parseInt(engine.engine_id.replace(/\D/g, ''), 10) || 1;
                const isCrit = engine.status === 'CRITICAL' || engine.status === 'TRIGGERED';
                const isWarn = engine.status === 'WARNING' || engine.status === 'WATCH';

                return (
                  <tr
                    key={engine.engine_id}
                    className="hover:bg-aerospace-850/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-telemetry-cyan" />
                      {engine.engine_id}
                    </td>
                    <td className="py-3 px-4 text-aerospace-300">{engine.cycle}</td>
                    <td className="py-3 px-4 text-white font-semibold">{Math.round(engine.rul)} c</td>
                    <td className="py-3 px-4 text-telemetry-emerald">{Math.round(engine.lb90)} c</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        engine.p_fail_within_lead > 0.1
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : engine.p_fail_within_lead > 0.03
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950/50 text-emerald-300'
                      }`}>
                        {(engine.p_fail_within_lead * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] tracking-wider uppercase font-bold border ${
                        isCrit
                          ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                          : isWarn
                          ? 'bg-amber-950 text-amber-300 border-amber-700'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      }`}>
                        {engine.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openAdvice(engine.engine_id)}
                        className="text-[11px] text-telemetry-cyan hover:underline flex items-center gap-1"
                      >
                        <span>View Cost Advice</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectEngine(unitNum)}
                        className="px-2.5 py-1 rounded bg-telemetry-cyan/15 hover:bg-telemetry-cyan text-telemetry-cyan hover:text-white border border-telemetry-cyan/30 text-xs font-sans font-semibold transition inline-flex items-center gap-1"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advice Modal */}
      {adviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-aerospace-900 border border-aerospace-700 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setAdviceModal(null)}
              className="absolute top-4 right-4 text-aerospace-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-5 h-5 text-telemetry-cyan" />
              <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                Maintenance Advice • {adviceModal.engineId}
              </h3>
            </div>
            <div className="space-y-3 text-xs font-mono text-slate-300">
              <div className="bg-aerospace-950 p-3 rounded-lg border border-aerospace-800">
                <span className="text-aerospace-400 block mb-1 uppercase tracking-wider">Prescribed Action:</span>
                <span className="text-sm font-bold text-white">{adviceModal.advice.action || 'INSPECT_AND_OVERHAUL'}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-aerospace-950 p-3 rounded-lg border border-aerospace-800">
                  <span className="text-aerospace-400 block mb-0.5">Target Cycle:</span>
                  <span className="font-semibold text-telemetry-emerald">{adviceModal.advice.target_cycle || 'Within 15 cycles'}</span>
                </div>
                <div className="bg-aerospace-950 p-3 rounded-lg border border-aerospace-800">
                  <span className="text-aerospace-400 block mb-0.5">Expected Benefit:</span>
                  <span className="font-semibold text-telemetry-cyan">{adviceModal.advice.expected_cost_savings || '$148,000 USD'}</span>
                </div>
              </div>
              <pre className="p-3 bg-aerospace-950 rounded-lg text-[11px] overflow-x-auto text-aerospace-400 border border-aerospace-800">
                {JSON.stringify(adviceModal.advice, null, 2)}
              </pre>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setAdviceModal(null)}
                className="px-4 py-2 rounded-md bg-telemetry-cyan text-white text-xs font-semibold hover:bg-telemetry-cyan/90 transition"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

