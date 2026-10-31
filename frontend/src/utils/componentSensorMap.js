/**
 * Physical Turbofan Component to C-MAPSS Sensor Mapping & Thermodynamic Metadata
 */

export const COMPONENT_METADATA = {
  fan: {
    id: 'fan',
    name: 'Front Fan & Intake Spinner',
    subsystem: 'Low-Pressure Spool (N1)',
    zOffset: 4.8,
    explodedOffset: 7.5,
    sensors: [
      { id: 's8', name: 'Nf (Physical Fan Speed)', unit: 'rpm', nominal: 2388.0 },
      { id: 's13', name: 'NRf (Corrected Fan Speed)', unit: 'rpm', nominal: 2388.0 },
      { id: 's15', name: 'BPR (Bypass Ratio)', unit: 'ratio', nominal: 8.42 }
    ],
    description: '24 wide-chord titanium blades and spinner cone providing 85% of total bypass thrust and initial core supercharge.'
  },
  lpc: {
    id: 'lpc',
    name: 'Low-Pressure Compressor (Booster)',
    subsystem: 'Low-Pressure Spool (N1)',
    zOffset: 2.6,
    explodedOffset: 4.5,
    sensors: [
      { id: 's2', name: 'T24 (Total Temp at LPC Outlet)', unit: '°R', nominal: 642.0 }
    ],
    description: 'Multi-stage axial booster compressor raising core airflow pressure before feeding into high-pressure compressor stages.'
  },
  hpc: {
    id: 'hpc',
    name: 'High-Pressure Compressor (HPC)',
    subsystem: 'High-Pressure Spool (N2)',
    zOffset: 0.6,
    explodedOffset: 1.5,
    sensors: [
      { id: 's3', name: 'T30 (Total Temp at HPC Outlet)', unit: '°R', nominal: 1588.0 },
      { id: 's7', name: 'P30 (Total Pressure at HPC Outlet)', unit: 'psia', nominal: 553.0 },
      { id: 's11', name: 'Ps30 (Combustor Static Pressure)', unit: 'psia', nominal: 47.5 },
      { id: 's9', name: 'Nc (Core Speed)', unit: 'rpm', nominal: 9050.0 },
      { id: 's14', name: 'NRc (Corrected Core Speed)', unit: 'rpm', nominal: 8138.0 }
    ],
    description: 'Tapered high-density titanium rotor stages generating primary pressure ratio. Key thermodynamic degradation focal point in C-MAPSS fleet.'
  },
  combustor: {
    id: 'combustor',
    name: 'Annular Combustion Chamber',
    subsystem: 'Thermal Core Flowpath',
    zOffset: -1.4,
    explodedOffset: -1.5,
    sensors: [
      { id: 's12', name: 'Phi (Fuel-Air Ratio)', unit: 'pps/psi', nominal: 521.8 },
      { id: 's16', name: 'farB (Burner Fuel-Air Ratio)', unit: 'ratio', nominal: 0.03 }
    ],
    description: 'Annular liner with fuel injectors where compressed air mixes with fuel and combusts at peak gas-path temperatures (>2,400°F).'
  },
  hpt: {
    id: 'hpt',
    name: 'High-Pressure Turbine (HPT)',
    subsystem: 'High-Pressure Spool (N2)',
    zOffset: -2.8,
    explodedOffset: -4.0,
    sensors: [
      { id: 's20', name: 'W31 (HPT Coolant Bleed Flow)', unit: 'lbm/s', nominal: 38.9 }
    ],
    description: 'Single-stage single-crystal superalloy blade disc extracting initial expansion energy to drive the high-pressure compressor shaft.'
  },
  lpt: {
    id: 'lpt',
    name: 'Low-Pressure Turbine (LPT)',
    subsystem: 'Low-Pressure Spool (N1)',
    zOffset: -4.5,
    explodedOffset: -7.0,
    sensors: [
      { id: 's4', name: 'T50 (LPT Outlet Temp / EGT)', unit: '°R', nominal: 1405.0 },
      { id: 's21', name: 'W32 (LPT Coolant Bleed Flow)', unit: 'lbm/s', nominal: 23.35 }
    ],
    description: 'Multi-stage larger-diameter turbine capturing remaining expansion gas energy to drive the forward main fan and booster spool.'
  }
};

/**
 * Computes component-specific health (0.0 to 1.0) and status based on real-time telemetry
 */
export function computeComponentHealth(componentId, telemetryTick) {
  if (!telemetryTick) {
    return { score: 100, status: 'Nominal', thermalDelta: 0 };
  }

  const hi = telemetryTick.health_index !== undefined ? telemetryTick.health_index : 1.0;
  const sensors = telemetryTick.sensors || {};

  switch (componentId) {
    case 'hpc': {
      // Primary degradation driver: T30 heat buildup and Ps30 drop
      const t30 = sensors.s3 || 1588.0;
      const deltaT30 = Math.max(0, t30 - 1588.0);
      const score = Math.max(15, Math.min(100, Math.round(hi * 100)));
      const status = score < 30 ? 'Severe Wear - Borescope Required' : (score < 65 ? 'Elevated Thermal Stress' : 'Nominal Airworthy');
      return { score, status, thermalDelta: deltaT30 };
    }
    case 'lpt': {
      const t50 = sensors.s4 || 1405.0;
      const deltaT50 = Math.max(0, t50 - 1405.0);
      const score = Math.max(25, Math.min(100, Math.round((hi * 0.9 + 0.1) * 100)));
      const status = score < 40 ? 'Exhaust Gas Temp Elevated' : 'Nominal Airworthy';
      return { score, status, thermalDelta: deltaT50 };
    }
    case 'combustor': {
      const score = Math.max(40, Math.min(100, Math.round((hi * 0.85 + 0.15) * 100)));
      const status = score < 50 ? 'Burner Liner Inspection Rec.' : 'Nominal Airworthy';
      return { score, status, thermalDelta: 0 };
    }
    case 'fan': {
      const score = Math.max(50, Math.min(100, Math.round((hi * 0.7 + 0.3) * 100)));
      return { score, status: 'Nominal Vibration Envelope', thermalDelta: 0 };
    }
    case 'lpc': {
      const score = Math.max(50, Math.min(100, Math.round((hi * 0.8 + 0.2) * 100)));
      return { score, status: 'Nominal Stage Margin', thermalDelta: 0 };
    }
    case 'hpt': {
      const score = Math.max(30, Math.min(100, Math.round((hi * 0.95 + 0.05) * 100)));
      return { score, status: score < 50 ? 'Thermal Creep Watch' : 'Nominal Airworthy', thermalDelta: 0 };
    }
    default:
      return { score: Math.round(hi * 100), status: 'Nominal', thermalDelta: 0 };
  }
}
