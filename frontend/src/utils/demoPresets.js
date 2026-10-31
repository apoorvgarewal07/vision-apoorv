/**
 * VISION 2.0: Hackathon Demonstration Presets & Presentation Scenarios
 * Vital Intelligence for System Integrity, Observation & Nostics
 *
 * 6 Curated Scenarios for Instant Demonstration:
 * ----------------------------------------------
 * 1. SCENARIO 1: Nominal Fleet Baseline (Healthy turbofan, RUL 95 cycles, normal spools)
 * 2. SCENARIO 2: Imminent HPC Failure (Degraded HPC, T30 surge, RUL 12.4 cycles, red glow, trigger fired)
 * 3. SCENARIO 3: Multi-Regime Operational Challenge (FD002 Unit #18, 6 altitude/Mach regimes)
 * 4. SCENARIO 4: Oil Spectrometry Wear Metal Surge (Fe/Ti wear metal spike, elevated viscosity)
 * 5. SCENARIO 5: Repeated Chronic Defect (ATA 72-30 repeated stator crack, 3 work orders)
 * 6. SCENARIO 6: Economic Conformal Policy Win (Side-by-side comparison, $1.42M saved)
 */

export const DEMO_PRESETS = [
  {
    id: 1,
    title: 'Scenario 1: Nominal Fleet Baseline',
    shortLabel: '1: Nominal Baseline',
    key: '1',
    subset: 'FD001',
    unitId: 10,
    tab: 'twin',
    componentFocus: 'fan',
    description: 'Turbofan #10 operating within healthy thermodynamic margins. RUL 95 cycles, nominal spool speeds.',
    badge: 'Healthy Baseline',
    badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
  },
  {
    id: 2,
    title: 'Scenario 2: Imminent HPC Failure Alert',
    shortLabel: '2: Imminent Failure',
    key: '2',
    subset: 'FD001',
    unitId: 34,
    tab: 'twin',
    componentFocus: 'hpc',
    description: 'Turbofan #34 experiencing severe HPC blade tip clearance wear. T30 thermal surge, RUL 12.4 cycles, trigger active.',
    badge: 'Critical Trigger',
    badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-500/50',
  },
  {
    id: 3,
    title: 'Scenario 3: Multi-Regime Operational Challenge',
    shortLabel: '3: 6-Regime Dynamic',
    key: '3',
    subset: 'FD002',
    unitId: 18,
    tab: 'fleet',
    componentFocus: null,
    description: 'C-MAPSS FD002 exhibiting 6 distinct altitude and Mach operating conditions normalized via K-Means clustering.',
    badge: 'Multi-Regime',
    badgeColor: 'bg-blue-950/80 text-blue-300 border-blue-500/50',
  },
  {
    id: 4,
    title: 'Scenario 4: Oil Spectrometry Warning',
    shortLabel: '4: Oil Wear Surge',
    key: '4',
    subset: 'FD001',
    unitId: 42,
    tab: 'oil',
    componentFocus: 'hpt',
    description: 'Turbofan #42 exhibiting Fe (78 ppm) and Ti (22 ppm) wear metal surge with elevated kinematic viscosity.',
    badge: 'Wear Advisory',
    badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
  },
  {
    id: 5,
    title: 'Scenario 5: Repeated Chronic Defect',
    shortLabel: '5: Chronic ATA 72-30',
    key: '5',
    subset: 'FD001',
    unitId: 55,
    tab: 'maintenance',
    componentFocus: 'hpc',
    description: 'Turbofan #55 flagged by Chronic Defect Detector for 3 repeated ATA 72-30 stator crack work orders within 60 cycles.',
    badge: 'Chronic Defect',
    badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-500/50',
  },
  {
    id: 6,
    title: 'Scenario 6: Economic Policy Optimization',
    shortLabel: '6: Economic Sandbox',
    key: '6',
    subset: 'FD001',
    unitId: 1,
    tab: 'economics',
    componentFocus: null,
    description: 'Asymmetric cost optimization ($C_{fail}=\$500k$ vs $C_{waste}=\$25k$) showing 7.76x reduction in wasted engine life and $1.42M savings.',
    badge: 'Economic Win',
    badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
  },
];

