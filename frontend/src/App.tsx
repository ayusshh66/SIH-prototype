import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/layout/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';
import { PlanningPage } from '@/pages/PlanningPage';
import { TasksPage } from '@/pages/TasksPage';
import { ShadowBlocksPage } from '@/pages/ShadowBlocksPage';
import { TrainsPage } from '@/pages/TrainsPage';
import { ConflictsPage } from '@/pages/ConflictsPage';
import { WhatIfPage } from '@/pages/WhatIfPage';
import { EmergencyPage } from '@/pages/EmergencyPage';
import { SystemPage } from '@/pages/SystemPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/planning" element={<PlanningPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/shadow-blocks" element={<ShadowBlocksPage />} />
          <Route path="/trains" element={<TrainsPage />} />
          <Route path="/conflicts" element={<ConflictsPage />} />
          <Route path="/what-if" element={<WhatIfPage />} />
          <Route path="/emergency" element={<EmergencyPage />} />
          <Route path="/system" element={<SystemPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
};

export default App;
