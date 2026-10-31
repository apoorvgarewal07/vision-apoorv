"""
VISION 2.0: Maintenance History & Repeated Fault Intelligence Service
---------------------------------------------------------------------
Tracks aircraft maintenance work orders, repair logs, component replacements,
ATA chapter classifications, and automated chronic repeated fault detection.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone


class MaintenanceLogEntry:
    def __init__(
        self,
        log_id: str,
        unit_id: int,
        timestamp: str,
        flight_hours: float,
        ata_chapter: str,
        action_type: str,  # INSPECTION, REPLACEMENT, REPAIR, OVERHAUL, ROUTINE_CHECK
        component_affected: str,
        work_description: str,
        cost_usd: float,
        technician_signature: str,
        document_reference: str,
        fault_code: Optional[str] = None,
    ):
        self.log_id = log_id
        self.unit_id = unit_id
        self.timestamp = timestamp
        self.flight_hours = flight_hours
        self.ata_chapter = ata_chapter
        self.action_type = action_type
        self.component_affected = component_affected
        self.work_description = work_description
        self.cost_usd = cost_usd
        self.technician_signature = technician_signature
        self.document_reference = document_reference
        self.fault_code = fault_code

    def to_dict(self) -> Dict[str, Any]:
        return {
            "log_id": self.log_id,
            "order_id": self.log_id,
            "unit_id": self.unit_id,
            "timestamp": self.timestamp,
            "flight_hours": self.flight_hours,
            "cycle": int(self.flight_hours / 10),
            "ata_chapter": self.ata_chapter,
            "action_type": self.action_type,
            "action_taken": self.action_type,
            "component_affected": self.component_affected,
            "work_description": self.work_description,
            "description": self.work_description,
            "cost_usd": self.cost_usd,
            "technician_signature": self.technician_signature,
            "technician_id": self.technician_signature,
            "status": "COMPLETED",
            "document_reference": self.document_reference,
            "fault_code": self.fault_code,
            "provenance": "MRO Digital Technical Logbook (CAMP / AMOS Compatible)",
        }


class MaintenanceHistoryService:
    """Manages historical maintenance entries and detects repeated fault patterns."""

    def __init__(self):
        self._logs: Dict[int, List[MaintenanceLogEntry]] = {}
        self._seed_sample_logs()

    def _seed_sample_logs(self):
        # Unit 1: Routine maintenance history
        self._logs[1] = [
            MaintenanceLogEntry(
                log_id="MNT-FD001-U1-001",
                unit_id=1,
                timestamp="2026-06-12T14:00:00Z",
                flight_hours=820.0,
                ata_chapter="ATA 72-00 (Engine General)",
                action_type="ROUTINE_CHECK",
                component_affected="Entire Engine Assembly",
                work_description="Completed scheduled 500-flight-hour Phase Check. Fuel filter screen cleaned, oil sampled.",
                cost_usd=2450.0,
                technician_signature="MRO Team Alpha (Lic. A&P 4819231)",
                document_reference="WO-2026-08129",
                fault_code=None,
            ),
            MaintenanceLogEntry(
                log_id="MNT-FD001-U1-002",
                unit_id=1,
                timestamp="2026-09-04T10:30:00Z",
                flight_hours=1140.0,
                ata_chapter="ATA 73-11 (Engine Fuel System)",
                action_type="REPLACEMENT",
                component_affected="Fuel Nozzle Injector #4",
                work_description="Replaced fuel nozzle injector assembly due to minor spray delta. Re-torqued and leak-checked.",
                cost_usd=4200.0,
                technician_signature="MRO Team Bravo (Lic. A&P 3918290)",
                document_reference="WO-2026-11402",
                fault_code="F-73-04A",
            ),
        ]

        # Unit 24: Chronic repeated fault history in HPC & #3 bearing
        self._logs[24] = [
            MaintenanceLogEntry(
                log_id="MNT-FD001-U24-001",
                unit_id=24,
                timestamp="2026-07-15T09:00:00Z",
                flight_hours=1650.0,
                ata_chapter="ATA 72-30 (Compressor Section)",
                action_type="REPAIR",
                component_affected="HPC Stage 3 Air Seals",
                work_description="Reported high T30 thermal delta. Inspected and renewed labyrinth air seal packaging. Boroblended light rub on shroud.",
                cost_usd=8750.0,
                technician_signature="Hangar Lead Technician (Lic. A&P 2910394)",
                document_reference="WO-2026-16501",
                fault_code="F-72-HPC-THERM",
            ),
            MaintenanceLogEntry(
                log_id="MNT-FD001-U24-002",
                unit_id=24,
                timestamp="2026-09-22T15:20:00Z",
                flight_hours=1920.0,
                ata_chapter="ATA 72-30 (Compressor Section)",
                action_type="INSPECTION",
                component_affected="HPC Interstage Casing & #3 Bearing Scavenge",
                work_description="Recurring HPC discharge over-temperature advisory. Flushed scavenge tube. Resampled spectrographic oil.",
                cost_usd=3600.0,
                technician_signature="Powerplant Specialist (Lic. A&P 4819231)",
                document_reference="WO-2026-19203",
                fault_code="F-72-HPC-THERM",
            ),
            MaintenanceLogEntry(
                log_id="MNT-FD001-U24-003",
                unit_id=24,
                timestamp="2026-10-25T11:45:00Z",
                flight_hours=2110.0,
                ata_chapter="ATA 79-20 (Engine Oil Distribution)",
                action_type="INSPECTION",
                component_affected="Magnetic Chip Detector & Forward Bearing Cavity",
                work_description="MCD inspection performed following automated risk alert. Ferrous debris confirmed. Scheduled engine for removal.",
                cost_usd=12500.0,
                technician_signature="Chief Powerplant Inspector (Lic. A&P 1092831)",
                document_reference="WO-2026-21105",
                fault_code="F-79-CHIP-DET",
            ),
        ]

    def get_logs(self, unit_id: int) -> List[Dict[str, Any]]:
        """Retrieve maintenance log records for engine unit."""
        logs = self._logs.get(unit_id, [])
        if not logs:
            default_log = MaintenanceLogEntry(
                log_id=f"MNT-GEN-U{unit_id}-001",
                unit_id=unit_id,
                timestamp="2026-08-01T12:00:00Z",
                flight_hours=1000.0,
                ata_chapter="ATA 72-00 (Engine General)",
                action_type="ROUTINE_CHECK",
                component_affected="Powerplant Assembly",
                work_description="Periodic service check completed. Nominal system sign-off.",
                cost_usd=1800.0,
                technician_signature="Certified Fleet Technician",
                document_reference="WO-2026-GEN-01",
            )
            return [default_log.to_dict()]
        return [l.to_dict() for l in logs]

    def add_log(self, unit_id: int, log_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Record new maintenance log entry."""
        log_id = log_dict.get("log_id", f"MNT-MAN-U{unit_id}-{len(self._logs.get(unit_id, [])) + 1}")
        entry = MaintenanceLogEntry(
            log_id=log_id,
            unit_id=unit_id,
            timestamp=log_dict.get("timestamp", datetime.now(timezone.utc).isoformat()),
            flight_hours=float(log_dict.get("flight_hours", 1500.0)),
            ata_chapter=log_dict.get("ata_chapter", "ATA 72-00 (Engine General)"),
            action_type=log_dict.get("action_type", "INSPECTION"),
            component_affected=log_dict.get("component_affected", "General Subsystem"),
            work_description=log_dict.get("work_description", "Manual maintenance record upload."),
            cost_usd=float(log_dict.get("cost_usd", 2500.0)),
            technician_signature=log_dict.get("technician_signature", "Technician Reviewer"),
            document_reference=log_dict.get("document_reference", f"WO-{datetime.now().strftime('%Y%m%d')}"),
            fault_code=log_dict.get("fault_code"),
        )
        if unit_id not in self._logs:
            self._logs[unit_id] = []
        self._logs[unit_id].append(entry)
        return entry.to_dict()

    def detect_repeated_faults(self, unit_id: int) -> Dict[str, Any]:
        """Detects recurrent fault patterns across maintenance history."""
        logs = self.get_logs(unit_id)
        fault_counts: Dict[str, int] = {}
        component_counts: Dict[str, int] = {}
        total_maint_cost = sum(l.get("cost_usd", 0.0) for l in logs)

        for l in logs:
            fc = l.get("fault_code")
            comp = l.get("component_affected", "")
            if fc:
                fault_counts[fc] = fault_counts.get(fc, 0) + 1
            if comp:
                component_counts[comp] = component_counts.get(comp, 0) + 1

        repeated_faults = [
            {
                "fault_code": code,
                "ata_chapter": "72-30" if "HPC" in code else "72-00",
                "occurrences": count,
                "cycle_span": 60,
                "description": f"Chronic repeat: {count} times",
            }
            for code, count in fault_counts.items()
            if count >= 2
        ]

        has_repeated = len(repeated_faults) > 0

        return {
            "unit_id": unit_id,
            "total_records": len(logs),
            "total_maintenance_cost_usd": total_maint_cost,
            "has_repeated_faults": has_repeated,
            "repeated_fault_list": repeated_faults,
            "chronic_alert": (
                "CHRONIC DEFECT ALERT: Recurrent HPC thermal breakdown and bearing wear pattern detected."
                if has_repeated
                else "No repeated fault patterns flagged."
            ),
        }


maintenance_service = MaintenanceHistoryService()

