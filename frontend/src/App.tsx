import React, { useState, useEffect, useRef } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { KpiDeck } from './components/KpiDeck';
import { TrajectoryChart } from './components/TrajectoryChart';
import { GasPathPanel } from './components/GasPathPanel';
import { SensorAttribution } from './components/SensorAttribution';
import { FleetRiskTable } from './components/FleetRiskTable';
import { PolicyLab } from './components/PolicyLab';
import { TurbofanCanvas } from './components_3d/TurbofanCanvas';
import { ComponentCardsGrid } from './components_3d/ComponentCardsGrid';
import RulFanChart from './components/RulFanChart';
import SensorChart from './components/SensorChart';
import SensorImportanceBar from './components/SensorImportanceBar';
import FleetStatCards from './components/FleetStatCards';
import FleetTable from './components/FleetTable';
import EconomicSandbox from './components/EconomicSandbox';
import HangarScheduler from './components/HangarScheduler';
import JudgePresenterBar from './components/JudgePresenterBar';
import DemoTourModal from './components/DemoTourModal';
import ScientificIntegrityCard from './components/ScientificIntegrityCard';
import OilIntelligencePanel from './components/OilIntelligencePanel';
import BorescopeInspectionPanel from './components/BorescopeInspectionPanel';
import MaintenanceHistoryPanel from './components/MaintenanceHistoryPanel';
import AircraftSystemsPanel from './components/AircraftSystemsPanel';
import MultimodalFusionDeck from './components/MultimodalFusionDeck';
import KnowledgeGraphView from './components/KnowledgeGraphView';
import { TelemetryTick } from './types';
import {
  ShieldCheck,
  Database,
  HardDrive,
  Terminal,
  Box,
  LineChart,
  Activity,
  Layers,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

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
    s2: 642.35 + cycle * 0.02,
    s3: 1589.12 + cycle * 0.08,
    s4: 1406.45 + cycle * 0.07,
    s7: 553.82 - cycle * 0.03,
    s8: 2388.04,
    s9: 9052.1 + cycle * 0.05,
    s11: 47.48 + cycle * 0.005,
    s12: 521.85 - cycle * 0.02,
    s13: 2388.06,
    s14: 8139.2,
    s15: 8.43 + cycle * 0.002,
    s17: 392.2,
    s20: 38.92 - cycle * 0.003,
    s21: 23.36 - cycle * 0.002,
  },
  thermodynamics: {
    T30_T24_ratio: 2.474 + cycle * 0.0001,
    Ps30_P30_ratio: 0.0857 - cycle * 0.00005,
    T30_T24_delta: 0.0015,
    Ps30_P30_delta: -0.0003,
  },
  attributions: {
    's11 (Ps30 Static Pressure)': 0.28,
    's4 (T50 LPT Outlet Temp)': 0.22,
    's3 (T30 HPC Outlet Temp)': 0.18,
    's12 (Phi Fuel Flow Ratio)': 0.14,
    's15 (Bypass Duct Bleed)': 0.1,
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
  const [activeTab, setActiveTab] = useState<NavTab>('fusion');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [cockpitChartMode, setCockpitChartMode] = useState<'fan' | 'trajectory' | 'multi-sensor'>('fan');

  // Presentation Scenarios and Modals
  const [activeScenario, setActiveScenario] = useState<any>(null);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [isIntegrityOpen, setIsIntegrityOpen] = useState<boolean>(false);

  // Fleet overview data cache
  const [fleetData, setFleetData] = useState<any[]>([]);
  const [fleetFilter, setFleetFilter] = useState<string>('ALL');

  const [currentTick, setCurrentTick] = useState<TelemetryTick>(() => createDefaultTick(1, 20));
  const [history, setHistory] = useState<TelemetryTick[]>(() => createInitialHistory(1, 20));

  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch Fleet overview when subset changes
  useEffect(() => {
    fetch(`http://localhost:8000/api/v1/fleet/overview?subset=${currentSubset}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.engines) {
          setFleetData(data.engines);
        }
      })
      .catch((err) => console.warn('Could not fetch fleet overview:', err));
  }, [currentSubset]);

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
            return [tick];
          }
          if (tick.cycle === lastCycle) {
            return [...prev.slice(0, -1), tick];
          }
          const next = [...prev, tick];
          return next.slice(-120);
        });
      } catch (err) {
        console.error('SSE JSON parse error:', err);
      }
    };

    es.onopen = () => setConnectionStatus('connected');
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

  const handleSelectEngine = (unit: number) => {
    setCurrentUnit(unit);
    setActiveTab('fusion');
    const initial = createInitialHistory(unit, 25);
    setCurrentTick(initial[initial.length - 1]);
    setHistory(initial);
  };

  const handleSelectScenario = (scenario: any) => {
    setActiveScenario(scenario);
    if (scenario.subset && scenario.subset !== currentSubset) {
      setCurrentSubset(scenario.subset);
    }
    if (scenario.unitId) {
      setCurrentUnit(scenario.unitId);
      const initial = createInitialHistory(scenario.unitId, scenario.id === 2 ? 142 : 25);
      setCurrentTick(initial[initial.length - 1]);
      setHistory(initial);
    }
    if (scenario.componentFocus) {
      setSelectedComponent(scenario.componentFocus);
    }
    if (scenario.tab) {
      const tabMap: Record<string, NavTab> = {
        twin: 'digital-twin',
        detail: 'cockpit',
        fleet: 'fleet',
        oil: 'oil',
        maintenance: 'maintenance',
        economics: 'economics',
      };
      setActiveTab(tabMap[scenario.tab] || 'fusion');
    }
  };

  const handleResetDemo = () => {
    setActiveScenario(null);
    setCurrentSubset('FD001');
    setCurrentUnit(1);
    setSelectedComponent(null);
    setActiveTab('fusion');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white pb-20">
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
        onOpenTour={() => setIsTourOpen(true)}
        onOpenIntegrity={() => setIsIntegrityOpen(true)}
      />

      {/* Active Demo Scenario Notification Pill */}
      {activeScenario && (
        <div className="bg-slate-900 border-b border-sky-500/40 px-4 py-2 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${activeScenario.badgeColor}`}>
              {activeScenario.badge}
            </span>
            <span className="text-white font-bold">{activeScenario.title}:</span>
            <span className="text-slate-300 hidden md:inline">{activeScenario.description}</span>
          </div>
          <button
            onClick={handleResetDemo}
            className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Scenario</span>
          </button>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-[98rem] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* TAB 1: Multimodal Fusion Deck */}
        {activeTab === 'fusion' && (
          <div className="space-y-5 animate-fade-in">
            <MultimodalFusionDeck
              unitId={currentUnit}
              onSelectComponent={(comp) => {
                setSelectedComponent(comp);
                setActiveTab('digital-twin');
              }}
            />
          </div>
        )}

        {/* TAB 2: 3D Digital Twin */}
        {activeTab === 'digital-twin' && (
          <div className="space-y-5 animate-fade-in">
            <KpiDeck tick={currentTick} />

            <div className="grid grid-cols-1 gap-5">
              <TurbofanCanvas
                telemetryTick={currentTick}
                selectedComponentExternal={selectedComponent}
                onSelectComponentExternal={setSelectedComponent}
              />

              <ComponentCardsGrid
                selectedComponentId={selectedComponent}
                onSelectComponent={setSelectedComponent}
                telemetryTick={currentTick}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GasPathPanel tick={currentTick} />
              <SensorAttribution tick={currentTick} />
            </div>
          </div>
        )}

        {/* TAB 3: Telemetry & RUL Prognostics Cockpit */}
        {activeTab === 'cockpit' && (
          <div className="space-y-5 animate-fade-in">
            <KpiDeck tick={currentTick} />

            {/* Segmented Chart Selector */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-[0.08em] text-slate-300 font-bold">
                  Prognostic Analytics View
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                  Engine #{currentUnit}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                <button
                  onClick={() => setCockpitChartMode('fan')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    cockpitChartMode === 'fan'
                      ? 'bg-sky-600 text-white shadow-sm font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Mondrian Fan Chart</span>
                </button>
                <button
                  onClick={() => setCockpitChartMode('trajectory')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    cockpitChartMode === 'trajectory'
                      ? 'bg-sky-600 text-white shadow-sm font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <LineChart className="w-3.5 h-3.5" />
                  <span>Degradation History</span>
                </button>
                <button
                  onClick={() => setCockpitChartMode('multi-sensor')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    cockpitChartMode === 'multi-sensor'
                      ? 'bg-sky-600 text-white shadow-sm font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Multi-Sensor Series</span>
                </button>
              </div>
            </div>

            {/* Dynamic Chart Display */}
            {cockpitChartMode === 'fan' ? (
              <RulFanChart
                currentCycle={currentTick.cycle}
                predictedRul={currentTick.point_rul}
                conformalLower90={currentTick.lower_bound_90}
                conformalUpper90={currentTick.point_rul + (currentTick.point_rul - currentTick.lower_bound_90)}
                leadTime={15}
                unitId={currentUnit}
              />
            ) : cockpitChartMode === 'trajectory' ? (
              <TrajectoryChart history={history} threshold={15} />
            ) : (
              <SensorChart
                unitId={currentUnit}
                sensorHistory={history.map((h) => ({
                  cycle: h.cycle,
                  s3: h.sensors.s3,
                  s7: h.sensors.s7,
                  s4: h.sensors.s4,
                  s2: h.sensors.s2,
                  s9: h.sensors.s9,
                  s8: h.sensors.s8,
                }))}
              />
            )}

            {/* Explainable Attribution & Gas Path Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <SensorImportanceBar />
              <GasPathPanel tick={currentTick} />
            </div>
          </div>
        )}

        {/* TAB 4: Fleet Risk Board */}
        {activeTab === 'fleet' && (
          <div className="space-y-5 animate-fade-in">
            <FleetStatCards
              fleet={fleetData}
              activeFilter={fleetFilter}
              onFilterStatus={setFleetFilter}
            />

            <FleetTable
              fleet={fleetData}
              selectedUnitId={currentUnit}
              onSelectUnit={handleSelectEngine}
              activeFilter={fleetFilter}
              onFilterChange={setFleetFilter}
            />

            <HangarScheduler
              fleet={fleetData}
              leadTime={15}
              onSelectUnit={handleSelectEngine}
            />
          </div>
        )}

        {/* TAB 5: Oil Intelligence */}
        {activeTab === 'oil' && (
          <div className="space-y-5 animate-fade-in">
            <OilIntelligencePanel unitId={currentUnit} />
          </div>
        )}

        {/* TAB 6: Borescope NDT Optical Findings */}
        {activeTab === 'borescope' && (
          <div className="space-y-5 animate-fade-in">
            <BorescopeInspectionPanel unitId={currentUnit} />
          </div>
        )}

        {/* TAB 7: Maintenance Log & Chronic Defects */}
        {activeTab === 'maintenance' && (
          <div className="space-y-5 animate-fade-in">
            <MaintenanceHistoryPanel unitId={currentUnit} />
          </div>
        )}

        {/* TAB 8: Aircraft Systems & Airframe Fatigue */}
        {activeTab === 'systems' && (
          <div className="space-y-5 animate-fade-in">
            <AircraftSystemsPanel unitId={currentUnit} />
          </div>
        )}

        {/* TAB 9: Diagnostic Knowledge Graph */}
        {activeTab === 'graph' && (
          <div className="space-y-5 animate-fade-in">
            <KnowledgeGraphView unitId={currentUnit} />
          </div>
        )}

        {/* TAB 10: Economic Sandbox & Policy Lab */}
        {activeTab === 'economics' && (
          <div className="space-y-5 animate-fade-in">
            <EconomicSandbox
              fleet={fleetData}
              onSelectUnit={handleSelectEngine}
            />
            <div className="pt-4 border-t border-slate-800">
              <PolicyLab />
            </div>
          </div>
        )}
      </main>

      {/* Floating Presentation Bar (Hotkeys 1-6) */}
      <JudgePresenterBar
        activeScenario={activeScenario}
        onSelectScenario={handleSelectScenario}
        onResetDemo={handleResetDemo}
        onOpenIntegrityCard={() => setIsIntegrityOpen(true)}
      />

      {/* Guided Tour Modal */}
      <DemoTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onLaunchScenario={(id) => {
          const scenario = [
            { id: 1, subset: 'FD001', unitId: 10, tab: 'twin', title: 'Nominal Fleet Baseline', badge: 'Healthy' },
            { id: 2, subset: 'FD001', unitId: 34, tab: 'twin', componentFocus: 'hpc', title: 'Imminent HPC Failure Alert', badge: 'Critical' },
            { id: 3, subset: 'FD002', unitId: 18, tab: 'fleet', title: 'Multi-Regime Dynamic', badge: 'Multi-Regime' },
            { id: 4, subset: 'FD001', unitId: 42, tab: 'oil', title: 'Oil Spectrometry Warning', badge: 'Wear Advisory' },
            { id: 5, subset: 'FD001', unitId: 55, tab: 'maintenance', title: 'Repeated Chronic Defect', badge: 'Chronic' },
            { id: 6, subset: 'FD001', unitId: 1, tab: 'economics', title: 'Economic Policy Optimization', badge: 'Economic Win' },
          ].find((s) => s.id === id);
          if (scenario) handleSelectScenario(scenario);
        }}
      />

      {/* Scientific Integrity & Technical Disclosure Modal */}
      <ScientificIntegrityCard
        isOpen={isIntegrityOpen}
        onClose={() => setIsIntegrityOpen(false)}
      />

      {/* Enterprise Flight Deck Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-3 mt-auto">
        <div className="max-w-[98rem] mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Mondrian Split-Conformal 90% LB Certified</span>
            </div>
            <span className="text-slate-700">&bull;</span>
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span>C-MAPSS Subset: {currentSubset}</span>
            </div>
            <span className="text-slate-700 hidden sm:inline">&bull;</span>
            <div className="hidden sm:flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              <span>Signed LightGBM Model Bundle</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:underline flex items-center gap-1"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>FastAPI OpenAPI Spec</span>
            </a>
            <span className="text-slate-700">&bull;</span>
            <span>VISION 2.0 Enterprise &copy; 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
