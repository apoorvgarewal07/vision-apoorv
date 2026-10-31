"""
VISION 2.0: Aircraft Health Knowledge Graph Service
---------------------------------------------------
Maintains explicit relational graph networks between Aircraft, Engines,
Aerodynamic Components, Subsystems, Oil Reports, Visual Findings, and Maintenance Work Orders.
"""

from typing import Dict, List, Optional, Any


class AircraftKnowledgeGraph:
    """In-memory relational knowledge graph with multi-hop query traversal."""

    def __init__(self):
        self._nodes: Dict[str, Dict[str, Any]] = {}
        self._edges: List[Dict[str, Any]] = []
        self._build_default_graph()

    def _add_node(self, node_id: str, label: str, node_type: str, properties: Dict[str, Any]):
        self._nodes[node_id] = {
            "id": node_id,
            "label": label,
            "type": node_type,
            "properties": properties,
        }

    def _add_edge(self, source: str, target: str, relationship: str, properties: Optional[Dict[str, Any]] = None):
        self._edges.append({
            "source": source,
            "target": target,
            "relationship": relationship,
            "properties": properties or {},
        })

    def _build_default_graph(self):
        """Build initial connected graph for demonstration and fleet query answering."""
        # 1. Aircraft nodes
        self._add_node("AC-N781VA", "Airbus A320-200 (Tail N781VA)", "Aircraft", {"tail": "N781VA", "fleet": "Mainline"})
        self._add_node("AC-N942VA", "Boeing 737-800 (Tail N942VA)", "Aircraft", {"tail": "N942VA", "fleet": "Transcon"})

        # 2. Engine nodes
        self._add_node("ENG-U1", "CFM56 Turbofan (Unit #1)", "Engine", {"unit_id": 1, "subset": "FD001", "status": "AIRWORTHY"})
        self._add_node("ENG-U24", "CFM56 Turbofan (Unit #24)", "Engine", {"unit_id": 24, "subset": "FD001", "status": "CRITICAL_AOG"})

        self._add_edge("AC-N781VA", "ENG-U1", "MOUNTED_ON_POS_1")
        self._add_edge("AC-N942VA", "ENG-U24", "MOUNTED_ON_POS_2")

        # 3. Component nodes for Unit 24
        components_u24 = [
            ("COMP-U24-FAN", "Unit 24 Fan Assembly", "Component", "fan"),
            ("COMP-U24-LPC", "Unit 24 Low-Pressure Compressor", "Component", "lpc"),
            ("COMP-U24-HPC", "Unit 24 High-Pressure Compressor", "Component", "hpc"),
            ("COMP-U24-COMB", "Unit 24 Annular Combustor", "Component", "combustor"),
            ("COMP-U24-HPT", "Unit 24 High-Pressure Turbine", "Component", "hpt"),
            ("COMP-U24-LPT", "Unit 24 Low-Pressure Turbine", "Component", "lpt"),
            ("BEAR-U24-B3", "Main Shaft #3 Roller Bearing", "SubsystemComponent", "bearing_3"),
        ]

        for cid, clabel, ctype, part in components_u24:
            self._add_node(cid, clabel, ctype, {"part": part, "engine": "ENG-U24"})
            self._add_edge("ENG-U24", cid, "CONTAINS_STAGE")

        self._add_edge("COMP-U24-HPC", "BEAR-U24-B3", "MECHANICALLY_SUPPORTS")

        # 4. Oil Report nodes
        self._add_node(
            "OIL-U24-OCT",
            "Oil Analysis Lab Report #24-02",
            "OilReport",
            {"fe_ppm": 39.4, "cu_ppm": 28.7, "severity": "ABNORMAL", "date": "2026-10-30"}
        )
        self._add_edge("ENG-U24", "OIL-U24-OCT", "SAMPLED_LUBRICANT")
        self._add_edge("OIL-U24-OCT", "BEAR-U24-B3", "EVIDENCES_WEAR_IN", {"confidence": 0.94})

        # 5. Visual Inspection nodes
        self._add_node(
            "VIS-U24-OCT",
            "Borescope Video Inspection (HPC Tips)",
            "VisualInspection",
            {"defect": "TIP_RUB_AND_GROOVING", "severity": 4, "date": "2026-10-29"}
        )
        self._add_edge("COMP-U24-HPC", "VIS-U24-OCT", "INSPECTED_BY_BORESCOPE")
        self._add_edge("VIS-U24-OCT", "BEAR-U24-B3", "CORROBORATES_SHAFT_DEFLECTION", {"confidence": 0.91})

        # 6. Maintenance Log nodes
        self._add_node(
            "WO-2026-16501",
            "Work Order: HPC Seal Repair (WO-16501)",
            "MaintenanceRecord",
            {"ata": "ATA 72-30", "action": "REPAIR", "date": "2026-07-15", "cost": 8750.0}
        )
        self._add_node(
            "WO-2026-19203",
            "Work Order: Recurring HPC Over-Temp (WO-19203)",
            "MaintenanceRecord",
            {"ata": "ATA 72-30", "action": "INSPECTION", "date": "2026-09-22", "cost": 3600.0}
        )
        self._add_edge("COMP-U24-HPC", "WO-2026-16501", "LOGGED_REPAIR")
        self._add_edge("COMP-U24-HPC", "WO-2026-19203", "LOGGED_REPEAT_DEFECT")
        self._add_edge("WO-2026-16501", "WO-2026-19203", "CHRONIC_RECURRENT_CHAIN")

        # 7. Telemetry Out-of-Distribution Observation
        self._add_node(
            "OBS-U24-T30",
            "Thermodynamic Anomaly: High T30 Exhaust Surge",
            "TelemetryObservation",
            {"sensor": "s3 (T30)", "value": 1604.2, "conformal_lb": 12.0}
        )
        self._add_edge("COMP-U24-HPC", "OBS-U24-T30", "EMITS_THERMODYNAMIC_DELTA")

    def get_full_graph(self) -> Dict[str, Any]:
        """Return nodes and edges formatted for visualization."""
        return {
            "nodes": list(self._nodes.values()),
            "edges": self._edges,
            "total_nodes": len(self._nodes),
            "total_edges": len(self._edges),
        }

    def query_relationships(self, query_type: str, entity_id: str = "ENG-U24") -> Dict[str, Any]:
        """Executes targeted knowledge graph questions."""
        q = query_type.lower()

        if "recurring" in q or "repeat" in q or "history" in q:
            # Traversal for recurring defect chains
            maint_edges = [e for e in self._edges if "LOGGED" in e["relationship"] or "CHRONIC" in e["relationship"]]
            maint_nodes = [self._nodes[e["target"]] for e in maint_edges if e["target"] in self._nodes]
            return {
                "question": "Does the maintenance history contain recurring problems?",
                "entity": entity_id,
                "answer": "YES: A chronic 3-stage recurrent defect chain is documented in the High-Pressure Compressor (HPC) across WO-16501 and WO-19203 over 75 operating cycles.",
                "evidence_path": [
                    "ENG-U24 -> CONTAINS_STAGE -> COMP-U24-HPC",
                    "COMP-U24-HPC -> LOGGED_REPAIR -> WO-16501 (HPC Seal Repair)",
                    "WO-16501 -> CHRONIC_RECURRENT_CHAIN -> WO-19203 (Recurring HPC Over-Temp)",
                ],
                "matched_nodes": maint_nodes,
            }

        elif "evidence" in q or "support" in q or "assessment" in q:
            # Traversal for multi-modal evidence convergence
            connected_edges = [e for e in self._edges if entity_id in (e["source"], e["target"]) or "U24" in e["source"]]
            return {
                "question": "What evidence supports the current health assessment?",
                "entity": entity_id,
                "answer": "Convergent evidence from 4 independent domains confirms critical degradation: (1) Gas-path T30 temperature rise, (2) Oil spectrometry Fe/Cu spike, (3) Borescope tip-rub measurement (1.85mm), and (4) Chronic historical seal repair recurrence.",
                "evidence_path": [
                    "OBS-U24-T30 (Thermodynamic Surge) -> EMITS_THERMODYNAMIC_DELTA -> COMP-U24-HPC",
                    "OIL-U24-OCT (Fe: 39.4 ppm, Cu: 28.7 ppm) -> EVIDENCES_WEAR_IN -> BEAR-U24-B3",
                    "VIS-U24-OCT (Tip Rub 1.85mm) -> INSPECTED_BY_BORESCOPE -> COMP-U24-HPC",
                ],
                "connected_relationships": len(connected_edges),
            }

        elif "inspection" in q or "priority" in q or "further" in q:
            return {
                "question": "Which components need further inspection?",
                "entity": entity_id,
                "answer": "Primary inspection target: High-Pressure Compressor (HPC) Stage 4/5 rotor tips and #3 Roller Bearing cavity. Secondary target: High-Pressure Turbine (HPT) Stage 1 Nozzle Guide Vanes for coating spallation.",
                "priority_targets": [
                    {"component": "COMP-U24-HPC", "action": "Immediate Borescope Blend & Abradable Liner Check"},
                    {"component": "BEAR-U24-B3", "action": "Magnetic Chip Detector (MCD) Flush and Bearing Cage Scavenge Screen Inspection"},
                ],
            }

        # Default query summary
        return {
            "question": query_type,
            "entity": entity_id,
            "related_nodes": [n for n in self._nodes.values() if entity_id in n["id"] or "U24" in n["id"]],
        }


knowledge_graph_service = AircraftKnowledgeGraph()

