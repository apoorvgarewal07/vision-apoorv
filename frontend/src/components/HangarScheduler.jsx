/**
 * VISION: Hangar Maintenance Slot Scheduler (Gantt View)
 * Vital Intelligence for System Integrity, Observation & Nostics
 *
 * Automatically schedules fleet engines into 3 maintenance hangar bays over
 * the next 60 cycles to avoid bay contention and prevent AOG groundings.
 * Prioritizes engines with LB90% <= Lead Time (15 cycles).
 */

import React, { useMemo } from 'react';
import { Calendar, Wrench, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function HangarScheduler({
  fleet = [],
  leadTime = 15,
  onSelectUnit = null,
  className = '',
}) {
  const bays = [
    { id: 'bay_1', name: 'Hangar Bay Alpha', capability: 'Heavy Overhaul / Rotor Replacement', color: 'border-cyan-500/40 bg-cyan-950/20' },
    { id: 'bay_2', name: 'Hangar Bay Bravo', capability: 'Hot-Gas Path & Borescope Inspection', color: 'border-blue-500/40 bg-blue-950/20' },
    { id: 'bay_3', name: 'Hangar Bay Charlie', capability: 'Compressor & Quick Spool Turnaround', color: 'border-indigo-500/40 bg-indigo-950/20' },
  ];

  // Schedule algorithm: Sort urgent engines first and place into bays
  const scheduledBays = useMemo(() => {
    // Filter engines that need maintenance within 60 cycles
    const candidateEngines = [...fleet]
      .filter((e) => (e.predicted_rul < 65 || e.conformal_lower_90 <= leadTime))
      .sort((a, b) => {
        // Priority 1: Lower bound <= leadTime
        const aTriggered = (a.conformal_lower_90 || a.predicted_rul - 12) <= leadTime;
        const bTriggered = (b.conformal_lower_90 || b.predicted_rul - 12) <= leadTime;
        if (aTriggered && !bTriggered) return -1;
        if (!aTriggered && bTriggered) return 1;
        return (a.predicted_rul || 100) - (b.predicted_rul || 100);
      });

    // Allocate engines into 3 bays sequentially without overlapping overhaul windows (each overhaul = 8 cycles)
    const baySchedules = { bay_1: [], bay_2: [], bay_3: [] };
    const bayNextAvailable = { bay_1: 0, bay_2: 0, bay_3: 0 };
    const overhaulDuration = 8; // cycles required for maintenance

    candidateEngines.slice(0, 15).forEach((engine) => {
      // Find bay with earliest availability
      let bestBay = 'bay_1';
      let earliestTime = bayNextAvailable.bay_1;

      for (const b of ['bay_2', 'bay_3']) {
        if (bayNextAvailable[b] < earliestTime) {
          bestBay = b;
          earliestTime = bayNextAvailable[b];
        }
      }

      // Schedule arrival around predicted RUL or immediate if critical
      const targetArrival = Math.max(0, Math.round((engine.conformal_lower_90 || engine.predicted_rul - 10) - 4));
      const startCycle = Math.max(targetArrival, bayNextAvailable[bestBay]);
      const endCycle = Math.min(60, startCycle + overhaulDuration);

      if (startCycle < 60) {
        baySchedules[bestBay].push({
          unitId: engine.unit_id,
          rul: engine.predicted_rul,
          lb90: engine.conformal_lower_90 || Math.max(0, engine.predicted_rul - 12),
          startCycle,
          endCycle,
          duration: endCycle - startCycle,
          isTriggered: (engine.conformal_lower_90 || engine.predicted_rul - 12) <= leadTime,
        });
        bayNextAvailable[bestBay] = endCycle + 1; // 1 cycle turnaround buffer
      }
    });

    return baySchedules;
  }, [fleet, leadTime]);

  const timelineCycles = 60;

  return (
    <div className={`bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            60-Cycle Predictive Hangar Maintenance Schedule
          </h3>
        </div>
        <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
            <span>Critical (LB90% &le; 15c)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-500" />
            <span>Advisory Scheduled</span>
          </div>
        </div>
      </div>

      {/* Gantt Timeline Axis */}
      <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/60 overflow-x-auto">
        {/* Time Marker Ticks */}
        <div className="flex justify-between text-[10px] font-mono text-slate-500 border-b border-slate-800 pb-1 mb-2 pl-36">
          <span>Cycle 0 (Now)</span>
          <span>Cycle 15 (Lead Time)</span>
          <span>Cycle 30</span>
          <span>Cycle 45</span>
          <span>Cycle 60</span>
        </div>

        {/* 3 Hangar Bay Rows */}
        <div className="space-y-3 font-mono">
          {bays.map((bay) => {
            const slots = scheduledBays[bay.id] || [];

            return (
              <div key={bay.id} className="flex items-center space-x-3">
                {/* Bay Header Label */}
                <div className="w-36 shrink-0">
                  <div className="text-xs font-bold text-slate-200 truncate">{bay.name}</div>
                  <div className="text-[9px] text-slate-500 truncate">{bay.capability}</div>
                </div>

                {/* Timeline Bar Track */}
                <div className="relative flex-1 h-9 bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
                  {/* Lead time 15-cycle line */}
                  <div
                    className="absolute top-0 bottom-0 border-r border-rose-500/40 border-dashed z-0 pointer-events-none"
                    style={{ left: `${(leadTime / timelineCycles) * 100}%` }}
                  />

                  {/* Scheduled Engine Blocks */}
                  {slots.map((slot) => {
                    const leftPct = (slot.startCycle / timelineCycles) * 100;
                    const widthPct = Math.max(6, (slot.duration / timelineCycles) * 100);

                    return (
                      <button
                        key={slot.unitId}
                        onClick={() => onSelectUnit && onSelectUnit(slot.unitId)}
                        className={`absolute top-1 bottom-1 rounded-md px-1.5 flex items-center justify-between text-[10px] font-bold text-white shadow-md transition-all hover:scale-105 cursor-pointer z-10 ${
                          slot.isTriggered
                            ? 'bg-rose-600/80 border border-rose-400/80 animate-pulse'
                            : 'bg-amber-600/80 border border-amber-400/80'
                        }`}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                        title={`Unit #${slot.unitId} • RUL: ${slot.rul.toFixed(1)}c • Overhaul Window: c.${slot.startCycle} - c.${slot.endCycle}`}
                      >
                        <span className="truncate">#{slot.unitId}</span>
                        <span className="text-[9px] opacity-80 hidden sm:inline">({slot.rul.toFixed(0)}c)</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

