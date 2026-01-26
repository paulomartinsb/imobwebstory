import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './store';
import { Layout } from './components/ui/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { PropertiesPage } from './pages/PropertiesPage';
import { CRMPage } from './pages/CRMPage';
import { LeadsPage } from './pages/LeadsPage';
import { ContractsPage } from './pages/ContractsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';
import { HelpPage } from './pages/HelpPage';
import { PublicLeadFormPage } from './pages/PublicLeadFormPage';
import { LoginPage } from './pages/LoginPage';
import { ReferralPage } from './pages/ReferralPage';

// Route Guard Component (v6 Style)
const RequireAuth = ({ children }: { children?: React.ReactNode }) => {
    const { currentUser } = useStore();
    const location = useLocation();

    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

// Public Route Guard (v6 Style)
const PublicRoute = ({ children }: { children?: React.ReactNode }) => {
    const { currentUser } = useStore();
    if (currentUser) {
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
};

function App() {
  const { currentUser, loadFromSupabase } = useStore();

  // Load cloud data on mount
  useEffect(() => {
      // The store handles Env fallback robustly inside loadFromSupabase.
      // We rely on loadFromSupabase to trigger subscribeToRealtime internally after loading settings.
      loadFromSupabase();
  }, []);

  // Helper to determine the "Home" page based on role
  const getHomePage = () => {
      if (currentUser?.role === 'captator') return <Navigate to="/referrals" replace />;
      return <DashboardPage />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/lead-form/:brokerId" element={<PublicLeadFormPage />} />
        
        <Route path="/login" element={
            <PublicRoute>
                <LoginPage />
            </PublicRoute>
        } />

        {/* Protected Routes Wrapper */}
        <Route path="/*" element={
            <RequireAuth>
                <Layout>
                    <Routes>
                        <Route index element={getHomePage()} />
                        <Route path="referrals" element={<ReferralPage />} />
                        <Route path="properties" element={<PropertiesPage />} />
                        <Route path="leads" element={<LeadsPage />} />
                        <Route path="crm" element={<CRMPage />} />
                        <Route path="contracts" element={<ContractsPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="admin" element={<AdminPage />} />
                        <Route path="help" element={<HelpPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Layout>
            </RequireAuth>
        } />
      </Routes>
    </HashRouter>
  );
}

export default App;