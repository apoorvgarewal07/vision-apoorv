import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { KpiDeck } from './components/KpiDeck';
import { TrajectoryChart } from './components/TrajectoryChart';
import { GasPathPanel } from './components/GasPathPanel';
import { SensorAttribution } from './components/SensorAttribution';
import { FleetRiskTable } from './components/FleetRiskTable';
import { PolicyLab } from './components/PolicyLab';
import { TelemetryTick } from './types';
import { ShieldCheck, Database, HardDrive, Terminal } from 'lucide-react';

const createDefaultTick = (unit: number, cycle: number = 20): TelemetryTick => ({
  unit,
  cycle,
  operational_settings: [0.0, 0.0, 100.0],
  point_rul: Math.max(15, 125 - Math.round(cycle * 0.4)),
  lower_bound_90: Math.max(8, 115 - Math.round(cycle * 0.42)),
  lower_bound_95: Math.max(4, 104 - Math.round(cycle * 0.45)),
  health_index: Math.max(0.1, 1.0 - (cycle / 150) * 0.5),
  status: cycle > 180 ? 'CRITICAL' : cycle > 120 ? 'WARNING' : 'NORMAL',
  abstain: false,
  reasons: [],
  sensors: {
    s2: 642.35 + (cycle * 0.02),
    s3: 1589.12 + (cycle * 0.08),
    s4: 1406.45 + (cycle * 0.07),
    s7: 553.82 - (cycle * 0.03),
    s8: 2388.04,
    s9: 9052.1 + (cycle * 0.05),
    s11: 47.48 + (cycle * 0.005),
    s12: 521.85 - (cycle * 0.02),
    s13: 2388.06,
    s14: 8139.2,
    s15: 8.43 + (cycle * 0.002),
    s17: 392.2,
    s20: 38.92 - (cycle * 0.003),
    s21: 23.36 - (cycle * 0.002),
  },
  thermodynamics: {
    T30_T24_ratio: 2.474 + (cycle * 0.0001),
    Ps30_P30_ratio: 0.0857 - (cycle * 0.00005),
    T30_T24_delta: 0.0015,
    Ps30_P30_delta: -0.0003,
  },
  attributions: {
    's11 (Ps30 Static Pressure)': 0.28,
    's4 (T50 LPT Outlet Temp)': 0.22,
    's3 (T30 HPC Outlet Temp)': 0.18,
    's12 (Phi Fuel Flow Ratio)': 0.14,
    's15 (Bypass Duct Bleed)': 0.10,
    's2 (T24 LPC Outlet Temp)': 0.08,
  },
});

const createInitialHistory = (unit: number, baseCycle: number = 20): TelemetryTick[] => {
  const list: TelemetryTick[] = [];
  const start = Math.max(1, baseCycle - 10);
  for (let c = start; c <= baseCycle; c++) {
    list.push(createDefaultTick(unit, c));
  }
  return list;
};

export const App: React.FC = () => {
  const [currentSubset, setCurrentSubset] = useState<string>('FD001');
  const [currentUnit, setCurrentUnit] = useState<number>(1);
  const [streamSpeed, setStreamSpeed] = useState<number>(500);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'idle'>('connected');
  const [activeTab, setActiveTab] = useState<'cockpit' | 'fleet' | 'policy'>('cockpit');

  const [currentTick, setCurrentTick] = useState<TelemetryTick>(() => createDefaultTick(1, 20));
  const [history, setHistory] = useState<TelemetryTick[]>(() => createInitialHistory(1, 20));

  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect or disconnect SSE stream
  useEffect(() => {
    if (!isStreaming) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnectionStatus('idle');
      return;
    }

    setConnectionStatus('reconnecting');
    const url = `/api/v1/stream/replay/${currentSubset}?speed_ms=${streamSpeed}&unit=${currentUnit}&loop=true`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    const handleData = (event: MessageEvent) => {
      try {
        if (!event.data) return;
        const tick: TelemetryTick = JSON.parse(event.data);
        setConnectionStatus('connected');
        setCurrentTick(tick);
        setHistory((prev) => {
          if (prev.length === 0) return [tick];
          const lastCycle = prev[prev.length - 1].cycle;
          if (tick.cycle < lastCycle) {
            // Trajectory finished and looped back to cycle 1
            return [tick];
          }
          if (tick.cycle === lastCycle) {
            // In-place update to prevent duplicate cycle appending
            return [...prev.slice(0, -1), tick];
          }
          // Strictly advancing cycle
          const next = [...prev, tick];
          return next.slice(-120);
        });
      } catch (err) {
        console.error('SSE JSON parse error:', err);
      }
    };

    es.onopen = () => {
      setConnectionStatus('connected');
    };

    // Attach single message listener to avoid duplicate trigger
    es.onmessage = handleData;

    es.onerror = (err) => {
      console.warn('SSE stream reconnecting...', err);
      setConnectionStatus('reconnecting');
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [isStreaming, currentSubset, currentUnit, streamSpeed]);

  const handleUnitChange = (newUnit: number) => {
    setCurrentUnit(newUnit);
    const initial = createInitialHistory(newUnit, 15);
    setCurrentTick(initial[initial.length - 1]);
    setHistory(initial);
  };

  const handleSubsetChange = (newSubset: string) => {
    setCurrentSubset(newSubset);
    const initial = createInitialHistory(currentUnit, 15);
    setCurrentTick(initial[initial.length - 1]);
    setHistory(initial);
  };

  const handleSelectEngineFromFleet = (unit: number) => {
    setCurrentUnit(unit);
    setActiveTab('cockpit');
    const initial = createInitialHistory(unit, 25);
    setCurrentTick(initial[initial.length - 1]);
    setHistory(initial);
  };

  return (
    <div className="min-h-screen bg-aerospace-950 text-slate-100 flex flex-col font-sans selection:bg-telemetry-cyan selection:text-white">
      {/* Flight Deck Header */}
      <Navbar
        currentSubset={currentSubset}
        onSubsetChange={handleSubsetChange}
        currentUnit={currentUnit}
        onUnitChange={handleUnitChange}
        isStreaming={isStreaming}
        onToggleStream={() => setIsStreaming(!isStreaming)}
        streamSpeed={streamSpeed}
        onSpeedChange={setStreamSpeed}
        connectionStatus={connectionStatus}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === 'cockpit' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Gauges & Conformal Risk Banner */}
            <KpiDeck tick={currentTick} />

            {/* Degradation Horizon & Conformal Envelope */}
            <TrajectoryChart history={history} threshold={15} />

            {/* Thermodynamics & Explainable Sensor Attributions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GasPathPanel tick={currentTick} />
              <SensorAttribution tick={currentTick} />
            </div>
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="animate-fadeIn">
            <FleetRiskTable onSelectEngine={handleSelectEngineFromFleet} />
          </div>
        )}

        {activeTab === 'policy' && (
          <div className="animate-fadeIn">
            <PolicyLab />
          </div>
        )}
      </main>

      {/* Flight Deck Footer */}
      <footer className="bg-aerospace-900 border-t border-aerospace-800 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-aerospace-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-telemetry-emerald" />
              <span>Mondrian Split-Conformal 90% LB Guaranteed</span>
            </div>
            <span className="text-aerospace-700">•</span>
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>C-MAPSS Subset: {currentSubset}</span>
            </div>
            <span className="text-aerospace-700 hidden sm:inline">•</span>
            <div className="hidden sm:flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Artifacts: Signed SHA-256 Bundle</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/docs"
              target="_blank"
              rel="noreferrer"
              className="text-telemetry-cyan hover:underline flex items-center gap-1"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>FastAPI Docs</span>
            </a>
            <span className="text-aerospace-700">•</span>
            <span>VISION-PHM Flight Deck &copy; 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
