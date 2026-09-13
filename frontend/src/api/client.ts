import type {
  Conflict,
  Explanation,
  MaintenanceTask,
  OptimizationResult,
  ShadowBlockCandidate,
} from '../types/api';
import {
  mockBlocks,
  mockDashboardData,
  mockEmergencyResult,
  mockExplanations,
  mockOptimizationRuns,
  mockShadowBlocks,
  mockTasks,
  mockTrainMovements,
  mockWhatIfResult,
} from '../mocks/mockData';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
  count?: number;
}

export interface EmergencyEventPayload {
  event_id?: string;
  event_type: string;
  section_id: string;
  affected_asset_id?: string;
  severity: string;
  detected_at?: string;
  estimated_duration_minutes: number;
  impact_summary: string;
  from_km: number;
  to_km: number;
}

export interface WhatIfScenarioPayload {
  scenario_id?: string;
  scenario_type:
    | 'TRAIN_DELAY'
    | 'BLOCK_UNAVAILABLE'
    | 'RESOURCE_UNAVAILABLE'
    | 'EMERGENCY_TASK_INSERTED'
    | 'TASK_DURATION_CHANGED'
    | 'TASK_ADDED';
  base_schedule_id: string;
  affected_task_ids?: string[];
  affected_train_ids?: string[];
  new_constraints: Record<string, unknown>;
  description?: string;
}

export interface WhatIfResult {
  original_schedule_id: string;
  new_schedule: OptimizationResult['schedule_candidates'][number] | null;
  all_schedule_candidates?: OptimizationResult['schedule_candidates'];
  changed_blocks: string[];
  affected_tasks: string[];
  affected_trains: string[];
  metric_differences: {
    objective_score: number;
    train_disruption_minutes: number;
    resource_utilization_delta: number;
  };
  explanation: string;
  errors: string[];
  optimization_result?: OptimizationResult;
}

export interface EmergencyResult {
  emergency_task: Record<string, unknown> | null;
  urgency: string;
  affected_section: string;
  feasible_windows: Array<{
    window_id: string;
    section_id: string;
    start: string;
    end: string;
    availability: string;
    impact_summary?: string;
  }>;
  resulting_schedule: OptimizationResult['schedule_candidates'][number] | null;
  optimization_result?: OptimizationResult;
  errors: string[];
  explanation: string;
}

export interface SystemHealth {
  backend: { status: string; timestamp: string };
  database: { status: string; configured: boolean; error?: string };
  python_bridge: { status: string; error?: string };
  ai_engines: { status: string; engines: string[]; error?: string };
  mode: { mock: boolean; source: 'mock' | 'live' };
}

const liveUrl = (path: string): string => `${API_BASE_URL}${path}`;

async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const res = await fetch(liveUrl(path), init);
  let payload: Partial<ApiEnvelope<T>> | undefined;

  try {
    payload = (await res.json()) as Partial<ApiEnvelope<T>>;
  } catch {
    payload = undefined;
  }

  if (!res.ok || payload?.success === false) {
    throw new Error(payload?.error || `HTTP error ${res.status} calling ${path}`);
  }

  if (!payload || typeof payload.success !== 'boolean') {
    throw new Error(`Invalid API response contract from ${path}`);
  }

  return payload as ApiEnvelope<T>;
}

export const getDashboardData = async (): Promise<ApiEnvelope<typeof mockDashboardData>> => {
  if (USE_MOCK) return { success: true, data: mockDashboardData };
  return apiRequest('/api/planning/dashboard');
};

export const getBlocks = async (corridorId?: string): Promise<ApiEnvelope<unknown[]>> => {
  if (USE_MOCK) return { success: true, data: mockBlocks };
  const qs = corridorId ? `?corridorId=${encodeURIComponent(corridorId)}` : '';
  return apiRequest(`/api/blocks${qs}`);
};

export const getTasks = async (): Promise<ApiEnvelope<MaintenanceTask[]>> => {
  if (USE_MOCK) return { success: true, data: mockTasks };
  return apiRequest('/api/maintenance/tasks');
};

export const getShadowBlocks = async (): Promise<ApiEnvelope<ShadowBlockCandidate[]>> => {
  if (USE_MOCK) return { success: true, data: mockShadowBlocks };
  return apiRequest('/api/planning/shadow-blocks/candidates');
};

export const submitEmergencyEvent = async (
  event: EmergencyEventPayload
): Promise<ApiEnvelope<EmergencyResult>> => {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { success: true, data: mockEmergencyResult as unknown as EmergencyResult };
  }
  return apiRequest('/api/planning/emergency', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
};

export const runWhatIfScenario = async (
  scenario: WhatIfScenarioPayload
): Promise<ApiEnvelope<WhatIfResult>> => {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return { success: true, data: mockWhatIfResult as unknown as WhatIfResult };
  }
  return apiRequest('/api/planning/what-if', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario),
  });
};

export const getExplanations = async (): Promise<ApiEnvelope<Explanation[]>> => {
  if (USE_MOCK) return { success: true, data: mockExplanations };
  return apiRequest('/api/planning/explanations');
};

export const getTrainMovements = async (): Promise<ApiEnvelope<unknown[]>> => {
  if (USE_MOCK) return { success: true, data: mockTrainMovements };
  return apiRequest('/api/trains');
};

export const getConflicts = async (): Promise<ApiEnvelope<Conflict[]>> => {
  if (USE_MOCK) return { success: true, data: [] };
  return apiRequest('/api/planning/conflicts');
};

export const getSystemHealth = async (): Promise<ApiEnvelope<SystemHealth>> => {
  if (USE_MOCK) {
    return {
      success: true,
      data: {
        backend: { status: 'MOCK', timestamp: new Date().toISOString() },
        database: { status: 'MOCK', configured: false },
        python_bridge: { status: 'MOCK' },
        ai_engines: { status: 'MOCK', engines: [] },
        mode: { mock: true, source: 'mock' },
      },
    };
  }
  return apiRequest('/api/health');
};

export const runOptimization = async (params?: {
  corridorId?: string;
  horizon?: string;
}): Promise<ApiEnvelope<OptimizationResult>> => {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return { success: true, data: mockOptimizationRuns[0] };
  }
  return apiRequest('/api/planning/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params ?? {}),
  });
};
