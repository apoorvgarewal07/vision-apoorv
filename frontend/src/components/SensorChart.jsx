/**
 * VISION: Sensor Telemetry Time-Series Chart (Interactive SVG)
 * Vital Intelligence for System Integrity, Observation & Nostics
 *
 * Visualizes multi-sensor trajectories over flight cycle history with:
 * - Active channel toggling (T24, T30, T50, P30, Nf, Nc, Ps30)
 * - Raw Sensor Values vs. Condition-Corrected Deltas
 * - Hover crosshair inspection showing precise cycle sensor readings
 */

import React, { useState, useMemo } from 'react';
import { Activity, Layers, Eye, RefreshCw } from 'lucide-react';

const SENSOR_CHANNELS = [
  { key: 's3', code: 'T30', label: 'HPC Outlet Temp', unit: '°R', color: '#f97316' },
  { key: 's7', code: 'P30', label: 'HPC Outlet Pressure', unit: 'psia', color: '#06b6d4' },
  { key: 's4', code: 'T50', label: 'LPT Outlet Temp (EGT)', unit: '°R', color: '#ec4899' },
  { key: 's2', code: 'T24', label: 'LPC Outlet Temp', unit: '°R', color: '#3b82f6' },
  { key: 's9', code: 'Nc', label: 'Core Spool Speed', unit: 'rpm', color: '#8b5cf6' },
  { key: 's8', code: 'Nf', label: 'Fan Spool Speed', unit: 'rpm', color: '#10b981' },
];

export default function SensorChart({
  sensorHistory = [],
  unitId = 1,
  className = '',
}) {
  const [activeChannels, setActiveChannels] = useState(['s3', 's7']);
  const [useDeltas, setUseDeltas] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Toggle active sensor channel
  const toggleChannel = (key) => {
    setActiveChannels((prev) =>
      prev.includes(key)
        ? prev.length > 1
          ? prev.filter((k) => k !== key)
          : prev
        : [...prev, key]
    );
  };

  // Generate synthetic trajectory if history is empty (e.g., initial load)
  const data = useMemo(() => {
    if (sensorHistory && sensorHistory.length > 0) {
      return sensorHistory;
    }
    // Fallback nominal progression for 100 cycles
    const mock = [];
    for (let c = 1; c <= 100; c++) {
      const prog = c / 100;
      mock.push({
        cycle: c,
        s3: 1580 + prog * 25 + Math.sin(c * 0.2) * 1.5,
        s7: 554 - prog * 8 + Math.cos(c * 0.2) * 0.5,
        s4: 1400 + prog * 18 + Math.sin(c * 0.15) * 1.2,
        s2: 642 + prog * 3 + Math.cos(c * 0.1) * 0.4,
        s9: 9050 + prog * 35 + Math.sin(c * 0.25) * 2,
        s8: 2388 + prog * 4 + Math.cos(c * 0.2) * 1,
      });
    }
    return mock;
  }, [sensorHistory]);

  const maxCycle = data.length > 0 ? data[data.length - 1].cycle : 100;
  const minCycle = data.length > 0 ? data[0].cycle : 1;

  // Chart dimensions
  const width = 640;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Scale calculations per channel
  const getSensorVal = (d, key, code) => {
    if (!d) return 0;
    if (d.sensors && d.sensors[key] !== undefined) return Number(d.sensors[key]);
    if (d.sensors && code && d.sensors[code] !== undefined) return Number(d.sensors[code]);
    if (d[key] !== undefined) return Number(d[key]);
    if (code && d[code] !== undefined) return Number(d[code]);
    const upperKey = key.toUpperCase();
    if (d[upperKey] !== undefined) return Number(d[upperKey]);
    return 0;
  };

  const channelScales = useMemo(() => {
    const scales = {};
    for (const ch of SENSOR_CHANNELS) {
      let vals = data.map((d) => getSensorVal(d, ch.key, ch.code));

      if (useDeltas && vals.length > 0) {
        const base = vals[0] || 1;
        vals = vals.map((v) => ((v - base) / (base || 1)) * 100);
      }

      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);
      const span = maxVal - minVal || 1.0;
      scales[ch.key] = { min: minVal - span * 0.05, max: maxVal + span * 0.05, span };
    }
    return scales;
  }, [data, useDeltas]);

  // Coordinate mapping
  const getX = (cycle) => {
    return padding.left + ((cycle - minCycle) / (maxCycle - minCycle || 1)) * plotW;
  };

  const getY = (val, key) => {
    const s = channelScales[key];
    if (!s) return padding.top + plotH / 2;
    const norm = (val - s.min) / (s.max - s.min || 1);
    return padding.top + plotH - norm * plotH;
  };

  // Generate SVG path for a channel
  const getLinePath = (channelKey) => {
    if (!data || data.length === 0) return '';
    const ch = SENSOR_CHANNELS.find((c) => c.key === channelKey);
    const baseVal = getSensorVal(data[0], channelKey, ch?.code) || 1;

    return data
      .map((d, i) => {
        let v = getSensorVal(d, channelKey, ch?.code);
        if (useDeltas) {
          v = ((v - baseVal) / (baseVal || 1)) * 100;
        }
        const x = getX(d.cycle);
        const y = getY(v, channelKey);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div className={`bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col ${className}`}>
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            Sensor Telemetry History &bull; Unit #{unitId}
          </h3>
        </div>

        {/* Delta Mode Toggle */}
        <div className="flex items-center space-x-2 text-[11px] font-mono">
          <button
            onClick={() => setUseDeltas(!useDeltas)}
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              useDeltas
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            {useDeltas ? 'Normalized Delta (%)' : 'Raw Telemetry'}
          </button>
        </div>
      </div>

      {/* Sensor Channel Badges Toggle Bar */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
        {SENSOR_CHANNELS.map((ch) => {
          const isActive = activeChannels.includes(ch.key);
          return (
            <button
              key={ch.key}
              onClick={() => toggleChannel(ch.key)}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-all ${
                isActive
                  ? 'border-opacity-80 font-bold shadow-sm'
                  : 'bg-slate-950/40 text-slate-500 border-slate-800 opacity-60'
              }`}
              style={{
                borderColor: isActive ? ch.color : undefined,
                color: isActive ? ch.color : undefined,
                backgroundColor: isActive ? `${ch.color}15` : undefined,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: ch.color }}
              />
              <span>{ch.code}</span>
              <span className="text-slate-500 font-normal">({ch.unit})</span>
            </button>
          );
        })}
      </div>

      {/* SVG Time-Series Chart */}
      <div className="relative w-full aspect-[2.6/1] bg-slate-950/80 rounded-xl border border-slate-800/80 p-1 select-none overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const normX = (mouseX / rect.width) * width;
            const ratio = Math.max(0, Math.min(1, (normX - padding.left) / plotW));
            const targetCycle = Math.round(minCycle + ratio * (maxCycle - minCycle));
            const point = data.find((d) => d.cycle === targetCycle) || data[data.length - 1];
            setHoveredPoint(point);
          }}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((t, idx) => {
            const y = padding.top + t * plotH;
            return (
              <line
                key={idx}
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#1e293b"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Vertical Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((t, idx) => {
            const x = padding.left + t * plotW;
            const cyc = Math.round(minCycle + t * (maxCycle - minCycle));
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 14}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  c.{cyc}
                </text>
              </g>
            );
          })}

          {/* Render Active Channels */}
          {activeChannels.map((chKey) => {
            const ch = SENSOR_CHANNELS.find((c) => c.key === chKey);
            if (!ch) return null;
            return (
              <path
                key={chKey}
                d={getLinePath(chKey)}
                fill="none"
                stroke={ch.color}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Interactive Hover Crosshair */}
          {hoveredPoint && (
            <g>
              <line
                x1={getX(hoveredPoint.cycle)}
                y1={padding.top}
                x2={getX(hoveredPoint.cycle)}
                y2={height - padding.bottom}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoveredPoint.cycle)}
                cy={getY(getSensorVal(hoveredPoint, activeChannels[0] || 's3', 'T30'), activeChannels[0] || 's3')}
                r="3.5"
                fill="#38bdf8"
              />
            </g>
          )}
        </svg>

        {/* Hovered Telemetry Readout Box */}
        {hoveredPoint && (
          <div className="absolute top-2 right-2 bg-slate-900/90 border border-slate-700/80 rounded-lg p-2 text-[10px] font-mono text-slate-300 shadow-xl space-y-0.5 pointer-events-none">
            <div className="font-bold text-cyan-300 border-b border-slate-800 pb-0.5 mb-1">
              Flight Cycle {hoveredPoint.cycle}
            </div>
            {activeChannels.map((key) => {
              const ch = SENSOR_CHANNELS.find((c) => c.key === key);
              const val = getSensorVal(hoveredPoint, key, ch?.code);
              return (
                <div key={key} className="flex justify-between space-x-3">
                  <span style={{ color: ch?.color }}>{ch?.code}:</span>
                  <span className="font-bold text-white">
                    {val !== undefined && val !== null ? Number(val).toFixed(1) : '--'} {ch?.unit}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

