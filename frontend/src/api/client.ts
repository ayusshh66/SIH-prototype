import {
  mockDashboardData,
  mockBlocks,
  mockTasks,
  mockShadowBlocks,
  mockEmergencyResult,
  mockWhatIfResult,
  mockExplanations,
  mockTrainMovements,
  mockOptimizationRuns,
} from '../mocks/mockData';

// Vite environment-based mock switch:
// Defaults to true for development if not explicitly set to 'false' via VITE_USE_MOCK=false
const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === undefined
    ? true
    : import.meta.env.VITE_USE_MOCK === 'true';

export const getDashboardData = async () => {
  if (USE_MOCK) return { success: true, data: mockDashboardData };
  const res = await fetch('/api/planning/dashboard');
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
};

export const getBlocks = async (corridorId?: string) => {
  if (USE_MOCK) return { success: true, data: mockBlocks };
  const res = await fetch(
    `/api/blocks${corridorId ? `?corridorId=${encodeURIComponent(corridorId)}` : ''}`
  );
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
};

export const getTasks = async () => {
  if (USE_MOCK) return { success: true, data: mockTasks };
  const res = await fetch('/api/maintenance/tasks');
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
};

export const getShadowBlocks = async () => {
  if (USE_MOCK) return { success: true, data: mockShadowBlocks };
  const res = await fetch('/api/planning/shadow-blocks/candidates');
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
};

// ── Emergency Planning ──────────────────────────────────────────────

export interface EmergencyEventPayload {
  event_id: string;
  event_type: string;
  section_id: string;
  affected_asset_id?: string;
  severity: string;
  detected_at: string;
  estimated_duration_minutes: number;
  impact_summary: string;
  from_km?: number;
  to_km?: number;
}

export const submitEmergencyEvent = async (event: EmergencyEventPayload) => {
  if (USE_MOCK) {
    // Simulate network delay for realistic UX
    await new Promise((r) => setTimeout(r, 800));
    return { success: true, data: mockEmergencyResult };
  }
  const res = await fetch('/api/planning/emergency', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
};

// ── What-If Scenario ────────────────────────────────────────────────

export interface WhatIfScenarioPayload {
  scenario_id: string;
  scenario_type: string;
  base_schedule_id?: string;
  affected_task_ids?: string[];
  affected_train_ids?: string[];
  new_constraints: Record<string, unknown>;
}

export const runWhatIfScenario = async (scenario: WhatIfScenarioPayload) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1200));
    return { success: true, data: mockWhatIfResult };
  }
  const res = await fetch('/api/planning/what-if', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario),
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
};

// ── Explanations ────────────────────────────────────────────────────

export const getExplanations = async () => {
  if (USE_MOCK) return { success: true, data: mockExplanations };
  const res = await fetch('/api/planning/explanations');
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
};

// ── Train Movements ─────────────────────────────────────────────────

export const getTrainMovements = async () => {
  if (USE_MOCK) return { success: true, data: mockTrainMovements };
  const res = await fetch('/api/trains');
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
};

// ── Optimization Runs ───────────────────────────────────────────────

export const runOptimization = async (params?: { corridorId?: string; horizon?: string }) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1500));
    return { success: true, data: mockOptimizationRuns[0] };
  }
  const res = await fetch('/api/planning/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params ?? {}),
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
};

