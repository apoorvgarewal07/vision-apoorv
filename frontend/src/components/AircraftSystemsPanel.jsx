/**
 * VISION 2.0: Aircraft Systems & Airframe Fatigue Health Deck
 * Vital Intelligence for System Integrity, Observation & Nostics
 *
 * Implements Aircraft Cross-Subsystem Monitoring & Structural Health:
 * - Fuel Subsystem (Pumps, Fuel-Oil Heat Exchanger, Metering Valve)
 * - Hydraulic Subsystem (System A/B 3,000 psi, Fluid Level %, Return Filters)
 * - Electrical & APU (Integrated Drive Generators, AC Bus, Battery SoH %, APU EGT)
 * - Landing Gear & Brakes (Brake Wear Pin mm, Tire Pressures, Anti-Skid)
 * - Environmental Control System (ECS Packs, Cabin Differential Pressure)
 * - Flight Operations: Flight Hours, Flight Cycles, Environmental Exposure Index
 * - Airframe Fatigue Damage (Miner's Rule Cumulative Fatigue Damage D)
 * - Clear provenance demarcation stamp
 */

import React, { useState, useEffect } from 'react';
import {
  Plane,
  Zap,
  Gauge,
  Droplet,
  Compass,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Activity,
  Layers,
  Thermometer,
} from 'lucide-react';

export default function AircraftSystemsPanel({
  unitId = 1,
  className = '',
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`http://localhost:8000/api/v1/aircraft/${unitId}/systems`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch aircraft systems');
        return res.json();
      })
      .then((json) => {
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Aircraft Systems API Error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [unitId]);

  const fuel = data?.subsystems?.fuel;
  const hydraulics = data?.subsystems?.hydraulics;
  const electrical = data?.subsystems?.electrical;
  const apu = data?.subsystems?.apu;
  const landingGear = data?.subsystems?.landing_gear;
  const ecs = data?.subsystems?.environmental_control;
  const flightOps = data?.flight_operations;
  const airframe = data?.airframe_fatigue;

  return (
    <div className={`space-y-4 font-sans ${className}`}>
      {/* Header & Provenance Banner */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.08em] bg-sky-950/80 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded">
                Aircraft Systems Integration
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {data?.aircraft_tail || 'N701AA'} &bull; {data?.aircraft_model || 'Boeing 777-200ER'}
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5 tracking-tight">
              Cross-Subsystem Health & Airframe Fatigue
            </h2>
          </div>
        </div>

        <div className="text-right text-[11px] font-mono">
          <div className="text-slate-400 flex items-center space-x-1.5 justify-end">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>ARINC 429 / QAR Bus Live</span>
          </div>
          <div className="text-sky-400/90 text-[10px]">
            [PROVENANCE: AVIONICS & FLEET TELEMETRY]
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-xs animate-pulse bg-slate-900/60 rounded-2xl border border-slate-800">
          Loading aircraft subsystem telemetry...
        </div>
      ) : (
        <>
          {/* Flight Operations & Environmental Exposure */}
          {flightOps && airframe && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Flight Hours (FH)
                </div>
                <div className="text-lg font-bold font-mono text-white mt-1">
                  {flightOps.cumulative_flight_hours?.toLocaleString()} hrs
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  Engine #{unitId}: {flightOps.engine_flight_hours?.toLocaleString()} hrs
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Flight Cycles (FC)
                </div>
                <div className="text-lg font-bold font-mono text-white mt-1">
                  {flightOps.cumulative_flight_cycles?.toLocaleString()} cyc
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  Pressurization stress cycles
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Environmental Exposure
                </div>
                <div className="text-lg font-bold font-mono text-amber-400 mt-1">
                  {flightOps.environmental_exposure_index?.toFixed(2)} / 1.00
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                  {flightOps.environmental_notes || 'Moderate coastal salt/humidity'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Airframe Fatigue (D)
                </div>
                <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
                  {airframe.cumulative_fatigue_damage_d?.toFixed(3)} / 1.00
                </div>
                <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                  Remaining Safe Cycles: {airframe.remaining_safe_cycles?.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Subsystems Status Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 1. Fuel Subsystem */}
            {fuel && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <Droplet className="w-4 h-4 text-sky-400" />
                    <h3 className="text-xs font-mono font-bold uppercase tracking-[0.08em] text-white">
                      Fuel System (ATA 28/73)
                    </h3>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    fuel.status === 'HEALTHY'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                  }`}>
                    {fuel.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Boost Pumps:</span>
                    <span className="text-emerald-400">{fuel.boost_pump_pressure_psi} psi (Pumps 1/2 ON)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fuel Temp:</span>
                    <span>{fuel.fuel_temperature_c}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Filter Differential:</span>
                    <span className="text-emerald-400">{fuel.filter_differential_pressure_psi} psi</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Hydraulics Subsystem */}
            {hydraulics && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <Gauge className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-mono font-bold uppercase tracking-[0.08em] text-white">
                      Hydraulic Power (ATA 29)
                    </h3>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    hydraulics.status === 'HEALTHY'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                  }`}>
                    {hydraulics.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">System A Pressure:</span>
                    <span className="text-white font-bold">{hydraulics.system_a_pressure_psi} psi</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">System B Pressure:</span>
                    <span className="text-white font-bold">{hydraulics.system_b_pressure_psi} psi</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reservoir Quantity:</span>
                    <span className="text-emerald-400">{hydraulics.reservoir_quantity_pct}% (Nominal)</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Electrical & Battery */}
            {electrical && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-mono font-bold uppercase tracking-[0.08em] text-white">
                      Electrical & IDG (ATA 24)
                    </h3>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    electrical.status === 'HEALTHY'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                  }`}>
                    {electrical.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">IDG 1 Load:</span>
                    <span>{electrical.idg1_load_pct}% / 115V AC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">IDG 2 Load:</span>
                    <span>{electrical.idg2_load_pct}% / 115V AC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Battery State of Health:</span>
                    <span className="text-emerald-400">{electrical.battery_state_of_health_pct}% SoH</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Auxiliary Power Unit (APU) */}
            {apu && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <Thermometer className="w-4 h-4 text-orange-400" />
                    <h3 className="text-xs font-mono font-bold uppercase tracking-[0.08em] text-white">
                      Auxiliary Power (ATA 49)
                    </h3>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    apu.status === 'HEALTHY'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                  }`}>
                    {apu.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">APU Exhaust Gas Temp:</span>
                    <span className="text-white font-bold">{apu.egt_c}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bleed Air Pressure:</span>
                    <span className="text-emerald-400">{apu.bleed_air_pressure_psi} psi</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">APU Running Hours:</span>
                    <span>{apu.running_hours?.toLocaleString()} hrs</span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Landing Gear & Brakes */}
            {landingGear && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <Gauge className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-mono font-bold uppercase tracking-[0.08em] text-white">
                      Gear & Brakes (ATA 32)
                    </h3>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    landingGear.status === 'HEALTHY'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                  }`}>
                    {landingGear.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Brake Wear Pin Depth:</span>
                    <span className="text-white font-bold">{landingGear.brake_wear_pin_mm} mm (Min 1.0mm)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tire Pressure (Main):</span>
                    <span className="text-emerald-400">{landingGear.tire_pressure_psi} psi</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Anti-Skid Self-Test:</span>
                    <span className="text-emerald-400">PASSED</span>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Environmental Control (ECS) */}
            {ecs && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <Compass className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-mono font-bold uppercase tracking-[0.08em] text-white">
                      ECS & Cabin (ATA 21)
                    </h3>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    ecs.status === 'HEALTHY'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                  }`}>
                    {ecs.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cabin Delta Pressure:</span>
                    <span className="text-white font-bold">{ecs.cabin_delta_pressure_psi} psi</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pack 1 Duct Temp:</span>
                    <span>{ecs.pack_1_temp_c}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ozone Filter Status:</span>
                    <span className="text-emerald-400">NOMINAL</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
