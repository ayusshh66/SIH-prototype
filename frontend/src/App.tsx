import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Shell } from './components/domain/Shell/Shell';
import { LoadingIntro } from './components/domain/Shell/LoadingIntro';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { PlanningSchedulePage } from './features/planning/PlanningSchedulePage';
import { MaintenanceTasksPage } from './features/tasks/MaintenanceTasksPage';
import { ShadowBlocksPage } from './features/shadowBlocks/ShadowBlocksPage';
import { ConflictsAlertsPage } from './features/conflicts/ConflictsAlertsPage';
import { WhatIfScenariosPage } from './features/whatIf/WhatIfScenariosPage';
import { TrainsPage } from './features/trains/TrainsPage';
import { EmergencyPage } from './features/emergency/EmergencyPage';
import { ExplainPage } from './features/explain/ExplainPage';
import { SystemPage } from './features/system/SystemPage';

export const App: React.FC = () => {
  const [showBootIntro, setShowBootIntro] = useState(() => {
    if (typeof window !== 'undefined') {
      const hasBooted = sessionStorage.getItem('rail_booted');
      return !hasBooted;
    }
    return false;
  });

  const handleBootComplete = () => {
    sessionStorage.setItem('rail_booted', 'true');
    setShowBootIntro(false);
  };

  return (
    <ThemeProvider>
      {showBootIntro && <LoadingIntro onComplete={handleBootComplete} />}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Shell />}>
            <Route index element={<DashboardPage />} />
            <Route path="planning" element={<PlanningSchedulePage />} />
            <Route path="tasks" element={<MaintenanceTasksPage />} />
            <Route path="shadow-blocks" element={<ShadowBlocksPage />} />
            <Route path="trains" element={<TrainsPage />} />
            <Route path="conflicts" element={<ConflictsAlertsPage />} />
            <Route path="what-if" element={<WhatIfScenariosPage />} />
            <Route path="emergency" element={<EmergencyPage />} />
            <Route path="explain" element={<ExplainPage />} />
            <Route path="system" element={<SystemPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
