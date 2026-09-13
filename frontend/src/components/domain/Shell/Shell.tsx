import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const Shell: React.FC = () => {
  return (
    <div className="min-h-screen bg-background-main text-text-primary flex flex-col font-sans">
      <Header />
      <div className="flex flex-1 pt-14">
        <Sidebar />
        <main className="flex-1 ml-16 md:ml-64 p-6 min-h-[calc(100vh-3.5rem)] bg-background-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
