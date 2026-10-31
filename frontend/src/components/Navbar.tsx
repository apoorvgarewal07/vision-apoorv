import React from 'react';
import { Activity, Play, Pause, RefreshCw, Plane, ShieldCheck, AlertTriangle } from 'lucide-react';

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
  activeTab: 'cockpit' | 'fleet' | 'policy';
  onTabChange: (tab: 'cockpit' | 'fleet' | 'policy') => void;
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
}) => {
  return (
    <header className="bg-aerospace-900 border-b border-aerospace-700/60 sticky top-0 z-50 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-telemetry-cyan to-telemetry-blue flex items-center justify-center text-white shadow-md shadow-telemetry-cyan/20">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">VISION-PHM</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-telemetry-cyan/15 text-telemetry-cyan border border-telemetry-cyan/30">v1.0.0</span>
            </div>
            <p className="text-[11px] text-aerospace-400 font-medium tracking-wide uppercase">Aero-Engine Predictive Maintenance</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 bg-aerospace-950 p-1 rounded-lg border border-aerospace-800">
          <button
            onClick={() => onTabChange('cockpit')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'cockpit'
                ? 'bg-telemetry-cyan text-white shadow-sm'
                : 'text-aerospace-400 hover:text-white hover:bg-aerospace-850'
            }`}
          >
            Engine Cockpit
          </button>
          <button
            onClick={() => onTabChange('fleet')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'fleet'
                ? 'bg-telemetry-cyan text-white shadow-sm'
                : 'text-aerospace-400 hover:text-white hover:bg-aerospace-850'
            }`}
          >
            Fleet Risk Board
          </button>
          <button
            onClick={() => onTabChange('policy')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'policy'
                ? 'bg-telemetry-cyan text-white shadow-sm'
                : 'text-aerospace-400 hover:text-white hover:bg-aerospace-850'
            }`}
          >
            Policy Lab (CP Risk)
          </button>
        </nav>

        {/* Telemetry Flight Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Fleet Subset Selector */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-aerospace-400">Subset</label>
            <select
              value={currentSubset}
              onChange={(e) => onSubsetChange(e.target.value)}
              className="bg-aerospace-850 text-white border border-aerospace-700 rounded-md px-2.5 py-1 text-xs focus:ring-1 focus:ring-telemetry-cyan focus:border-telemetry-cyan"
            >
              <option value="FD001">FD001 (1 Reg, Sea Level)</option>
              <option value="FD002">FD002 (6 Reg, HPC)</option>
              <option value="FD003">FD003 (1 Reg, Fan+HPC)</option>
              <option value="FD004">FD004 (6 Reg, Fan+HPC)</option>
            </select>
          </div>

          {/* Unit Selector */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-aerospace-400">Unit</label>
            <select
              value={currentUnit}
              onChange={(e) => onUnitChange(Number(e.target.value))}
              className="bg-aerospace-850 text-white border border-aerospace-700 rounded-md px-2.5 py-1 text-xs focus:ring-1 focus:ring-telemetry-cyan focus:border-telemetry-cyan"
            >
              {[1, 2, 3, 4, 5, 10, 15, 20].map((u) => (
                <option key={u} value={u}>Unit #{u}</option>
              ))}
            </select>
          </div>

          {/* Speed Selector */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-aerospace-400">Tick Rate</label>
            <select
              value={streamSpeed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="bg-aerospace-850 text-white border border-aerospace-700 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-telemetry-cyan"
            >
              <option value={1000}>1.0x (1s)</option>
              <option value={500}>2.0x (500ms)</option>
              <option value={200}>5.0x (200ms)</option>
              <option value={50}>20x (50ms)</option>
            </select>
          </div>

          {/* Stream Toggle Button */}
          <div className="flex flex-col justify-end pt-3.5">
            <button
              onClick={onToggleStream}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all ${
                isStreaming
                  ? 'bg-aerospace-800 text-amber-300 hover:bg-aerospace-700 border border-amber-500/30'
                  : 'bg-telemetry-cyan text-white hover:bg-telemetry-cyan/90 border border-telemetry-cyan/50'
              }`}
            >
              {isStreaming ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Stream</span>
                </>
              )}
            </button>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex flex-col justify-end pt-3.5">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
              connectionStatus === 'connected'
                ? 'bg-telemetry-emerald/15 text-telemetry-emerald border-telemetry-emerald/30'
                : connectionStatus === 'reconnecting'
                ? 'bg-telemetry-amber/15 text-telemetry-amber border-telemetry-amber/30'
                : 'bg-aerospace-800 text-aerospace-400 border-aerospace-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                connectionStatus === 'connected' ? 'bg-telemetry-emerald animate-pulse' :
                connectionStatus === 'reconnecting' ? 'bg-telemetry-amber animate-ping' : 'bg-aerospace-600'
              }`} />
              <span className="capitalize">{connectionStatus}</span>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};

