/**
 * VISION: Interactive Economic Sandbox & Maintenance Planner
 * Vital Intelligence for System Integrity, Observation & Nostics
 *
 * Integrates:
 * -----------
 * - Parameter Decision Sliders (Failure Cost C_f, Wasted Life c_w, Risk Budget epsilon, Lead Time)
 * - Dynamic 3-Policy Comparison Table (Fixed vs Naive vs VISION Conformal)
 * - 60-Cycle Hangar Bay Gantt Timeline Scheduler
 */

import React, { useState } from 'react';
import DecisionSliders from './DecisionSliders.jsx';
import PolicyComparisonTable from './PolicyComparisonTable.jsx';
import HangarScheduler from './HangarScheduler.jsx';
import { DollarSign, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export default function EconomicSandbox({
  fleet = [],
  onSelectUnit = null,
  className = '',
}) {
  const [failureCost, setFailureCost] = useState(100000);
  const [wastedCostPerCycle, setWastedCostPerCycle] = useState(100);
  const [riskBudget, setRiskBudget] = useState(0.02);
  const [leadTime, setLeadTime] = useState(15);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overview Banner */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
              <span>Predictive Maintenance Decision & Economic Sandbox</span>
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Simulate operational trade-offs, calibrate risk tolerances, and eliminate hangar bay contention.
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center space-x-2">
          <span className="text-emerald-400 font-bold">Optimal Stopping Rule:</span>
          <span>&theta;* = &gamma; / (1 + &gamma;)</span>
        </div>
      </div>

      {/* Decision Parameter Sliders */}
      <DecisionSliders
        failureCost={failureCost}
        onFailureCostChange={setFailureCost}
        wastedCostPerCycle={wastedCostPerCycle}
        onWastedCostChange={setWastedCostPerCycle}
        riskBudget={riskBudget}
        onRiskBudgetChange={setRiskBudget}
        leadTime={leadTime}
        onLeadTimeChange={setLeadTime}
      />

      {/* Backtested Policy Comparison Table */}
      <PolicyComparisonTable
        failureCost={failureCost}
        wastedCostPerCycle={wastedCostPerCycle}
        riskBudget={riskBudget}
        leadTime={leadTime}
      />

      {/* 60-Cycle Hangar Bay Predictive Gantt Chart */}
      <HangarScheduler
        fleet={fleet}
        leadTime={leadTime}
        onSelectUnit={onSelectUnit}
      />
    </div>
  );
}

