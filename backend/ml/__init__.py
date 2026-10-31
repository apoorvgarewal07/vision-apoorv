"""
VISION 2.0 Machine Learning & Dataset Engineering Package
---------------------------------------------------------
Provides automated NASA C-MAPSS dataset loading, zero-leakage causal feature
transformations, training pipelines, and dataset integrity verification.
"""

from .data_loader import (
    load_subset,
    verify_dataset_integrity,
    COLS,
    SENSORS_KEEP,
    SENSOR_NAMES,
    EXPECTED_ENGINE_COUNTS,
)

__all__ = [
    "load_subset",
    "verify_dataset_integrity",
    "COLS",
    "SENSORS_KEEP",
    "SENSOR_NAMES",
    "EXPECTED_ENGINE_COUNTS",
]
