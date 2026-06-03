// helio-app/frontend/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar.tsx';
import { ToastContainer } from './components/Toast.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { Nodes } from './pages/Nodes.tsx';
import { Containers } from './pages/Containers.tsx';
import { Alerts } from './pages/Alerts.tsx';
import { StatusPage } from './pages/StatusPage.tsx';
import { Settings } from './pages/Settings.tsx';
import { LandingPage } from './pages/LandingPage.tsx';

function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="nodes" element={<Nodes />} />
          <Route path="containers" element={<Containers />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/status" element={<StatusPage />} />
      </Routes>
    </BrowserRouter>
  );
}
