"""
VISION 2.0 Backend Intelligence Services Package
"""

from .oil_service import oil_service, OilReport
from .inspection_service import inspection_service, VisualInspectionRecord
from .maintenance_history_service import maintenance_service, MaintenanceLogEntry
from .aircraft_systems_service import aircraft_systems_service
from .fusion_service import fusion_engine
from .knowledge_graph_service import knowledge_graph_service
from .decision_service import decision_service

__all__ = [
    "oil_service",
    "OilReport",
    "inspection_service",
    "VisualInspectionRecord",
    "maintenance_service",
    "MaintenanceLogEntry",
    "aircraft_systems_service",
    "fusion_engine",
    "knowledge_graph_service",
    "decision_service",
]

