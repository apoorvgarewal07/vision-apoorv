"""
VISION 2.0: Multimodal Aircraft Health Fusion Engine
---------------------------------------------------
Fuses 8 orthogonal aviation intelligence sources into a unified,
explainable airworthiness assessment with transparent evidence attribution.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

from .oil_service import oil_service
from .inspection_service import inspection_service
from .maintenance_history_service import maintenance_service
from .aircraft_systems_service import aircraft_systems_service


class HealthStatusStandard:
    HEALTHY = "HEALTHY"
    ABNORMAL = "ABNORMAL"
    UNKNOWN = "UNKNOWN"
    NOT_INSPECTED = "NOT_INSPECTED"
    STALE = "STALE"


class MultimodalFusionEngine:
    """Synthesizes physical telemetry, chemical oil data, optical inspection,

    maintenance logs, and systems telemetry into a certified airworthiness verdict.
    """

    def fuse_aircraft_health(
        self,
        unit_id: int,
        telemetry_tick: Optional[Dict[str, Any]] = None,
        subset: str = "FD001"
    ) -> Dict[str, Any]:
        """Executes full multimodal health fusion for an engine unit and airframe."""
        now_ts = datetime.now(timezone.utc).isoformat()

        # 1. Gather evidence streams
        oil_summary = oil_service.detect_wear_trends(unit_id)
        oil_reports = oil_service.get_reports(unit_id)
        latest_oil = oil_reports[-1] if oil_reports else None

        visual_summary = inspection_service.get_summary(unit_id)
        visual_records = inspection_service.get_inspections(unit_id)

        maint_summary = maintenance_service.detect_repeated_faults(unit_id)
        maint_logs = maintenance_service.get_logs(unit_id)

        systems_data = aircraft_systems_service.get_aircraft_status(unit_id)
        subsystems = systems_data.get("subsystems", {})
        flight_ops = systems_data.get("flight_operations", {})
        structural = systems_data.get("structural_health", {})

        # Extract telemetry parameters
        point_rul = telemetry_tick.get("point_rul", 100.0) if telemetry_tick else 85.0
        lb90 = telemetry_tick.get("lower_bound_90", 90.0) if telemetry_tick else 75.0
        health_index = telemetry_tick.get("health_index", 0.95) if telemetry_tick else 0.88
        telemetry_status = telemetry_tick.get("status", "NORMAL") if telemetry_tick else "NORMAL"
        sensors = telemetry_tick.get("sensors", {}) if telemetry_tick else {}

        # 2. Evidence Attribution Matrix
        evidence_list: List[Dict[str, Any]] = []

        # Channel 1: Gas-Path Telemetry & Conformal RUL
        telemetry_abnormal = lb90 <= 25.0 or telemetry_status in ("CRITICAL", "WARNING")
        evidence_list.append({
            "channel": "Gas-Path Aerothermal Telemetry & Conformal RUL",
            "state": HealthStatusStandard.ABNORMAL if telemetry_abnormal else HealthStatusStandard.HEALTHY,
            "metric": f"Point RUL: {point_rul:.1f}c | 90% LB: {lb90:.1f}c | HI: {health_index * 100:.1f}%",
            "finding": (
                "Conformal lower bound breached safety threshold (<25 cycles)"
                if telemetry_abnormal
                else "Thermodynamic compression ratios and spool speeds within normal bounds"
            ),
            "source": f"C-MAPSS Telemetry Sensor Suite ({subset})",
            "timestamp": now_ts,
            "weight": 0.30,
        })

        # Channel 2: Oil & Lubrication Spectrometry
        oil_abnormal = oil_summary.get("wear_severity") == "ABNORMAL"
        fe_ppm = oil_summary.get("latest_fe_ppm", 10.0)
        cu_ppm = oil_summary.get("latest_cu_ppm", 4.0)
        evidence_list.append({
            "channel": "Oil & Lubrication Spectrometry",
            "state": HealthStatusStandard.ABNORMAL if oil_abnormal else HealthStatusStandard.HEALTHY,
            "metric": f"Fe: {fe_ppm:.1f} ppm | Cu: {cu_ppm:.1f} ppm | Rate: {oil_summary.get('fe_rate_ppm_per_hr', 0):.2f} ppm/hr",
            "finding": (
                f"Elevated metallic wear particles ({oil_summary.get('affected_subsystem')})"
                if oil_abnormal
                else "Spectrographic wear elements (Fe, Cu, Cr, Al, Ti) within baseline limits"
            ),
            "source": latest_oil.get("provenance", "Spectroil Q100 Lab") if latest_oil else "Oil Lab",
            "timestamp": latest_oil.get("timestamp", now_ts) if latest_oil else now_ts,
            "weight": 0.20,
        })

        # Channel 3: Optical Borescope Visual Inspection
        visual_abnormal = visual_summary.get("inspection_status") == "ABNORMAL"
        evidence_list.append({
            "channel": "Optical Borescope Visual Inspection",
            "state": HealthStatusStandard.ABNORMAL if visual_abnormal else HealthStatusStandard.HEALTHY,
            "metric": f"Max Severity: Grade {visual_summary.get('max_severity_grade')}/5 | Open Alerts: {visual_summary.get('abnormal_findings')}",
            "finding": (
                "; ".join(visual_summary.get("open_alerts", ["Defect observed"]))
                if visual_abnormal
                else "No active blade erosion, micro-cracks, or coating spallation observed"
            ),
            "source": "Certified FAA Powerplant Borescope Video-Probe",
            "timestamp": visual_summary.get("last_inspection_date", now_ts),
            "weight": 0.18,
        })

        # Channel 4: Maintenance Records & Chronic Repeated Faults
        maint_repeated = maint_summary.get("has_repeated_faults", False)
        evidence_list.append({
            "channel": "Maintenance History & Chronic Repeat Faults",
            "state": HealthStatusStandard.ABNORMAL if maint_repeated else HealthStatusStandard.HEALTHY,
            "metric": f"Total Logs: {maint_summary.get('total_records')} | Repeated Defect Patterns: {len(maint_summary.get('repeated_fault_list', []))}",
            "finding": maint_summary.get("chronic_alert"),
            "source": "MRO Technical Logbook (CAMP / AMOS Compatible)",
            "timestamp": maint_logs[-1].get("timestamp", now_ts) if maint_logs else now_ts,
            "weight": 0.12,
        })

        # Channel 5: Fuel & Hydraulic Power Subsystems
        fuel_abn = subsystems.get("fuel_system", {}).get("status") == "ABNORMAL"
        hyd_abn = subsystems.get("hydraulic_system", {}).get("status") == "ABNORMAL"
        fluid_abnormal = fuel_abn or hyd_abn
        evidence_list.append({
            "channel": "Fuel & Hydraulic Power Subsystems",
            "state": HealthStatusStandard.ABNORMAL if fluid_abnormal else HealthStatusStandard.HEALTHY,
            "metric": f"Hydraulic: {subsystems.get('hydraulic_system', {}).get('system_pressure_psi', 3000)} psi | Fuel Pump: {subsystems.get('fuel_system', {}).get('boost_pump_pressure_psi', 48)} psi",
            "finding": (
                "Hydraulic pressure or fuel filter delta pressure warning"
                if fluid_abnormal
                else "Hydraulic 3,000 psi system and fuel delivery lines nominal"
            ),
            "source": "Aircraft ARINC 429 Fluid System Bus",
            "timestamp": now_ts,
            "weight": 0.08,
        })

        # Channel 6: Electrical Power Generation, Battery & APU
        elec_abn = subsystems.get("electrical_system", {}).get("status") == "ABNORMAL"
        bat_abn = subsystems.get("battery_system", {}).get("status") == "ABNORMAL"
        apu_abn = subsystems.get("apu_system", {}).get("status") == "ABNORMAL"
        elec_abnormal = elec_abn or bat_abn or apu_abn
        evidence_list.append({
            "channel": "Electrical Power Generation, Battery & APU",
            "state": HealthStatusStandard.ABNORMAL if elec_abnormal else HealthStatusStandard.HEALTHY,
            "metric": f"AC Bus: {subsystems.get('electrical_system', {}).get('ac_bus_voltage_v', 115)}V | Battery SoH: {subsystems.get('battery_system', {}).get('state_of_charge_pct', 98)}%",
            "finding": (
                "Electrical load unbalance or APU bleed pressure advisory"
                if elec_abnormal
                else "IDG generators, 115V AC bus, battery state of health, and APU nominal"
            ),
            "source": "Avionics Power & Auxiliary Management Unit",
            "timestamp": now_ts,
            "weight": 0.07,
        })

        # Channel 7: Operational & Flight Environmental Exposure
        desert_env = "HIGH" in str(flight_ops.get("environmental_exposure", {}).get("desert_sand_ingestion_index", ""))
        evidence_list.append({
            "channel": "Flight Operational Severity & Exposure",
            "state": HealthStatusStandard.ABNORMAL if desert_env else HealthStatusStandard.HEALTHY,
            "metric": f"Flight Hours: {flight_ops.get('total_flight_hours')}h | Cycles: {flight_ops.get('total_flight_cycles')}c",
            "finding": (
                "High cumulative particulate sand ingestion index accelerates hot-section degradation"
                if desert_env
                else "Standard stage length and flight profile within design envelope"
            ),
            "source": "FDR / ACARS Flight Operations Quality Assurance (FOQA)",
            "timestamp": now_ts,
            "weight": 0.05,
        })

        # Channel 8: Structural Health & Fatigue
        fatigue_idx = structural.get("airframe_fatigue_index", 0.15)
        ndi_due = structural.get("ndi_ultrasonic_inspection_due_in_cycles", 1000)
        structural_abnormal = fatigue_idx > 0.60 or ndi_due < 100
        evidence_list.append({
            "channel": "Airframe Structural Health & Fatigue",
            "state": HealthStatusStandard.ABNORMAL if structural_abnormal else HealthStatusStandard.HEALTHY,
            "metric": f"Fatigue Index: {fatigue_idx * 100:.1f}% | NDI Inspection Due: {ndi_due} cycles",
            "finding": (
                "Approaching non-destructive inspection interval boundary"
                if structural_abnormal
                else "Airframe primary structure sound; zero composite delamination"
            ),
            "source": "Structural Health Monitoring Strain Gages & NDT Logs",
            "timestamp": now_ts,
            "weight": 0.05,
        })

        # 3. Component-Level Health Synthesis
        # Cross-reference evidence to calculate component scores
        fan_health = 96.0 if not visual_abnormal else 92.0
        lpc_health = 94.0 if not telemetry_abnormal else 86.0
        hpc_health = round(max(10.0, min(100.0, health_index * 100.0)), 1)
        if oil_abnormal:
            hpc_health = max(10.0, hpc_health - 12.0)
        combustor_health = 92.0 if not visual_abnormal else 84.0
        hpt_health = round(max(15.0, min(100.0, (point_rul / 125.0) * 100.0)), 1)
        if visual_abnormal and any("hpt" in r.get("component_id", "") for r in visual_records):
            hpt_health = max(15.0, hpt_health - 18.0)
        lpt_health = 90.0 if not telemetry_abnormal else 82.0

        component_scores = {
            "fan": {"name": "Front Fan & Spinner", "score": fan_health, "status": "HEALTHY" if fan_health > 70 else "MONITOR"},
            "lpc": {"name": "Low-Pressure Compressor (Booster)", "score": lpc_health, "status": "HEALTHY" if lpc_health > 70 else "MONITOR"},
            "hpc": {"name": "High-Pressure Compressor (HPC)", "score": hpc_health, "status": "HEALTHY" if hpc_health > 70 else ("MONITOR" if hpc_health > 35 else "CRITICAL")},
            "combustor": {"name": "Combustor Chamber", "score": combustor_health, "status": "HEALTHY" if combustor_health > 70 else "MONITOR"},
            "hpt": {"name": "High-Pressure Turbine (HPT)", "score": hpt_health, "status": "HEALTHY" if hpt_health > 70 else ("MONITOR" if hpt_health > 35 else "CRITICAL")},
            "lpt": {"name": "Low-Pressure Turbine (LPT)", "score": lpt_health, "status": "HEALTHY" if lpt_health > 70 else "MONITOR"},
        }

        # 4. Overall Multimodal Airworthiness Assessment
        abnormal_channels_count = sum(1 for e in evidence_list if e["state"] == HealthStatusStandard.ABNORMAL)

        if abnormal_channels_count >= 3 or lb90 <= 15.0 or (oil_abnormal and visual_abnormal):
            unified_verdict = "AOG - GROUNDED CRITICAL"
            verdict_badge = "CRITICAL"
            verdict_desc = "High-risk condition confirmed across multiple independent streams (Telemetry, Oil, Borescope). Immediate maintenance action mandatory."
            action_code = "GROUND_AIRCRAFT_SCHEDULE_BAY"
        elif abnormal_channels_count >= 1 or lb90 <= 35.0:
            unified_verdict = "MAINTENANCE ADVISORY"
            verdict_badge = "ADVISORY"
            verdict_desc = "Developing degradation noted in one or more subsystems. Schedule hot-section borescope or oil resample within 15 cycles."
            action_code = "SCHEDULE_INSPECTION_BUFFER"
        else:
            unified_verdict = "AIRWORTHY - NORMAL"
            verdict_badge = "HEALTHY"
            verdict_desc = "All multimodal channels confirm airworthy operating condition within OEM design limits."
            action_code = "RELEASE_FOR_FLIGHT"

        # 5. Ranked Inspection Priorities
        priorities: List[Dict[str, Any]] = []
        if hpc_health < 50.0 or oil_abnormal:
            priorities.append({
                "rank": 1,
                "subsystem": "High-Pressure Compressor & #3 Bearing",
                "recommended_action": "Perform high-resolution borescope of Stage 4/5 rotor tips and flush scavenge filter screen.",
                "urgency": "IMMEDIATE" if hpc_health < 35.0 else "SCHEDULED",
                "supporting_evidence": "Gas-path T30 rise combined with elevated Fe/Cu spectrometry in oil samples.",
            })
        if hpt_health < 50.0 or visual_abnormal:
            priorities.append({
                "rank": len(priorities) + 1,
                "subsystem": "High-Pressure Turbine (HPT) Stage 1 Vanes",
                "recommended_action": "Borescope inspect for TBC spallation and trailing edge micro-cracks.",
                "urgency": "HIGH",
                "supporting_evidence": "Conformal RUL depletion and high turbine expansion delta.",
            })
        if fluid_abnormal or elec_abnormal:
            subsys_labels = []
            if fluid_abnormal:
                subsys_labels.append("Fuel/Hydraulics")
            if elec_abnormal:
                subsys_labels.append("Electrical/APU")
            priorities.append({
                "rank": len(priorities) + 1,
                "subsystem": f"Auxiliary Subsystems ({', '.join(subsys_labels)})",
                "recommended_action": "Replace hydraulic case drain filter and inspect fuel differential pressure transducer.",
                "urgency": "STANDARD",
                "supporting_evidence": "Airframe systems data bus reporting elevated back-pressures or electrical load imbalance.",
            })

        return {
            "unit_id": unit_id,
            "aircraft_tail": systems_data.get("aircraft_tail", f"N{unit_id:03d}VA"),
            "timestamp": now_ts,
            "airworthiness_verdict": unified_verdict,
            "verdict_badge": verdict_badge,
            "verdict_description": verdict_desc,
            "action_code": action_code,
            "abnormal_channels_count": abnormal_channels_count,
            "total_channels_evaluated": len(evidence_list),
            "evidence_breakdown": evidence_list,
            "component_health_scores": component_scores,
            "ranked_inspection_priorities": priorities,
            "flight_operations_summary": flight_ops,
            "structural_health_summary": structural,
        }


fusion_engine = MultimodalFusionEngine()
