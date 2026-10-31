import React, { useMemo } from 'react';
import { TelemetryTick } from '../types';
import { TrendingDown } from 'lucide-react';

interface TrajectoryChartProps {
  history: TelemetryTick[];
  threshold?: number;
}

export const TrajectoryChart: React.FC<TrajectoryChartProps> = ({ history, threshold = 15 }) => {
  // If only 1 data point, extrapolate a brief lead-in so the chart renders immediately
  const effectiveHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    if (history.length === 1) {
      const h0 = history[0];
      const prevCycle = Math.max(1, h0.cycle - 5);
      return [
        {
          ...h0,
          cycle: prevCycle,
          point_rul: Math.min(125, h0.point_rul + 6),
          lower_bound_90: Math.min(125, h0.lower_bound_90 + 6),
        },
        h0,
      ];
    }
    return history;
  }, [history]);

  const chartData = useMemo(() => {
    if (effectiveHistory.length === 0) return null;

    const cycles = effectiveHistory.map((h) => h.cycle);
    const minCycle = Math.min(...cycles);
    const maxCycle = Math.max(...cycles);

    const ruls = effectiveHistory.map((h) => h.point_rul);
    const lbs = effectiveHistory.map((h) => h.lower_bound_90);
    const maxRul = Math.max(125, ...ruls, ...lbs);

    return {
      minCycle,
      maxCycle: Math.max(maxCycle, minCycle + 10),
      maxRul: Math.ceil(maxRul / 20) * 20,
    };
  }, [effectiveHistory]);

  if (!chartData || effectiveHistory.length === 0) {
    return (
      <div className="bg-aerospace-900 border border-aerospace-800 rounded-xl p-6 h-80 flex flex-col items-center justify-center text-center">
        <TrendingDown className="w-8 h-8 text-aerospace-600 mb-2 animate-bounce" />
        <p className="text-xs font-mono uppercase tracking-wider text-aerospace-400">
          Accumulating trajectory data points...
        </p>
      </div>
    );
  }

  const { minCycle, maxCycle, maxRul } = chartData;

  // Chart dimensions
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 30, bottom: 35, left: 50 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const getX = (cycle: number) => {
    if (maxCycle === minCycle) return padding.left;
    return padding.left + ((cycle - minCycle) / (maxCycle - minCycle)) * plotWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(maxRul, val));
    return padding.top + plotHeight - (clamped / maxRul) * plotHeight;
  };

  // Build SVG path strings
  const rulPoints = effectiveHistory.map((h) => `${getX(h.cycle).toFixed(1)},${getY(h.point_rul).toFixed(1)}`);
  const rulPath = `M ${rulPoints.join(' L ')}`;

  const lbPoints = effectiveHistory.map((h) => `${getX(h.cycle).toFixed(1)},${getY(h.lower_bound_90).toFixed(1)}`);
  const lbPath = `M ${lbPoints.join(' L ')}`;

  // Lower bound shaded area under lb curve to 0
  const areaPath = `M ${getX(effectiveHistory[0].cycle)},${getY(0)} L ${lbPoints.join(' L ')} L ${getX(
    effectiveHistory[effectiveHistory.length - 1].cycle
  )},${getY(0)} Z`;

  // Grid tick intervals
  const yTicks = [0, Math.round(maxRul * 0.25), Math.round(maxRul * 0.5), Math.round(maxRul * 0.75), maxRul];
  const xStep = Math.max(1, Math.round((maxCycle - minCycle) / 6));
  const xTicks = [];
  for (let c = minCycle; c <= maxCycle; c += xStep) {
    xTicks.push(c);
  }

  const thresholdY = getY(threshold);
  const latest = effectiveHistory[effectiveHistory.length - 1];

  return (
    <div className="bg-aerospace-900 border border-aerospace-800 rounded-xl p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <span>RUL Degradation Trajectory & Conformal Envelope</span>
          </h3>
          <p className="text-xs text-aerospace-400 mt-0.5">
            Real-time Mondrian split-conformal coverage (\(1 - \alpha = 0.90\)) against safe threshold
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-telemetry-cyan inline-block rounded" />
            <span className="text-slate-300">Point RUL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-telemetry-emerald inline-block rounded" />
            <span className="text-emerald-400">90% Conf. LB</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-500 inline-block border-b border-dashed border-rose-500" />
            <span className="text-rose-400">Removal Trigger ({threshold}c)</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          style={{ minWidth: '550px' }}
        >
          <defs>
            <linearGradient id="lbAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="cyanLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>

          {/* Grid lines horizontal */}
          {yTicks.map((val) => {
            const y = getY(val);
            return (
              <g key={`y-${val}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Grid lines vertical */}
          {xTicks.map((val) => {
            const x = getX(val);
            return (
              <g key={`x-${val}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 16}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  c{val}
                </text>
              </g>
            );
          })}

          {/* Critical Threshold Line */}
          <line
            x1={padding.left}
            y1={thresholdY}
            x2={width - padding.right}
            y2={thresholdY}
            stroke="#f43f5e"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          <text
            x={width - padding.right}
            y={thresholdY - 5}
            fill="#f43f5e"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="end"
          >
            Threshold: {threshold} cycles
          </text>

          {/* Lower bound shaded area */}
          <path d={areaPath} fill="url(#lbAreaGrad)" />

          {/* 90% LB Line */}
          <path
            d={lbPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Point RUL Line */}
          <path
            d={rulPath}
            fill="none"
            stroke="url(#cyanLineGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Latest Point markers */}
          {latest && (
            <>
              {/* RUL Marker */}
              <circle
                cx={getX(latest.cycle)}
                cy={getY(latest.point_rul)}
                r="4"
                fill="#0ea5e9"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              {/* LB Marker */}
              <circle
                cx={getX(latest.cycle)}
                cy={getY(latest.lower_bound_90)}
                r="3.5"
                fill="#10b981"
                stroke="#060a12"
                strokeWidth="1.5"
              />
            </>
          )}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-aerospace-400 mt-2 px-2">
        <span>Cycle Horizon: {minCycle} &rarr; {maxCycle}</span>
        <span>Data points: {effectiveHistory.length} ticks</span>
      </div>
    </div>
  );
};
