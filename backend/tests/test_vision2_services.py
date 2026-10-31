"""
VISION 2.0: Multimodal Services & Knowledge Graph Integration Test Suite
Validates all Phase 2, 3, and 4 services and endpoints.
"""

import pytest
from services.oil_service import oil_service
from services.inspection_service import inspection_service
from services.maintenance_history_service import maintenance_service
from services.aircraft_systems_service import aircraft_systems_service
from services.fusion_service import fusion_engine
from services.knowledge_graph_service import knowledge_graph_service
from services.decision_service import decision_service


def test_oil_service_telemetry_and_add():
    """Verify ASTM D5185 spectrometry report retrieval and addition."""
    reports = oil_service.get_reports(1)
    assert len(reports) > 0

    latest = reports[-1]
    assert "spectrometry_metals_ppm" in latest
    assert "iron_fe" in latest["spectrometry_metals_ppm"]
    assert "viscosity_100c" in latest
    assert "iso_code" in latest["contamination"]

    # Add a new report
    new_report = oil_service.add_report(
        unit_id=1,
        report_dict={
            "flight_hours": 2100.0,
            "viscosity_40c": 25.5,
            "viscosity_100c": 5.12,
            "spectrometry_metals_ppm": {
                "iron_fe": 15.2,
                "copper_cu": 4.1,
                "chromium_cr": 1.2,
                "aluminum_al": 6.0,
                "titanium_ti": 1.0,
            },
            "contamination": {
                "water_pct": 0.02,
                "fuel_dilution_pct": 0.3,
                "iso_code": "16/14/11",
            },
            "filter_debris_finding": "Clean - Nominal Scavenge",
            "consumption_rate_qt_hr": 0.20,
            "notes": "Verified ASTM test profile.",
        }
    )
    assert new_report["spectrometry_metals_ppm"]["iron_fe"] == 15.2
    assert new_report["viscosity_100c"] == 5.12

    # Trend detection
    trends = oil_service.detect_wear_trends(1)
    assert "trend" in trends
    assert "wear_severity" in trends


def test_inspection_service_and_logging():
    """Verify borescope optical findings grading and defect tracking."""
    recs = inspection_service.get_inspections(1)
    assert len(recs) > 0

    summary = inspection_service.get_summary(1)
    assert summary["total_inspections"] >= 1
    assert 1 <= summary["max_severity_grade"] <= 5

    # Log new inspection
    logged = inspection_service.add_inspection(
        unit_id=1,
        inspection_dict={
            "component_id": "hpc",
            "stage_location": "Stage 4 Stator Vane",
            "severity_grade": 3,
            "defect_type": "TBC_SPALLATION",
            "measurement_mm": 1.2,
            "technician_id": "INSP-TEST-99",
            "findings_summary": "Automated test borescope record",
        }
    )
    assert logged["severity_grade"] == 3
    assert logged["component_id"] == "hpc"


def test_maintenance_history_and_chronic_detection():
    """Verify ATA work orders and automated Chronic Defect Detector."""
    logs = maintenance_service.get_logs(1)
    assert len(logs) > 0

    # Add work order
    wo = maintenance_service.add_log(
        unit_id=1,
        log_dict={
            "flight_hours": 1700.0,
            "ata_chapter": "ATA 72-30 (HPC Rotor & Stator)",
            "action_type": "BLENDING",
            "component_affected": "HPC Stage 4 Stator",
            "work_description": "Blended minor leading edge nick",
            "cost_usd": 3200.0,
            "technician_signature": "TECH-TEST-22",
            "fault_code": "F-HPC-CRACK",
        }
    )
    assert wo["cost_usd"] == 3200.0

    # Test engine with known chronic repeat defect (Unit 24)
    fault_summary = maintenance_service.detect_repeated_faults(24)
    assert "total_records" in fault_summary
    assert "chronic_alert" in fault_summary


def test_aircraft_systems_service():
    """Verify airframe cross-subsystem telemetry and fatigue damage calculation."""
    data = aircraft_systems_service.get_aircraft_status(1)
    assert "subsystems" in data
    assert "flight_operations" in data
    assert "structural_health" in data

    sub = data["subsystems"]
    assert "fuel_system" in sub
    assert "hydraulic_system" in sub
    assert "electrical_system" in sub
    assert "battery_system" in sub
    assert "landing_gear" in sub
    assert "environmental_control_ecs" in sub

    assert sub["hydraulic_system"]["system_pressure_psi"] >= 2800
    assert 0.0 <= data["structural_health"]["airframe_fatigue_index"] <= 1.0


def test_multimodal_fusion_service():
    """Verify multimodal fusion verdict combining all 8 evidence channels."""
    fusion = fusion_engine.fuse_aircraft_health(unit_id=1)
    assert "airworthiness_verdict" in fusion
    assert "evidence_breakdown" in fusion
    assert "component_health_scores" in fusion
    assert "ranked_inspection_priorities" in fusion

    verdict = fusion["airworthiness_verdict"]
    assert "AIRWORTHY" in verdict or "ADVISORY" in verdict or "AOG" in verdict

    # Ensure evidence channels are synthesized
    assert fusion["total_channels_evaluated"] == 8

    # Ensure key engine modules are present in component scores
    scores = fusion["component_health_scores"]
    for mod in ["fan", "lpc", "hpc", "combustor", "hpt", "lpt"]:
        assert mod in scores


def test_knowledge_graph_service():
    """Verify knowledge graph entity-relationship construction and query traversal."""
    graph = knowledge_graph_service.get_full_graph()
    assert "nodes" in graph
    assert "edges" in graph
    assert graph["total_nodes"] > 10
    assert graph["total_edges"] > 10

    # Query graph
    query_res = knowledge_graph_service.query_relationships(query_type="recurring", entity_id="ENG-U24")
    assert "answer" in query_res
    assert "evidence_path" in query_res

    comp_res = knowledge_graph_service.query_relationships(query_type="evidence", entity_id="ENG-U24")
    assert "answer" in comp_res


def test_decision_and_economic_service():
    """Verify economic optimization sandbox and hangar bay allocation."""
    mock_engines = [
        {"unit_id": 1, "predicted_rul": 12.0, "lower_bound_90": 8.0, "current_cycle": 140, "risk_score": 0.85},
        {"unit_id": 2, "predicted_rul": 25.0, "lower_bound_90": 18.0, "current_cycle": 120, "risk_score": 0.55},
        {"unit_id": 3, "predicted_rul": 95.0, "lower_bound_90": 85.0, "current_cycle": 60, "risk_score": 0.10},
    ]

    opt = decision_service.optimize_fleet_decisions(
        engines_data=mock_engines,
        cost_failure=250000.0,
        cost_waste_per_cycle=120.0,
        lead_time=15,
        risk_budget_eps=0.02
    )
    assert "summary" in opt
    assert "allocated_bays" in opt
    assert opt["summary"]["total_engines_evaluated"] == 3
    assert len(opt["allocated_bays"]) > 0
