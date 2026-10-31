/**
 * VISION 2.0: Borescope Optical Inspection Intelligence Panel
 * Vital Intelligence for System Integrity, Observation & Nostics
 *
 * Implements Non-Destructive Optical Examination (NDT):
 * - Module defect severity grading (Grade 1: Nominal to Grade 5: AOG Reject)
 * - Defect categorization: Blade erosion, TBC spallation, Tip shroud rub, Crack measurement (mm)
 * - Visual optical inspection cards for Fan, LPC, HPC, Combustor, HPT, LPT
 * - Certified Inspector ID, sign-off status, and cycle timestamp
 * - Form to log new borescope inspection findings
 * - Clear provenance demarcation stamp
 */

import React, { useState, useEffect } from 'react';
import {
  Eye,
  AlertTriangle,
  CheckCircle2,
  Camera,
  ShieldCheck,
  Search,
  PlusCircle,
  Clock,
  Layers,
  FileCheck,
} from 'lucide-react';

const SEVERITY_GRADES = {
  1: { label: 'Grade 1: Nominal', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  2: { label: 'Grade 2: Minor Wear', color: 'text-sky-400 bg-sky-950/60 border-sky-500/40' },
  3: { label: 'Grade 3: Advisory', color: 'text-amber-400 bg-amber-950/60 border-amber-500/40' },
  4: { label: 'Grade 4: Warning', color: 'text-orange-400 bg-orange-950/60 border-orange-500/40' },
  5: { label: 'Grade 5: AOG Reject', color: 'text-rose-400 bg-rose-950/60 border-rose-500/40' },
};

export default function BorescopeInspectionPanel({
  unitId = 1,
  className = '',
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [showLogModal, setShowLogModal] = useState(false);
  const [formData, setFormData] = useState({
    component: 'hpc',
    severity_grade: 3,
    defect_type: 'TBC Spallation',
    crack_length_mm: 0.0,
    inspector_id: 'INSP-FAA-8812',
    notes: 'Borescope inspection reveals localized coating loss on stage 5 stator blades.',
  });

  const fetchInspections = () => {
    setLoading(true);
    fetch(`http://localhost:8000/api/v1/inspection/${unitId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch inspections');
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Inspection API Error:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInspections();
  }, [unitId]);

  const handleCreateInspection = (e) => {
    e.preventDefault();
    fetch(`http://localhost:8000/api/v1/inspection/${unitId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        unit_id: unitId,
        cycle: (data?.summary?.max_cycle || 100) + 1,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        setShowLogModal(false);
        fetchInspections();
      })
      .catch((err) => console.error(err));
  };

  const inspections = data?.inspections || [];
  const filteredInspections = selectedModule === 'ALL'
    ? inspections
    : inspections.filter((i) => i.component?.toLowerCase() === selectedModule.toLowerCase());

  const summary = data?.summary;

  return (
    <div className={`space-y-4 font-sans ${className}`}>
      {/* Header & Provenance Banner */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.08em] bg-sky-950/80 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded">
                ATA 72 &bull; Optical NDT
              </span>
              <span className="text-xs text-slate-400 font-mono">Engine #{unitId}</span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5 tracking-tight">
              Borescope Optical Inspection Records
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-semibold transition-colors shadow-md shadow-sky-600/20"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Log Inspection</span>
          </button>

          <div className="text-right text-[11px] font-mono hidden sm:block">
            <div className="text-slate-400 flex items-center space-x-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>FAA / EASA Certified NDT</span>
            </div>
            <div className="text-sky-400/90 text-[10px]">
              [PROVENANCE: BORESCOPE OPTICAL FINDINGS]
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Total Inspections
            </div>
            <div className="text-lg font-bold font-mono text-white mt-1">
              {summary.total_records}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              Across all 6 engine modules
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Max Defect Severity
            </div>
            <div className={`text-lg font-bold font-mono mt-1 ${
              summary.max_grade >= 4 ? 'text-rose-400' : summary.max_grade === 3 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              Grade {summary.max_grade} / 5
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              {summary.max_grade >= 4 ? 'Requires Overhaul Action' : 'Within MEL Limits'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Longest Crack Observed
            </div>
            <div className="text-lg font-bold font-mono text-white mt-1">
              {summary.max_crack_length_mm.toFixed(2)}{' '}
              <span className="text-xs font-normal text-slate-400">mm</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              Threshold limit: 2.50 mm
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Inspector Sign-Off
            </div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-1 flex items-center space-x-1">
              <FileCheck className="w-4 h-4" />
              <span>Certified Current</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              Cycle {summary.max_cycle} verified
            </div>
          </div>
        </div>
      )}

      {/* Module Filter Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs font-mono">
        {['ALL', 'fan', 'lpc', 'hpc', 'combustor', 'hpt', 'lpt'].map((mod) => (
          <button
            key={mod}
            onClick={() => setSelectedModule(mod)}
            className={`px-3 py-1 rounded-xl uppercase tracking-[0.08em] transition-all ${
              selectedModule.toLowerCase() === mod.toLowerCase()
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400 font-bold'
                : 'bg-slate-900/90 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            {mod}
          </button>
        ))}
      </div>

      {/* Inspection Records List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-xs animate-pulse bg-slate-900/60 rounded-2xl border border-slate-800">
          Loading borescope optical findings...
        </div>
      ) : filteredInspections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredInspections.map((insp, idx) => {
            const gradeInfo = SEVERITY_GRADES[insp.severity_grade] || SEVERITY_GRADES[1];

            return (
              <div
                key={insp.inspection_id || idx}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        {insp.component} Module
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Cycle {insp.cycle}
                      </span>
                    </div>

                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${gradeInfo.color}`}>
                      {gradeInfo.label}
                    </span>
                  </div>

                  <div className="mt-2 text-xs font-semibold text-slate-200">
                    Defect Classification: <span className="text-sky-300">{insp.defect_type}</span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1 leading-relaxed font-sans">
                    {insp.notes}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center space-x-1">
                    <span>Crack:</span>
                    <strong className={insp.crack_length_mm > 1.5 ? 'text-rose-400' : 'text-slate-300'}>
                      {insp.crack_length_mm ? `${insp.crack_length_mm.toFixed(2)} mm` : 'None detected'}
                    </strong>
                  </div>
                  <div>Inspector: {insp.inspector_id}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 font-mono text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
          No optical findings recorded for selected component filter.
        </div>
      )}

      {/* Log Inspection Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-white uppercase tracking-[0.08em] flex items-center space-x-2">
                <Camera className="w-4 h-4 text-sky-400" />
                <span>Log Optical Borescope Finding</span>
              </h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateInspection} className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Target Component:</label>
                <select
                  value={formData.component}
                  onChange={(e) => setFormData({ ...formData, component: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="fan">Fan & Spinner</option>
                  <option value="lpc">Low-Pressure Compressor (LPC)</option>
                  <option value="hpc">High-Pressure Compressor (HPC)</option>
                  <option value="combustor">Combustor Chamber</option>
                  <option value="hpt">High-Pressure Turbine (HPT)</option>
                  <option value="lpt">Low-Pressure Turbine (LPT)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Defect Severity Grade (1-5):</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.severity_grade}
                  onChange={(e) => setFormData({ ...formData, severity_grade: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Defect Type:</label>
                <input
                  type="text"
                  value={formData.defect_type}
                  onChange={(e) => setFormData({ ...formData, defect_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Crack Length (mm):</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.crack_length_mm}
                  onChange={(e) => setFormData({ ...formData, crack_length_mm: parseFloat(e.target.value) || 0.0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Inspector Notes:</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white h-16 font-sans text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition-colors shadow-md"
                >
                  Save Borescope Finding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
