"""
VISION 2.0: Oil & Lubrication Intelligence Service
--------------------------------------------------
Manages spectrographic oil analysis, metallic wear debris tracking,
contamination indices, filter findings, and abnormal wear trend detection.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone


class OilReport:
    def __init__(
        self,
        report_id: str,
        unit_id: int,
        timestamp: str,
        flight_hours: float,
        viscosity_40c: float,
        viscosity_100c: float,
        iron_fe_ppm: float,
        copper_cu_ppm: float,
        chromium_cr_ppm: float,
        aluminum_al_ppm: float,
        titanium_ti_ppm: float,
        water_content_pct: float,
        fuel_dilution_pct: float,
        iso_cleanliness_code: str,
        filter_debris_finding: str,
        consumption_qt_per_hr: float,
        status: str,
        notes: str,
        source: str = "Lab Spectrometry (Spectroil Q100)"
    ):
        self.report_id = report_id
        self.unit_id = unit_id
        self.timestamp = timestamp
        self.flight_hours = flight_hours
        self.viscosity_40c = viscosity_40c
        self.viscosity_100c = viscosity_100c
        self.iron_fe_ppm = iron_fe_ppm
        self.copper_cu_ppm = copper_cu_ppm
        self.chromium_cr_ppm = chromium_cr_ppm
        self.aluminum_al_ppm = aluminum_al_ppm
        self.titanium_ti_ppm = titanium_ti_ppm
        self.water_content_pct = water_content_pct
        self.fuel_dilution_pct = fuel_dilution_pct
        self.iso_cleanliness_code = iso_cleanliness_code
        self.filter_debris_finding = filter_debris_finding
        self.consumption_qt_per_hr = consumption_qt_per_hr
        self.status = status
        self.notes = notes
        self.source = source

    def to_dict(self) -> Dict[str, Any]:
        return {
            "report_id": self.report_id,
            "unit_id": self.unit_id,
            "timestamp": self.timestamp,
            "flight_hours": self.flight_hours,
            "viscosity_40c": self.viscosity_40c,
            "viscosity_100c": self.viscosity_100c,
            "viscosity_cst_40c": self.viscosity_40c,
            "viscosity_cst_100c": self.viscosity_100c,
            "iron_fe_ppm": self.iron_fe_ppm,
            "copper_cu_ppm": self.copper_cu_ppm,
            "chromium_cr_ppm": self.chromium_cr_ppm,
            "aluminum_al_ppm": self.aluminum_al_ppm,
            "titanium_ti_ppm": self.titanium_ti_ppm,
            "water_content_pct": self.water_content_pct,
            "fuel_dilution_pct": self.fuel_dilution_pct,
            "iso_cleanliness_code": self.iso_cleanliness_code,
            "chip_detector_findings": self.filter_debris_finding,
            "filter_differential_pressure_psi": 3.8 if self.status == "HEALTHY" else 6.2,
            "cycle": int(self.flight_hours / 10),
            "inspector_notes": self.notes,
            "lab_technician_id": "LAB-AERO-921",
            "spectrometry_metals_ppm": {
                "iron_fe": self.iron_fe_ppm,
                "copper_cu": self.copper_cu_ppm,
                "chromium_cr": self.chromium_cr_ppm,
                "aluminum_al": self.aluminum_al_ppm,
                "titanium_ti": self.titanium_ti_ppm,
            },
            "contamination": {
                "water_pct": self.water_content_pct,
                "fuel_dilution_pct": self.fuel_dilution_pct,
                "iso_code": self.iso_cleanliness_code,
            },
            "filter_inspection": self.filter_debris_finding,
            "consumption_rate_qt_hr": self.consumption_qt_per_hr,
            "status": self.status,
            "notes": self.notes,
            "provenance": self.source,
        }


class OilIntelligenceService:
    """Manages spectrographic oil analysis records and anomaly wear detection."""

    def __init__(self):
        self._reports: Dict[int, List[OilReport]] = {}
        self._seed_sample_reports()

    def _seed_sample_reports(self):
        """Seed realistic domain telemetry for key units."""
        # Unit 1: Normal oil condition baseline
        self._reports[1] = [
            OilReport(
                report_id="OIL-FD001-U1-01",
                unit_id=1,
                timestamp="2026-10-15T08:30:00Z",
                flight_hours=1240.5,
                viscosity_40c=24.8,
                viscosity_100c=5.1,
                iron_fe_ppm=8.2,
                copper_cu_ppm=3.4,
                chromium_cr_ppm=1.1,
                aluminum_al_ppm=4.2,
                titanium_ti_ppm=0.8,
                water_content_pct=0.02,
                fuel_dilution_pct=0.25,
                iso_cleanliness_code="15/13/10",
                filter_debris_finding="Clean - Microscopic carbon trace only",
                consumption_qt_per_hr=0.18,
                status="HEALTHY",
                notes="Normal routine 100-hour spectrographic sample. All metals within nominal thresholds.",
            ),
            OilReport(
                report_id="OIL-FD001-U1-02",
                unit_id=1,
                timestamp="2026-10-28T14:15:00Z",
                flight_hours=1345.0,
                viscosity_40c=25.2,
                viscosity_100c=5.2,
                iron_fe_ppm=9.8,
                copper_cu_ppm=4.1,
                chromium_cr_ppm=1.4,
                aluminum_al_ppm=4.8,
                titanium_ti_ppm=1.1,
                water_content_pct=0.03,
                fuel_dilution_pct=0.30,
                iso_cleanliness_code="16/14/11",
                filter_debris_finding="Clean - No magnetic chip detector (MCD) activation",
                consumption_qt_per_hr=0.19,
                status="HEALTHY",
                notes="Stable wear metals. Clean scavenge filter screen.",
            )
        ]

        # Unit 24: Critical unit with bearing degradation (accelerated Fe/Cu accumulation)
        self._reports[24] = [
            OilReport(
                report_id="OIL-FD001-U24-01",
                unit_id=24,
                timestamp="2026-10-20T10:00:00Z",
                flight_hours=2105.0,
                viscosity_40c=23.6,
                viscosity_100c=4.8,
                iron_fe_ppm=18.5,
                copper_cu_ppm=11.2,
                chromium_cr_ppm=2.8,
                aluminum_al_ppm=8.1,
                titanium_ti_ppm=2.3,
                water_content_pct=0.04,
                fuel_dilution_pct=0.45,
                iso_cleanliness_code="17/15/12",
                filter_debris_finding="Few magnetic micro-flakes on #3 bearing scavenge screen",
                consumption_qt_per_hr=0.28,
                status="ABNORMAL",
                notes="Fe wear metal elevation observed (+4.5 ppm over previous interval). Recommend resampling in 25 cycles.",
            ),
            OilReport(
                report_id="OIL-FD001-U24-02",
                unit_id=24,
                timestamp="2026-10-30T16:45:00Z",
                flight_hours=2135.2,
                viscosity_40c=22.1,
                viscosity_100c=4.6,
                iron_fe_ppm=39.4,
                copper_cu_ppm=28.7,
                chromium_cr_ppm=4.2,
                aluminum_al_ppm=12.6,
                titanium_ti_ppm=4.9,
                water_content_pct=0.08,
                fuel_dilution_pct=0.85,
                iso_cleanliness_code="19/17/14",
                filter_debris_finding="Magnetic Chip Detector (MCD) triggered: Ferrous slivers found on HPC forward bearing return",
                consumption_qt_per_hr=0.46,
                status="ABNORMAL",
                notes="CRITICAL WEAR EXCEEDANCE: Fe > 35 ppm, Cu > 25 ppm. Indicates active bronze cage and steel race breakdown in #3 bearing.",
            )
        ]

    def get_reports(self, unit_id: int) -> List[Dict[str, Any]]:
        """Retrieve historical oil analysis reports for engine unit."""
        reports = self._reports.get(unit_id, [])
        if not reports:
            # Generate baseline report for units without explicit history
            default_report = OilReport(
                report_id=f"OIL-GEN-U{unit_id}-01",
                unit_id=unit_id,
                timestamp=datetime.now(timezone.utc).isoformat(),
                flight_hours=1500.0,
                viscosity_40c=25.0,
                viscosity_100c=5.1,
                iron_fe_ppm=11.0,
                copper_cu_ppm=5.0,
                chromium_cr_ppm=1.5,
                aluminum_al_ppm=5.0,
                titanium_ti_ppm=1.0,
                water_content_pct=0.02,
                fuel_dilution_pct=0.2,
                iso_cleanliness_code="15/13/10",
                filter_debris_finding="Clean - Nominal scavenge pressure",
                consumption_qt_per_hr=0.20,
                status="HEALTHY",
                notes="Baseline spectrographic profile within OEM limit boundaries.",
            )
            return [default_report.to_dict()]
        return [r.to_dict() for r in reports]

    def add_report(self, unit_id: int, report_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Manually or programmatically append an oil analysis report."""
        rep_id = report_dict.get("report_id", f"OIL-MAN-U{unit_id}-{len(self._reports.get(unit_id, [])) + 1}")
        metals = report_dict.get("spectrometry_metals_ppm", {})
        contamination = report_dict.get("contamination", {})

        fe = float(metals.get("iron_fe", report_dict.get("iron_fe_ppm", 10.0)))
        cu = float(metals.get("copper_cu", report_dict.get("copper_cu_ppm", 4.0)))

        status = "ABNORMAL" if fe > 30.0 or cu > 20.0 else "HEALTHY"

        report = OilReport(
            report_id=rep_id,
            unit_id=unit_id,
            timestamp=report_dict.get("timestamp", datetime.now(timezone.utc).isoformat()),
            flight_hours=float(report_dict.get("flight_hours", 1800.0)),
            viscosity_40c=float(report_dict.get("viscosity_40c", 25.0)),
            viscosity_100c=float(report_dict.get("viscosity_100c", 5.0)),
            iron_fe_ppm=fe,
            copper_cu_ppm=cu,
            chromium_cr_ppm=float(metals.get("chromium_cr", report_dict.get("chromium_cr_ppm", 1.5))),
            aluminum_al_ppm=float(metals.get("aluminum_al", report_dict.get("aluminum_al_ppm", 5.0))),
            titanium_ti_ppm=float(metals.get("titanium_ti", report_dict.get("titanium_ti_ppm", 1.0))),
            water_content_pct=float(contamination.get("water_pct", report_dict.get("water_content_pct", 0.02))),
            fuel_dilution_pct=float(contamination.get("fuel_dilution_pct", report_dict.get("fuel_dilution_pct", 0.2))),
            iso_cleanliness_code=contamination.get("iso_code", report_dict.get("iso_cleanliness_code", "16/14/11")),
            filter_debris_finding=report_dict.get("filter_debris_finding", "Nominal inspection"),
            consumption_qt_per_hr=float(report_dict.get("consumption_rate_qt_hr", 0.22)),
            status=status,
            notes=report_dict.get("notes", "Ingested from lab documentation upload."),
            source="Technician Document Upload",
        )

        if unit_id not in self._reports:
            self._reports[unit_id] = []
        self._reports[unit_id].append(report)
        return report.to_dict()

    def detect_wear_trends(self, unit_id: int) -> Dict[str, Any]:
        """Evaluates wear particle slope and rate-of-change across time series."""
        reports = self._reports.get(unit_id, [])
        if len(reports) < 2:
            latest = reports[0] if reports else None
            is_abnormal = (latest.status == "ABNORMAL") if latest else False
            return {
                "unit_id": unit_id,
                "trend": "STABLE",
                "fe_delta_ppm": 0.0,
                "fe_rate_ppm_per_hr": 0.0,
                "rate_fe_ppm_per_100h": 0.0,
                "wear_severity": "ABNORMAL" if is_abnormal else "NORMAL",
                "wear_acceleration_flag": is_abnormal,
                "recommendation": "Maintain standard 100-hour sampling interval.",
                "affected_subsystem": "HPC Bearings" if is_abnormal else "None",
            }

        sorted_reps = sorted(reports, key=lambda r: r.flight_hours)
        r_prev, r_last = sorted_reps[-2], sorted_reps[-1]

        delta_hours = max(1.0, r_last.flight_hours - r_prev.flight_hours)
        fe_rate = (r_last.iron_fe_ppm - r_prev.iron_fe_ppm) / delta_hours
        cu_rate = (r_last.copper_cu_ppm - r_prev.copper_cu_ppm) / delta_hours

        is_critical = r_last.iron_fe_ppm > 35.0 or r_last.copper_cu_ppm > 25.0 or fe_rate > 0.5
        is_elevated = r_last.iron_fe_ppm > 20.0 or r_last.copper_cu_ppm > 15.0 or fe_rate > 0.2

        if is_critical:
            trend = "ACCELERATED_WEAR_CRITICAL"
            severity = "ABNORMAL"
            rec = "CRITICAL ACTION: Borescope inspect #3 bearing cavity. Check MCD for bronze/ferrous slivers before next flight."
            subsys = "Main Shaft #3 Roller Bearing & Cage"
        elif is_elevated:
            trend = "ELEVATED_WEAR"
            severity = "ABNORMAL"
            rec = "Advisory: Shorten oil sampling to 25-cycle intervals. Monitor scavenge delta pressure."
            subsys = "Compressor Rear Frame Bearings"
        else:
            trend = "NOMINAL_STABLE"
            severity = "HEALTHY"
            rec = "Nominal wear progression. Continue standard sampling schedule."
            subsys = "None"

        return {
            "unit_id": unit_id,
            "trend": trend,
            "fe_rate_ppm_per_hr": round(fe_rate, 3),
            "rate_fe_ppm_per_100h": round(fe_rate * 100, 2),
            "cu_rate_ppm_per_hr": round(cu_rate, 3),
            "latest_fe_ppm": r_last.iron_fe_ppm,
            "latest_cu_ppm": r_last.copper_cu_ppm,
            "wear_severity": severity,
            "wear_acceleration_flag": is_critical or is_elevated,
            "affected_subsystem": subsys,
            "recommendation": rec,
        }


oil_service = OilIntelligenceService()

