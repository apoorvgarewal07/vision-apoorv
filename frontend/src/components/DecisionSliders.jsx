/**
 * VISION: Interactive Economic Decision Sliders
 * Vital Intelligence for System Integrity, Observation & Nostics
 *
 * Controls:
 * ---------
 * - In-Service Failure Cost (C_f): $10,000 to $500,000
 * - Wasted Useful Life Cost (c_w): $10 to $1,000 per cycle
 * - Maximum Allowable Risk Budget (epsilon): 0.5% to 5.0%
 * - Logistics / Procurement Lead Time: 5 to 30 cycles
 *
 * Automatically derives:
 * - Cost ratio gamma = c_w / C_f
 * - Hazard trigger threshold theta* = gamma / (1 + gamma)
 */

import React from 'react';
import { DollarSign, ShieldAlert, Clock, Sliders, Scale } from 'lucide-react';

export default function DecisionSliders({
  failureCost = 100000,
  onFailureCostChange,
  wastedCostPerCycle = 100,
  onWastedCostChange,
  riskBudget = 0.02,
  onRiskBudgetChange,
  leadTime = 15,
  onLeadTimeChange,
  className = '',
}) {
  const costRatio = wastedCostPerCycle / failureCost;
  const optimalHazardRatio = (costRatio / (1 + costRatio)) * 100;
  
  // Implied trigger RUL margin: higher failure cost requires earlier maintenance dispatch
  const conservativeBufferCycles = Math.round(
    leadTime + (failureCost >= 100000 ? (Math.log(failureCost / 100000) / Math.log(2.5)) * 3 : -Math.min(3, (100000 - failureCost) / 30000))
  );

  return (
    <div className={`bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col ${className}`}>
      <div className="flex flex-wrap items-center justify-between mb-4 border-b border-slate-800 pb-2.5 gap-2">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            Economic Policy Optimization Parameters
          </h3>
        </div>
        <div className="flex items-center space-x-3 text-[11px] font-mono">
          <span className="text-slate-400">
            Cost Ratio &gamma;: <strong className="text-cyan-300">1 : {(failureCost / wastedCostPerCycle).toFixed(0)}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
            &theta;* = {optimalHazardRatio.toFixed(3)}%
          </span>
        </div>
      </div>

      {/* Real-time Optimal Stopping & Trigger Readout Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 font-mono text-xs">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase">Optimal Hazard Rule</span>
          <span className="font-bold text-cyan-300">
            h(t) &ge; {optimalHazardRatio.toFixed(3)}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase">Target Trigger Threshold</span>
          <span className="font-bold text-amber-400">
            LB<sub className="text-[9px]">90%</sub> &le; {conservativeBufferCycles} cycles
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase">Lead-Time Buffer</span>
          <span className="font-bold text-emerald-400">
            +{Math.max(0, conservativeBufferCycles - leadTime)} cycles early margin
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Slider 1: In-Service Failure Cost C_f */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>In-Service Failure Cost (C_f)</span>
            </span>
            <span className="font-mono font-bold text-rose-400">
              ${failureCost.toLocaleString('en-US')}
            </span>
          </div>
          <input
            type="range"
            min="10000"
            max="500000"
            step="5000"
            value={failureCost}
            onChange={(e) => onFailureCostChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>$10k (Minor delay)</span>
            <span>$500k (Catastrophic AOG)</span>
          </div>
        </div>

        {/* Slider 2: Wasted Life Cost c_w */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center space-x-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Wasted Life Cost per Cycle (c_w)</span>
            </span>
            <span className="font-mono font-bold text-emerald-400">
              ${wastedCostPerCycle.toLocaleString('en-US')}/cycle
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="1000"
            step="10"
            value={wastedCostPerCycle}
            onChange={(e) => onWastedCostChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>$10/cyc</span>
            <span>$1,000/cyc</span>
          </div>
        </div>

        {/* Slider 3: Risk Budget (epsilon) */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center space-x-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>Target Max In-Service Failure Rate (&epsilon;)</span>
            </span>
            <span className="font-mono font-bold text-amber-400">
              {(riskBudget * 100).toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min="0.005"
            max="0.05"
            step="0.001"
            value={riskBudget}
            onChange={(e) => onRiskBudgetChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.5% (Ultra-safe)</span>
            <span>5.0% (Risk tolerant)</span>
          </div>
        </div>

        {/* Slider 4: Logistics Lead Time */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Logistics & Spare Lead Time (L)</span>
            </span>
            <span className="font-mono font-bold text-cyan-400">
              {leadTime} cycles
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="30"
            step="1"
            value={leadTime}
            onChange={(e) => onLeadTimeChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>5 cycles (Express parts)</span>
            <span>30 cycles (Supply backlog)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

