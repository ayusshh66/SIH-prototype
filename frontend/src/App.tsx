import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Shell } from './components/domain/Shell/Shell';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { PlanningSchedulePage } from './features/planning/PlanningSchedulePage';
import { MaintenanceTasksPage } from './features/tasks/MaintenanceTasksPage';
import { ShadowBlocksPage } from './features/shadowBlocks/ShadowBlocksPage';
import { ConflictsAlertsPage } from './features/conflicts/ConflictsAlertsPage';
import { WhatIfScenariosPage } from './features/whatIf/WhatIfScenariosPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Shell />}>
          <Route index element={<DashboardPage />} />
          <Route path="planning" element={<PlanningSchedulePage />} />
          <Route path="tasks" element={<MaintenanceTasksPage />} />
          <Route path="shadow-blocks" element={<ShadowBlocksPage />} />
          <Route path="conflicts" element={<ConflictsAlertsPage />} />
          <Route path="what-if" element={<WhatIfScenariosPage />} />
          
          <Route path="trains" element={<div className="p-4 font-mono text-text-muted uppercase tracking-widest">Trains - In Development</div>} />
          <Route path="emergency" element={<div className="p-4 font-mono text-text-muted uppercase tracking-widest">Emergency - In Development</div>} />
          <Route path="explain" element={<div className="p-4 font-mono text-text-muted uppercase tracking-widest">Explain - In Development</div>} />
          <Route path="system" element={<div className="p-4 font-mono text-text-muted uppercase tracking-widest">System - In Development</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
