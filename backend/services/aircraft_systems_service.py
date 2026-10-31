"""
VISION 2.0: Aircraft Systems, Operational & Structural Intelligence Service
---------------------------------------------------------------------------
Monitors non-engine aircraft subsystems (Fuel, Hydraulics, Electrical, APU,
Landing Gear, ECS) alongside flight operational hours and airframe fatigue.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone


class AircraftSystemsService:
    """Manages multi-subsystem telemetry, operational flight hours, and structural health."""

    def __init__(self):
        self._systems_cache: Dict[int, Dict[str, Any]] = {}
        self._seed_systems_data()

    def _seed_systems_data(self):
        # Unit 1 aircraft (tail N781VA) - Nominal systems condition
        self._systems_cache[1] = {
            "aircraft_tail": "N781VA",
            "aircraft_model": "Airbus A320-200 (CFM56-5B / V2500 Class)",
            "unit_id": 1,
            "flight_operations": {
                "total_flight_hours": 1420.5,
                "total_flight_cycles": 890,
                "flight_hour_cycle_ratio": 1.60,
                "average_stage_length_nm": 620,
                "environmental_exposure": {
                    "desert_sand_ingestion_index": "LOW (0.12)",
                    "marine_salt_air_index": "MODERATE (0.34)",
                    "high_altitude_cold_hours": 940.0,
                },
                "last_flight": {
                    "origin": "KORD (Chicago O'Hare)",
                    "destination": "KDFW (Dallas/Fort Worth)",
                    "flight_duration_hrs": 2.4,
                    "cruise_altitude_ft": 36000,
                    "cruise_mach": 0.78,
                },
            },
            "subsystems": {
                "fuel_system": {
                    "status": "HEALTHY",
                    "flow_rate_pph": 2420.0,
                    "filter_delta_p_psi": 2.1,  # nominal < 5 psi
                    "boost_pump_pressure_psi": 48.5,
                    "fuel_temperature_c": 18.4,
                    "water_in_fuel_scavenge": "Negative",
                },
                "hydraulic_system": {
                    "status": "HEALTHY",
                    "system_pressure_psi": 3020.0,  # nominal 3,000 psi
                    "fluid_temperature_c": 64.0,
                    "reservoir_level_pct": 92.0,
                    "pump_case_drain_leakage_gpm": 0.08,
                },
                "electrical_system": {
                    "status": "HEALTHY",
                    "idg_generator_load_pct": 54.0,
                    "ac_bus_voltage_v": 115.2,
                    "ac_frequency_hz": 400.1,
                    "dc_bus_voltage_v": 28.1,
                },
                "battery_system": {
                    "status": "HEALTHY",
                    "state_of_charge_pct": 98.0,
                    "cell_temperature_c": 22.5,
                    "internal_resistance_mohm": 12.0,
                    "health_index": 0.96,
                },
                "apu_auxiliary_power": {
                    "status": "HEALTHY",
                    "rpm_pct": 100.0,
                    "egt_exhaust_temp_c": 580.0,  # max limit ~ 710°C
                    "bleed_air_pressure_psi": 45.2,
                    "starts_counter": 1420,
                },
                "environmental_control_ecs": {
                    "status": "HEALTHY",
                    "pack_1_discharge_temp_c": 16.0,
                    "pack_2_discharge_temp_c": 15.8,
                    "cabin_delta_pressure_psi": 8.2,
                    "ozone_converter_efficiency": 0.95,
                },
                "landing_gear": {
                    "status": "HEALTHY",
                    "main_gear_brake_temp_c": 185.0,  # nominal taxi/landing < 300°C
                    "tire_pressure_psi": 204.0,
                    "hydraulic_actuator_cycles": 890,
                    "anti_skid_valve_integrity": "OK",
                },
            },
            "structural_health": {
                "airframe_fatigue_index": 0.18,  # [0.0 - 1.0]
                "wing_root_stress_cycles": 890,
                "fuselage_pressurization_cycles": 890,
                "corrosion_severity_class": "CLASS_0 (Negligible)",
                "ndi_ultrasonic_inspection_due_in_cycles": 1110,
                "composite_delamination_findings": "None",
            },
        }

        # Unit 24 aircraft (tail N942VA) - Elevated hydraulic & fuel warnings
        self._systems_cache[24] = {
            "aircraft_tail": "N942VA",
            "aircraft_model": "Boeing 737-800 (CFM56-7B Class)",
            "unit_id": 24,
            "flight_operations": {
                "total_flight_hours": 2410.0,
                "total_flight_cycles": 1580,
                "flight_hour_cycle_ratio": 1.52,
                "average_stage_length_nm": 580,
                "environmental_exposure": {
                    "desert_sand_ingestion_index": "HIGH (0.78)",
                    "marine_salt_air_index": "HIGH (0.68)",
                    "high_altitude_cold_hours": 1620.0,
                },
                "last_flight": {
                    "origin": "OMDB (Dubai Intl)",
                    "destination": "EHAM (Amsterdam Schiphol)",
                    "flight_duration_hrs": 6.8,
                    "cruise_altitude_ft": 38000,
                    "cruise_mach": 0.79,
                },
            },
            "subsystems": {
                "fuel_system": {
                    "status": "ABNORMAL",
                    "flow_rate_pph": 2680.0,
                    "filter_delta_p_psi": 6.8,  # WARNING: exceeds 5.0 psi bypass warning threshold
                    "boost_pump_pressure_psi": 41.2,
                    "fuel_temperature_c": 34.0,
                    "water_in_fuel_scavenge": "Trace particulates observed in strainer",
                },
                "hydraulic_system": {
                    "status": "ABNORMAL",
                    "system_pressure_psi": 2810.0,  # Below 3,000 nominal
                    "fluid_temperature_c": 82.5,  # Elevated thermal return
                    "reservoir_level_pct": 74.0,
                    "pump_case_drain_leakage_gpm": 0.38,  # Seal degradation
                },
                "electrical_system": {
                    "status": "HEALTHY",
                    "idg_generator_load_pct": 68.0,
                    "ac_bus_voltage_v": 114.8,
                    "ac_frequency_hz": 399.8,
                    "dc_bus_voltage_v": 27.9,
                },
                "battery_system": {
                    "status": "HEALTHY",
                    "state_of_charge_pct": 91.0,
                    "cell_temperature_c": 26.0,
                    "internal_resistance_mohm": 16.5,
                    "health_index": 0.88,
                },
                "apu_auxiliary_power": {
                    "status": "ABNORMAL",
                    "rpm_pct": 99.2,
                    "egt_exhaust_temp_c": 685.0,  # High EGT warning near 710°C limit
                    "bleed_air_pressure_psi": 38.6,
                    "starts_counter": 2180,
                },
                "environmental_control_ecs": {
                    "status": "HEALTHY",
                    "pack_1_discharge_temp_c": 19.5,
                    "pack_2_discharge_temp_c": 20.1,
                    "cabin_delta_pressure_psi": 8.0,
                    "ozone_converter_efficiency": 0.89,
                },
                "landing_gear": {
                    "status": "HEALTHY",
                    "main_gear_brake_temp_c": 240.0,
                    "tire_pressure_psi": 198.0,
                    "hydraulic_actuator_cycles": 1580,
                    "anti_skid_valve_integrity": "OK",
                },
            },
            "structural_health": {
                "airframe_fatigue_index": 0.38,
                "wing_root_stress_cycles": 1580,
                "fuselage_pressurization_cycles": 1580,
                "corrosion_severity_class": "CLASS_1 (Surface oxidation on belly fairing)",
                "ndi_ultrasonic_inspection_due_in_cycles": 420,
                "composite_delamination_findings": "None",
            },
        }

    def get_aircraft_status(self, unit_id: int) -> Dict[str, Any]:
        """Retrieve complete multi-subsystem, operational, and structural report."""
        if unit_id in self._systems_cache:
            raw = dict(self._systems_cache[unit_id])
        else:
            raw = {
                "aircraft_tail": f"N{unit_id + 700:03d}VA",
                "aircraft_model": "Commercial Narrowbody Airliner",
                "unit_id": unit_id,
                "flight_operations": {
                    "total_flight_hours": round(1000.0 + (unit_id * 32.5), 1),
                    "total_flight_cycles": 600 + (unit_id * 20),
                    "flight_hour_cycle_ratio": 1.55,
                    "average_stage_length_nm": 600,
                    "environmental_exposure": {
                        "desert_sand_ingestion_index": "MODERATE",
                        "marine_salt_air_index": "MODERATE",
                        "high_altitude_cold_hours": 800.0,
                    },
                    "last_flight": {
                        "origin": "KJFK (New York JFK)",
                        "destination": "KMIA (Miami Intl)",
                        "flight_duration_hrs": 3.1,
                        "cruise_altitude_ft": 35000,
                        "cruise_mach": 0.78,
                    },
                },
                "subsystems": {
                    "fuel_system": {"status": "HEALTHY", "flow_rate_pph": 2500.0, "filter_delta_p_psi": 2.4, "boost_pump_pressure_psi": 47.0},
                    "hydraulic_system": {"status": "HEALTHY", "system_pressure_psi": 3000.0, "fluid_temperature_c": 66.0, "reservoir_level_pct": 90.0},
                    "electrical_system": {"status": "HEALTHY", "idg_generator_load_pct": 55.0, "ac_bus_voltage_v": 115.0, "ac_frequency_hz": 400.0},
                    "battery_system": {"status": "HEALTHY", "state_of_charge_pct": 95.0, "cell_temperature_c": 23.0},
                    "apu_auxiliary_power": {"status": "HEALTHY", "rpm_pct": 100.0, "egt_exhaust_temp_c": 590.0, "bleed_air_pressure_psi": 44.0},
                    "environmental_control_ecs": {"status": "HEALTHY", "pack_1_discharge_temp_c": 16.5, "cabin_delta_pressure_psi": 8.1},
                    "landing_gear": {"status": "HEALTHY", "main_gear_brake_temp_c": 190.0, "tire_pressure_psi": 202.0},
                },
                "structural_health": {
                    "airframe_fatigue_index": round(0.15 + (unit_id * 0.005), 3),
                    "wing_root_stress_cycles": 600 + (unit_id * 20),
                    "fuselage_pressurization_cycles": 600 + (unit_id * 20),
                    "corrosion_severity_class": "CLASS_0 (Negligible)",
                    "ndi_ultrasonic_inspection_due_in_cycles": max(100, 1500 - (unit_id * 20)),
                    "composite_delamination_findings": "None",
                },
            }

        # Normalize and enrich subsystems with aliases for full frontend compatibility
        sub = raw.get("subsystems", {})
        fuel = sub.get("fuel_system", {})
        hyd = sub.get("hydraulic_system", {})
        elec = sub.get("electrical_system", {})
        bat = sub.get("battery_system", {})
        apu = sub.get("apu_auxiliary_power", {})
        ecs = sub.get("environmental_control_ecs", {})
        gear = sub.get("landing_gear", {})

        fuel["fuel_temperature_c"] = fuel.get("fuel_temperature_c", 28.0)
        fuel["filter_differential_pressure_psi"] = fuel.get("filter_delta_p_psi", 2.4)
        fuel["boost_pump_pressure_psi"] = fuel.get("boost_pump_pressure_psi", 47.0)

        hyd["system_a_pressure_psi"] = hyd.get("system_pressure_psi", 3000.0)
        hyd["system_b_pressure_psi"] = 2980.0
        hyd["reservoir_quantity_pct"] = hyd.get("reservoir_level_pct", 92.0)

        elec["idg1_load_pct"] = elec.get("idg_generator_load_pct", 55.0)
        elec["idg2_load_pct"] = 52.0
        elec["battery_state_of_health_pct"] = bat.get("state_of_charge_pct", 98.0)

        apu["egt_c"] = apu.get("egt_exhaust_temp_c", 590.0)
        apu["running_hours"] = apu.get("starts_counter", 1420) * 2

        gear["brake_wear_pin_mm"] = 3.2
        gear["tire_pressure_psi"] = gear.get("tire_pressure_psi", 200.0)

        ecs["pack_1_temp_c"] = ecs.get("pack_1_discharge_temp_c", 16.5)
        ecs["cabin_delta_pressure_psi"] = ecs.get("cabin_delta_pressure_psi", 8.1)

        sub["fuel"] = fuel
        sub["hydraulics"] = hyd
        sub["electrical"] = elec
        sub["battery"] = bat
        sub["apu"] = apu
        sub["environmental_control"] = ecs

        # Flight operations normalization
        fops = raw.get("flight_operations", {})
        fops["cumulative_flight_hours"] = fops.get("total_flight_hours", 1850.0)
        fops["cumulative_flight_cycles"] = fops.get("total_flight_cycles", 1120)
        fops["engine_flight_hours"] = round(fops.get("total_flight_hours", 1850.0) * 0.94, 1)
        fops["environmental_exposure_index"] = 0.65
        fops["environmental_notes"] = "Moderate coastal marine salinity / humidity"

        # Structural health / airframe fatigue normalization
        struct = raw.get("structural_health", {})
        fatigue = dict(struct)
        fatigue["cumulative_fatigue_damage_d"] = struct.get("airframe_fatigue_index", 0.22)
        fatigue["remaining_safe_cycles"] = struct.get("ndi_ultrasonic_inspection_due_in_cycles", 950)

        raw["airframe_fatigue"] = fatigue
        raw["subsystems"] = sub
        raw["flight_operations"] = fops

        return raw


aircraft_systems_service = AircraftSystemsService()

