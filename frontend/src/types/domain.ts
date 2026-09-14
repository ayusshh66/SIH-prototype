/**
 * Domain types and status system definitions.
 * Conforms strictly to AI_DOMAIN_CONTRACT.md, OPTIMIZATION_CONTRACT.md,
 * and backend PostgreSQL Drizzle schemas.
 */

export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type PriorityClass = 'P1' | 'P2' | 'P3' | 'P4';

export type OptimizationStatus = 
  | 'OPTIMAL' 
  | 'FEASIBLE' 
  | 'PARTIAL' 
  | 'INFEASIBLE' 
  | 'FAILED';

export type ConflictType = 
  | 'TRAIN_CONFLICT' 
  | 'RESOURCE_CONFLICT' 
  | 'WINDOW_CONFLICT' 
  | 'SAFETY_CONFLICT' 
  | 'DEADLINE_CONFLICT';

export type ConflictSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type DepartmentCode = 'ENG' | 'TRD' | 'SNT';

export type TaskStatus = 
  | 'PENDING' 
  | 'SCHEDULED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED';

export type TaskType = 
  | 'USFD' 
  | 'TRD' 
  | 'SNT' 
  | 'ENGINEERING' 
  | 'DEFECT_REPAIR' 
  | 'PREVENTIVE' 
  | 'CORRECTIVE' 
  | 'INSPECTION' 
  | 'EMERGENCY' 
  | 'OTHER';

export type TrainType = 'PASSENGER' | 'EXPRESS' | 'GOODS' | 'SPECIAL';
export type SpeedClass = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPRESS';
export type PlanningHorizon = 'WEEKLY' | 'MONTHLY' | 'STRATEGIC_26_WEEK';
export type JpoStatus = 'JPO_COMPLIANT' | 'JPO_VIOLATION';

export interface Corridor {
  id: string;
  code: string;
  name: string;
  zone: string;
  division: string;
  startKm: number;
  endKm: number;
  status: 'ACTIVE' | 'DEGRADED';
}

export interface KpiMetric {
  id: string;
  label: string;
  value: string | number;
  subtext?: string;
  status?: 'optimal' | 'warning' | 'critical' | 'neutral';
  change?: string;
}

export interface ConflictItem {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  title: string;
  description: string;
  affectedEntityId: string;
  sectionId?: string;
  timestamp: string;
}

export interface TrainImpactItem {
  trainNumber: string;
  trainName: string;
  trainType: TrainType;
  speedClass: SpeedClass;
  delayMinutes: number;
  impactLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  affectedSection: string;
}
