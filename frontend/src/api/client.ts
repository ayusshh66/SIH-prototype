import { mockDashboardData, mockBlocks, mockTasks, mockShadowBlocks } from '../mocks/mockData';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AI === "true" || true; // forcing true for prototype

export const getDashboardData = async () => {
  if (USE_MOCK) return { success: true, data: mockDashboardData };
  const res = await fetch('/api/planning/dashboard');
  return res.json();
};

export const getBlocks = async (corridorId?: string) => {
  if (USE_MOCK) return { success: true, data: mockBlocks };
  const res = await fetch(`/api/blocks${corridorId ? `?corridorId=${corridorId}` : ''}`);
  return res.json();
};

export const getTasks = async () => {
  if (USE_MOCK) return { success: true, data: mockTasks };
  const res = await fetch('/api/maintenance/tasks');
  return res.json();
};

export const getShadowBlocks = async () => {
  if (USE_MOCK) return { success: true, data: mockShadowBlocks };
  const res = await fetch('/api/planning/shadow-blocks/candidates');
  return res.json();
};
