"""
VISION 2.0: Visual Inspection & Borescope Intelligence Service
--------------------------------------------------------------
Tracks internal optical borescope inspection findings, blade surface defects,
thermal barrier coating (TBC) spallation, cracks, and technician findings.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone


class VisualInspectionRecord:
    def __init__(
        self,
        inspection_id: str,
        unit_id: int,
        component_id: str,  # fan, lpc, hpc, combustor, hpt, lpt
        stage_location: str,
        timestamp: str,
        defect_type: str,  # BLADE_EROSION, TBC_SPALLATION, MICRO_CRACK, FOD_NICK, NOMINAL
        severity_grade: int,  # 1 (minor) to 5 (critical limit exceedance)
        measurement_mm: float,
        technician_id: str,
        action_required: str,
        image_url: str,
        findings_summary: str,
        status: str,  # HEALTHY, ABNORMAL, MONITOR
    ):
        self.inspection_id = inspection_id
        self.unit_id = unit_id
        self.component_id = component_id
        self.stage_location = stage_location
        self.timestamp = timestamp
        self.defect_type = defect_type
        self.severity_grade = severity_grade
        self.measurement_mm = measurement_mm
        self.technician_id = technician_id
        self.action_required = action_required
        self.image_url = image_url
        self.findings_summary = findings_summary
        self.status = status

    def to_dict(self) -> Dict[str, Any]:
        return {
            "inspection_id": self.inspection_id,
            "unit_id": self.unit_id,
            "component_id": self.component_id,
            "stage_location": self.stage_location,
            "timestamp": self.timestamp,
            "defect_type": self.defect_type,
            "severity_grade": self.severity_grade,
            "measurement_mm": self.measurement_mm,
            "technician_id": self.technician_id,
            "action_required": self.action_required,
            "image_url": self.image_url,
            "findings_summary": self.findings_summary,
            "status": self.status,
            "provenance": "Certified FAA Powerplant Borescope Video-Probe",
        }


class VisualInspectionService:
    """Manages visual and borescope inspection records across the turbofan fleet."""

    def __init__(self):
        self._records: Dict[int, List[VisualInspectionRecord]] = {}
        self._seed_sample_inspections()

    def _seed_sample_inspections(self):
        # Unit 1: Nominal inspection findings
        self._records[1] = [
            VisualInspectionRecord(
                inspection_id="VIS-FD001-U1-01",
                unit_id=1,
                component_id="hpc",
                stage_location="HPC Stage 5 Rotor Blades",
                timestamp="2026-10-18T11:20:00Z",
                defect_type="BLADE_EROSION",
                severity_grade=1,
                measurement_mm=0.2,
                technician_id="TECH-A342 (Powerplant Lead)",
                action_required="Log and release for flight. Reschedule inspection at C-check.",
                image_url="/assets/borescope/hpc_stg5_nominal.jpg",
                findings_summary="Minor leading-edge sand erosion within AMM Chapter 72 serviceable limits. No cracks or tears.",
                status="HEALTHY",
            ),
            VisualInspectionRecord(
                inspection_id="VIS-FD001-U1-02",
                unit_id=1,
                component_id="combustor",
                stage_location="Combustion Dome Swirler #6",
                timestamp="2026-10-18T12:05:00Z",
                defect_type="NOMINAL",
                severity_grade=1,
                measurement_mm=0.0,
                technician_id="TECH-A342",
                action_required="None. Clean flowpath.",
                image_url="/assets/borescope/combustor_swirl.jpg",
                findings_summary="Even fuel spray pattern. No carbon build-up or liner burn-through.",
                status="HEALTHY",
            ),
        ]

        # Unit 24: Critical inspection findings (HPC rub & HPT TBC spallation)
        self._records[24] = [
            VisualInspectionRecord(
                inspection_id="VIS-FD001-U24-01",
                unit_id=24,
                component_id="hpc",
                stage_location="HPC Stage 4 & 5 Rotor Tips & Shroud",
                timestamp="2026-10-29T09:15:00Z",
                defect_type="TIP_RUB_AND_GROOVING",
                severity_grade=4,
                measurement_mm=1.85,
                technician_id="TECH-B819 (Senior Inspector)",
                action_required="IMMEDIATE BORESCOPE BLEND OR ROTOR REPLACEMENT. Exceeds standard 1.2mm wear limit.",
                image_url="/assets/borescope/hpc_rub_heavy.jpg",
                findings_summary="Heavy circumferential rub marks on abradable casing liner. Thermal discoloration indicative of secondary seal leak and hot gas bypass.",
                status="ABNORMAL",
            ),
            VisualInspectionRecord(
                inspection_id="VIS-FD001-U24-02",
                unit_id=24,
                component_id="hpt",
                stage_location="HPT Stage 1 Nozzle Guide Vanes",
                timestamp="2026-10-29T10:30:00Z",
                defect_type="TBC_SPALLATION",
                severity_grade=4,
                measurement_mm=3.4,
                technician_id="TECH-B819",
                action_required="Engine grounding recommended. Stage replacement required before dispatch.",
                image_url="/assets/borescope/hpt_tbc_loss.jpg",
                findings_summary="Severe thermal barrier coating (TBC) flaking exposing base nickel-chromium superalloy to peak flame temperatures.",
                status="ABNORMAL",
            ),
        ]

    def get_inspections(self, unit_id: int) -> List[Dict[str, Any]]:
        """Retrieve all visual and borescope inspection records for an engine."""
        recs = self._records.get(unit_id, [])
        if not recs:
            # Baseline placeholder inspection
            default_rec = VisualInspectionRecord(
                inspection_id=f"VIS-GEN-U{unit_id}-01",
                unit_id=unit_id,
                component_id="fan",
                stage_location="Fan Blades & Intake Spinner",
                timestamp=datetime.now(timezone.utc).isoformat(),
                defect_type="NOMINAL",
                severity_grade=1,
                measurement_mm=0.0,
                technician_id="TECH-GEN-01",
                action_required="Continue normal line operations.",
                image_url="/assets/borescope/fan_clean.jpg",
                findings_summary="Visual pre-flight check complete. No bird strike, blade deformation, or acoustic panel delamination.",
                status="HEALTHY",
            )
            return [default_rec.to_dict()]
        return [r.to_dict() for r in recs]

    def add_inspection(self, unit_id: int, inspection_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Record new borescope inspection finding."""
        insp_id = inspection_dict.get(
            "inspection_id", f"VIS-MAN-U{unit_id}-{len(self._records.get(unit_id, [])) + 1}"
        )
        sev = int(inspection_dict.get("severity_grade", 1))
        status = "ABNORMAL" if sev >= 3 else "HEALTHY"

        rec = VisualInspectionRecord(
            inspection_id=insp_id,
            unit_id=unit_id,
            component_id=inspection_dict.get("component_id", "hpc"),
            stage_location=inspection_dict.get("stage_location", "General Inspection Port"),
            timestamp=inspection_dict.get("timestamp", datetime.now(timezone.utc).isoformat()),
            defect_type=inspection_dict.get("defect_type", "MICRO_CRACK"),
            severity_grade=sev,
            measurement_mm=float(inspection_dict.get("measurement_mm", 0.5)),
            technician_id=inspection_dict.get("technician_id", "Field Inspector"),
            action_required=inspection_dict.get("action_required", "Monitor next scheduled C-check"),
            image_url=inspection_dict.get("image_url", "/assets/borescope/sample.jpg"),
            findings_summary=inspection_dict.get("findings_summary", "Manual technician upload."),
            status=status,
        )

        if unit_id not in self._records:
            self._records[unit_id] = []
        self._records[unit_id].append(rec)
        return rec.to_dict()

    def get_summary(self, unit_id: int) -> Dict[str, Any]:
        """Summary of active visual inspection condition and open alerts."""
        recs = self.get_inspections(unit_id)
        abnormal_count = sum(1 for r in recs if r["status"] == "ABNORMAL")
        max_severity = max((r["severity_grade"] for r in recs), default=1)

        critical_issues = [r["findings_summary"] for r in recs if r["status"] == "ABNORMAL"]

        return {
            "unit_id": unit_id,
            "total_inspections": len(recs),
            "abnormal_findings": abnormal_count,
            "max_severity_grade": max_severity,
            "inspection_status": "ABNORMAL" if abnormal_count > 0 else "HEALTHY",
            "open_alerts": critical_issues,
            "last_inspection_date": recs[-1]["timestamp"] if recs else None,
        }


inspection_service = VisualInspectionService()
