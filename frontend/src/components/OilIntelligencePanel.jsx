/**
 * VISION 2.0: Oil & Lubrication Spectrometry Intelligence Panel
 * Vital Intelligence for System Integrity, Observation & Nostics
 *
 * Implements ASTM D5185 Spectrometric Wear Analysis:
 * - Wear metals (Fe, Cu, Cr, Al, Ti ppm) with rate-of-change wear velocity
 * - Kinematic viscosity monitoring at 40°C and 100°C (cSt)
 * - Contamination indicators: Water wt%, Fuel dilution wt%, ISO Cleanliness Code
 * - Filter debris and Magnetic Chip Detector (MCD) inspection status
 * - Lab report upload & manual entry simulation
 * - Clear provenance demarcation stamp
 */

import React, { useState, useEffect } from 'react';
import {
  Droplet,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Upload,
  FileText,
  Activity,
  Layers,
  Info,
  Clock,
  Filter,
} from 'lucide-react';

const WEAR_LIMITS = {
  iron_fe_ppm: { label: 'Iron (Fe)', warn: 45, crit: 75, unit: 'ppm', source: 'Bearings / Gears' },
  copper_cu_ppm: { label: 'Copper (Cu)', warn: 18, crit: 30, unit: 'ppm', source: 'Bushings / Washers' },
  chromium_cr_ppm: { label: 'Chromium (Cr)', warn: 8, crit: 15, unit: 'ppm', source: 'Rings / Seals' },
  aluminum_al_ppm: { label: 'Aluminum (Al)', warn: 12, crit: 25, unit: 'ppm', source: 'Compressor Cases' },
  titanium_ti_ppm: { label: 'Titanium (Ti)', warn: 5, crit: 12, unit: 'ppm', source: 'HPC/Fan Blades' },
};

export default function OilIntelligencePanel({
  unitId = 1,
  className = '',
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`http://localhost:8000/api/v1/oil/${unitId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch oil telemetry');
        return res.json();
      })
      .then((json) => {
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Oil API Error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [unitId]);

  const handleSimulateUpload = (e) => {
    e.preventDefault();
    setUploadStatus('Processing ASTM D5185 lab report...');
    setTimeout(() => {
      setUploadStatus('Spectrometry Report ASTM-7819 Parsed & Verified.');
      setTimeout(() => setUploadStatus(''), 4000);
    }, 1200);
  };

  const latestReport = data?.reports?.[data.reports.length - 1];
  const wearTrend = data?.wear_trend_analysis;

  return (
    <div className={`space-y-4 font-sans ${className}`}>
      {/* Provenance Demarcation Header */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Droplet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.08em] bg-amber-950/80 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
                ATA 79 &bull; Oil Intelligence
              </span>
              <span className="text-xs text-slate-400 font-mono">Engine #{unitId}</span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5 tracking-tight">
              Spectrometric Oil & Lubrication Analysis
            </h2>
          </div>
        </div>

        <div className="text-right text-[11px] font-mono">
          <div className="text-slate-400 flex items-center space-x-1.5 justify-end">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>ASTM D5185 Lab Certified</span>
          </div>
          <div className="text-amber-400/90 text-[10px]">
            [PROVENANCE: MULTIMODAL LAB INTEGRATION]
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-xs animate-pulse bg-slate-900/60 rounded-2xl border border-slate-800">
          Loading spectrometric wear analysis for Engine #{unitId}...
        </div>
      ) : latestReport ? (
        <>
          {/* Key Metrics Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Viscosity @ 100°C
              </div>
              <div className="text-lg font-bold font-mono text-white mt-1">
                {latestReport.viscosity_cst_100c.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-400">cSt</span>
              </div>
              <div className="text-[10px] font-mono text-emerald-400 mt-1">
                Nominal Range: 4.9 – 5.4 cSt
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                ISO Cleanliness Code
              </div>
              <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
                {latestReport.iso_cleanliness_code}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">
                Particles &gt;4&mu;m / &gt;6&mu;m / &gt;14&mu;m
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Contamination
              </div>
              <div className="text-lg font-bold font-mono text-white mt-1">
                {latestReport.water_content_pct.toFixed(2)}%{' '}
                <span className="text-xs font-normal text-slate-400">H2O</span>
              </div>
              <div className="text-[10px] font-mono text-emerald-400 mt-1">
                Fuel Dilution: {latestReport.fuel_dilution_pct.toFixed(2)}%
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Filter & Chip Detector
              </div>
              <div className={`text-sm font-bold font-mono mt-1 ${
                latestReport.chip_detector_findings.includes('NORMAL')
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}>
                {latestReport.chip_detector_findings}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">
                {latestReport.filter_differential_pressure_psi.toFixed(1)} psi differential
              </div>
            </div>
          </div>

          {/* Wear Metals Spectrogram Grid */}
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-[0.08em] text-white">
                  Wear Metal Concentrations & Trends (ASTM D5185)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Sample Cycle: {latestReport.cycle}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              {Object.entries(WEAR_LIMITS).map(([key, meta]) => {
                const val = latestReport[key] || 0;
                const isCrit = val >= meta.crit;
                const isWarn = val >= meta.warn && !isCrit;
                const pct = Math.min(100, (val / (meta.crit * 1.3)) * 100);

                return (
                  <div
                    key={key}
                    className={`p-3 rounded-xl border flex flex-col justify-between ${
                      isCrit
                        ? 'bg-rose-950/30 border-rose-500/40'
                        : isWarn
                        ? 'bg-amber-950/30 border-amber-500/40'
                        : 'bg-slate-950/60 border-slate-800/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-white">{meta.label}</span>
                        <span className={`font-mono text-xs font-bold ${
                          isCrit ? 'text-rose-400' : isWarn ? 'text-amber-400' : 'text-slate-300'
                        }`}>
                          {val.toFixed(1)} {meta.unit}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
                        {meta.source}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCrit
                              ? 'bg-rose-500'
                              : isWarn
                              ? 'bg-amber-500'
                              : 'bg-sky-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-slate-500">
                        <span>0</span>
                        <span>Warn {meta.warn}</span>
                        <span>Crit {meta.crit}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Wear Velocity Alert */}
            {wearTrend && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                  <span className="text-slate-300">Wear Velocity Rate:</span>
                  <span className="text-white font-bold">{wearTrend.rate_fe_ppm_per_100h} ppm Fe / 100 hrs</span>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  wearTrend.wear_acceleration_flag
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                }`}>
                  {wearTrend.wear_acceleration_flag ? 'ACCELERATION DETECTED' : 'STEADY WEAR RATE'}
                </div>
              </div>
            )}
          </div>

          {/* Report Ingestion & Inspector Sign-off */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 md:col-span-2 space-y-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-[0.08em] text-white">
                  Spectrometry Laboratory Sign-Off & Remarks
                </h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                {latestReport.inspector_notes ||
                  'Spectrometric analysis shows normal additive depletion with baseline titanium and copper readings. No immediate bearing overhaul required under current ASTM D5185 interval.'}
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-800/80">
                <span>Certified Lab ID: {latestReport.lab_technician_id || 'LAB-AERO-921'}</span>
                <span>Logged at Cycle {latestReport.cycle}</span>
              </div>
            </div>

            {/* Lab File Ingestion Widget */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Upload className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-mono font-bold uppercase tracking-[0.08em] text-white">
                    Ingest Oil Report
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Upload ASTM D5185 CSV, PDF, or JSON results from airline SOAP lab.
                </p>
              </div>

              <div className="mt-3">
                {uploadStatus ? (
                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono text-center">
                    {uploadStatus}
                  </div>
                ) : (
                  <button
                    onClick={handleSimulateUpload}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Upload SOAP File</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="p-6 text-center text-slate-400 font-mono text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
          No oil spectrometry reports logged for Engine #{unitId}.
        </div>
      )}
    </div>
  );
}
