/**
 * VISION: Fleet Risk & Status Board Table
 * Vital Intelligence for System Integrity, Observation & Nostics
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  Filter,
  Flame,
  ShieldAlert,
} from 'lucide-react';

export default function FleetTable({
  fleet = [],
  selectedUnitId = null,
  onSelectUnit = null,
  activeFilter = 'ALL',
  onFilterChange = null,
  className = '',
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('predicted_rul');
  const [sortAsc, setSortAsc] = useState(true);

  // Sorting Handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Filter & Sort Logic
  const filteredFleet = useMemo(() => {
    return fleet.filter((engine) => {
      // Urgency Filter
      if (activeFilter === 'CRITICAL' && engine.urgency !== 'CRITICAL' && engine.predicted_rul >= 20) {
        return false;
      }
      if (activeFilter === 'ADVISORY' && engine.urgency !== 'ADVISORY' && (engine.predicted_rul < 20 || engine.predicted_rul >= 50)) {
        return false;
      }
      if (activeFilter === 'HEALTHY' && engine.urgency !== 'HEALTHY' && engine.predicted_rul < 50) {
        return false;
      }

      // Search Filter
      if (searchTerm) {
        const idMatch = String(engine.unit_id).includes(searchTerm.trim());
        const urgencyMatch = engine.urgency?.toLowerCase().includes(searchTerm.toLowerCase());
        return idMatch || urgencyMatch;
      }

      return true;
    }).sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (aVal === undefined) aVal = 0;
      if (bVal === undefined) bVal = 0;

      if (typeof aVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [fleet, activeFilter, searchTerm, sortField, sortAsc]);

  const getUrgencyBadge = (urgency, rul) => {
    if (urgency === 'CRITICAL' || rul < 20) {
      return {
        label: 'CRITICAL',
        sub: 'Overhaul Required',
        bg: 'bg-rose-950/80 text-rose-300 border-rose-500/50',
        dot: 'bg-rose-500 animate-ping',
        icon: AlertTriangle,
      };
    }
    if (urgency === 'ADVISORY' || (rul >= 20 && rul < 50)) {
      return {
        label: 'ADVISORY',
        sub: 'Inspect in 15c',
        bg: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
        dot: 'bg-amber-500',
        icon: Clock,
      };
    }
    return {
      label: 'HEALTHY',
      sub: 'Nominal Flight',
      bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
      dot: 'bg-emerald-500',
      icon: CheckCircle2,
    };
  };

  return (
    <div className={`bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col ${className}`}>
      {/* Table Header Bar with Search & Urgency Filters */}
      <div className="p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Unit ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/60 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono w-44"
            />
          </div>

          {/* Quick Filters */}
          <div className="hidden sm:flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {['ALL', 'CRITICAL', 'ADVISORY', 'HEALTHY'].map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => onFilterChange && onFilterChange(filterKey)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-colors ${
                  activeFilter === filterKey
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filterKey}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
          <span>Showing <strong>{filteredFleet.length}</strong> of <strong>{fleet.length}</strong> units</span>
        </div>
      </div>

      {/* Scrollable Table View */}
      <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-slate-950/80 text-[11px] font-mono text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
            <tr>
              <th
                onClick={() => handleSort('unit_id')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center space-x-1">
                  <span>Unit ID</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('current_cycle')}
                className="py-3 px-3 cursor-pointer hover:text-white"
              >
                <div className="flex items-center space-x-1">
                  <span>Cycle</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('predicted_rul')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center space-x-1">
                  <span>Point RUL</span>
                  <ArrowUpDown className="w-3 h-3 text-cyan-400" />
                </div>
              </th>
              <th className="py-3 px-4">
                <span>90% Conformal [LB - UB]</span>
              </th>
              <th
                onClick={() => handleSort('risk_score')}
                className="py-3 px-3 cursor-pointer hover:text-white"
              >
                <div className="flex items-center space-x-1">
                  <span>Risk Score</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3">
                <span>Health Index</span>
              </th>
              <th className="py-3 px-4 text-center">
                <span>Maintenance Action</span>
              </th>
              <th className="py-3 px-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
            {filteredFleet.map((engine) => {
              const isSelected = selectedUnitId === engine.unit_id;
              const badge = getUrgencyBadge(engine.urgency, engine.predicted_rul);
              const BadgeIcon = badge.icon;
              const confLB = engine.conformal_lower_90 !== undefined
                ? engine.conformal_lower_90.toFixed(1)
                : Math.max(0, engine.predicted_rul - 12).toFixed(1);
              const confUB = engine.conformal_upper_90 !== undefined
                ? engine.conformal_upper_90.toFixed(1)
                : (engine.predicted_rul + 15).toFixed(1);

              const health = engine.health_index !== undefined
                ? engine.health_index
                : Math.min(100, Math.max(5, (engine.predicted_rul / 125) * 100));

              return (
                <tr
                  key={engine.unit_id}
                  onClick={() => onSelectUnit && onSelectUnit(engine.unit_id)}
                  className={`cursor-pointer transition-colors duration-150 ${
                    isSelected
                      ? 'bg-cyan-950/60 border-l-4 border-cyan-400 font-semibold text-white'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  {/* Unit ID */}
                  <td className="py-2.5 px-4 font-bold text-slate-100 flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-[11px] text-cyan-300 border border-slate-700">
                      {engine.unit_id}
                    </span>
                    <span>Turbofan #{engine.unit_id}</span>
                  </td>

                  {/* Current Cycle */}
                  <td className="py-2.5 px-3 text-slate-400">
                    {engine.current_cycle}
                  </td>

                  {/* Predicted RUL */}
                  <td className="py-2.5 px-4">
                    <span
                      className={`text-sm font-bold ${
                        engine.predicted_rul < 20
                          ? 'text-rose-400'
                          : engine.predicted_rul < 50
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {engine.predicted_rul.toFixed(1)}{' '}
                      <span className="text-[10px] text-slate-500 font-normal">cycles</span>
                    </span>
                  </td>

                  {/* Conformal Range */}
                  <td className="py-2.5 px-4">
                    <div className="flex items-center space-x-1.5 text-xs">
                      <span className="font-semibold text-cyan-300">[{confLB}</span>
                      <span className="text-slate-500">–</span>
                      <span className="text-slate-300">{confUB}]</span>
                      <span className="text-[10px] text-slate-500">cyc</span>
                    </div>
                  </td>

                  {/* Risk Score */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (engine.risk_score || 0) > 60
                              ? 'bg-rose-500'
                              : (engine.risk_score || 0) > 30
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, engine.risk_score || 10)}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {((engine.risk_score || 0)).toFixed(0)}%
                      </span>
                    </div>
                  </td>

                  {/* Health Index */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`text-[11px] font-bold ${
                          health < 50
                            ? 'text-rose-400'
                            : health < 80
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {health.toFixed(0)}%
                      </span>
                    </div>
                  </td>

                  {/* Maintenance Action Badge */}
                  <td className="py-2.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${badge.bg}`}
                    >
                      <BadgeIcon className="w-3 h-3" />
                      <span>{badge.label}</span>
                    </span>
                  </td>

                  {/* Select Icon */}
                  <td className="py-2.5 px-2 text-right text-slate-500">
                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : ''}`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

