import {
  mockDashboardData,
  mockBlocks,
  mockTasks,
  mockShadowBlocks,
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
