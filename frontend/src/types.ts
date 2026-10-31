export type AirworthinessStatus = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'TRIGGERED' | 'WATCH' | 'OK' | 'ABSTAIN' | 'LLP_LIMIT' | 'ERROR';

export interface TelemetryTick {
  unit: number;
  cycle: number;
  operational_settings: number[];
  point_rul: number;
  lower_bound_90: number;
  lower_bound_95: number;
  health_index: number;
  status: AirworthinessStatus;
  abstain: boolean;
  reasons?: string[];
  sensors?: Record<string, number>;
  thermodynamics?: {
    T30_T24_ratio?: number;
    Ps30_P30_ratio?: number;
    T30_T24_delta?: number;
    Ps30_P30_delta?: number;
  };
  attributions?: Record<string, number>;
}

export interface EngineRiskState {
  engine_id: string;
  cycle: number;
  regime: number;
  rul: number;
  lo90: number;
  hi90: number;
  lb90: number;
  interval_width: number;
  p_fail_within_lead: number;
  status: AirworthinessStatus;
  trigger_cycle: number | null;
  recommended_removal_cycle: number | null;
  abstain_reasons: string[];
  policy: string;
  theta: number;
}

export interface PolicyEvaluationResult {
  subset: string;
  threshold: number;
  lead: number;
  persist: number;
  total_units: number;
  failed_units: number;
  failure_rate: number;
  mean_waste: number;
  clopper_pearson_upper_90: number;
}

export interface MaintenanceSlot {
  engine_id: string;
  slot: number | null;
  slot_start_in?: number;
  slack: number;
  at_risk: boolean;
}

