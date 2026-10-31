import React from 'react';
import {
  Activity,
  Play,
  Pause,
  RefreshCw,
  Plane,
  ShieldCheck,
  AlertTriangle,
  Box,
  Droplet,
  Eye,
  Wrench,
  Gauge,
  Network,
  DollarSign,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export type NavTab =
  | 'fusion'
  | 'digital-twin'
  | 'cockpit'
  | 'fleet'
  | 'oil'
  | 'borescope'
  | 'maintenance'
  | 'systems'
  | 'graph'
  | 'economics';

interface NavbarProps {
  currentSubset: string;
  onSubsetChange: (subset: string) => void;
  currentUnit: number;
  onUnitChange: (unit: number) => void;
  isStreaming: boolean;
  onToggleStream: () => void;
  streamSpeed: number;
  onSpeedChange: (speed: number) => void;
  connectionStatus: 'connected' | 'reconnecting' | 'idle';
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenTour?: () => void;
  onOpenIntegrity?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSubset,
  onSubsetChange,
  currentUnit,
  onUnitChange,
  isStreaming,
  onToggleStream,
  streamSpeed,
  onSpeedChange,
  connectionStatus,
  activeTab,
  onTabChange,
  onOpenTour,
  onOpenIntegrity,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'fusion', label: 'Airworthiness Fusion', icon: ShieldCheck },
    { id: 'digital-twin', label: '3D Digital Twin', icon: Box },
    { id: 'cockpit', label: 'Telemetry & RUL', icon: Activity },
    { id: 'fleet', label: 'Fleet Board', icon: Plane },
    { id: 'oil', label: 'Oil Intelligence', icon: Droplet },
    { id: 'borescope', label: 'Borescope NDT', icon: Eye },
    { id: 'maintenance', label: 'Maintenance Log', icon: Wrench },
    { id: 'systems', label: 'Aircraft Systems', icon: Gauge },
    { id: 'graph', label: 'Knowledge Graph', icon: Network },
    { id: 'economics', label: 'Economic Sandbox', icon: DollarSign },
  ];

  return (
    <header className="bg-slate-950/95 border-b border-slate-800/80 sticky top-0 z-50 backdrop-blur-md font-sans">
      <div className="max-w-[98rem] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <Plane className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-base">VISION 2.0</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
                ENTERPRISE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
              Integrated Aircraft Health Intelligence
            </p>
          </div>
        </div>

        {/* Telemetry Flight Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Fleet Subset Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">SUBSET:</span>
            <select
              value={currentSubset}
              onChange={(e) => onSubsetChange(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-sky-400 focus:outline-none cursor-pointer"
            >
              <option value="FD001" className="bg-slate-900 text-white">FD001 (1-Regime Sea Level)</option>
              <option value="FD002" className="bg-slate-900 text-white">FD002 (6-Regime Dynamic)</option>
              <option value="FD003" className="bg-slate-900 text-white">FD003 (2-Fault Modes)</option>
              <option value="FD004" className="bg-slate-900 text-white">FD004 (6-Regime Multi-Fault)</option>
            </select>
          </div>

          {/* Engine Unit Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">ENGINE:</span>
            <select
              value={currentUnit}
              onChange={(e) => onUnitChange(Number(e.target.value))}
              className="bg-transparent text-xs font-mono font-bold text-sky-400 focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 100 }, (_, i) => i + 1).map((u) => (
                <option key={u} value={u} className="bg-slate-900 text-white">
                  Unit #{u}
                </option>
              ))}
            </select>
          </div>

          {/* Tour & Integrity Quick Buttons */}
          {onOpenTour && (
            <button
              onClick={onOpenTour}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-300 text-xs font-mono font-semibold transition-colors"
              title="Launch Guided 6-Step Tour"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Tour</span>
            </button>
          )}

          {onOpenIntegrity && (
            <button
              onClick={onOpenIntegrity}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono transition-colors"
              title="View Scientific Integrity & Provenance"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Integrity</span>
            </button>
          )}

          {/* Stream Connection Indicator */}
          <button
            onClick={onToggleStream}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-colors ${
              isStreaming
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' && isStreaming
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-slate-500'
              }`}
            />
            <span>{isStreaming ? 'Stream Active' : 'Stream Paused'}</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation Ribbon */}
      <div className="border-t border-slate-800/80 bg-slate-950/60 px-4 sm:px-6 overflow-x-auto scrollbar-none">
        <nav className="max-w-[98rem] mx-auto flex items-center gap-1 py-1 text-xs font-mono">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
