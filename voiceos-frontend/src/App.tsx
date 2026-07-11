import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import AIEmployeesPage from './pages/AIEmployeesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import SignInPage from './pages/SignInPage';
import CreateEmployeePage from './pages/CreateEmployeePage';
import LiveCallCenterPage from './pages/LiveCallCenterPage';
import WorkflowBuilderPage from './pages/WorkflowBuilderPage';
import KnowledgeCenterPage from './pages/KnowledgeCenterPage';
import NotificationsPage from './pages/NotificationsPage';
import SearchResultsPage from './pages/SearchResultsPage';

import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          
          <Route element={<MainLayout />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="ai-employees" element={<AIEmployeesPage />} />
            <Route path="create-employee" element={<CreateEmployeePage />} />
            <Route path="live-call-center" element={<LiveCallCenterPage />} />
            <Route path="workflow-builder" element={<WorkflowBuilderPage />} />
            <Route path="knowledge-center" element={<KnowledgeCenterPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="search" element={<SearchResultsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
