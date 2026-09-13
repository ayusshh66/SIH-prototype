import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeCorridorId, setActiveCorridorId] = useState('c01a-ndls-agc');

  return (
    <div className="app-shell">
      {/* Fixed Navigation Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main App Canvas */}
      <div className={`app-main-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header
          activeCorridorId={activeCorridorId}
          onCorridorChange={(id) => setActiveCorridorId(id)}
        />
        <main className="main-content" role="main">
          {children}
        </main>
      </div>
    </div>
  );
};
