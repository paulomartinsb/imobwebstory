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
import { PublicLeadFormPage } from './pages/PublicLeadFormPage';
import { LoginPage } from './pages/LoginPage';
import { ReferralPage } from './pages/ReferralPage';

// Route Guard Component
// Fix: Mark children as optional to resolve TypeScript error "Property 'children' is missing in type '{}'"
const RequireAuth = ({ children }: { children?: React.ReactNode }) => {
    const { currentUser } = useStore();
    const location = useLocation();

    if (!currentUser) {
        // Redirect to login page but save the current location they were trying to go to
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

// Public Route Guard (redirects to home if already logged in)
// Fix: Mark children as optional to resolve TypeScript error "Property 'children' is missing in type '{}'"
const PublicRoute = ({ children }: { children?: React.ReactNode }) => {
    const { currentUser } = useStore();
    if (currentUser) {
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
};

function App() {
  const { currentUser, loadFromSupabase, systemSettings, updateSystemSettings } = useStore();

  // Load cloud data on mount
  useEffect(() => {
      // FIX for "Local DB" stuck issue:
      // If store settings are empty but .env has values, force update from .env
      const getEnv = (key: string) => {
          try {
              // @ts-ignore
              return import.meta.env?.[key];
          } catch (e) {
              return undefined;
          }
      };

      const envSupabaseUrl = getEnv('VITE_SUPABASE_URL');
      const envSupabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');
      const envGeminiKey = getEnv('VITE_GEMINI_API_KEY');

      if ((!systemSettings.supabaseUrl && envSupabaseUrl) || (!systemSettings.geminiApiKey && envGeminiKey)) {
          console.log("Detectadas variáveis de ambiente. Atualizando configurações...");
          updateSystemSettings({
              supabaseUrl: envSupabaseUrl || systemSettings.supabaseUrl,
              supabaseAnonKey: envSupabaseKey || systemSettings.supabaseAnonKey,
              geminiApiKey: envGeminiKey || systemSettings.geminiApiKey
          });
          // Small delay to ensure state updates before loading from cloud
          setTimeout(() => loadFromSupabase(), 500);
      } else {
          loadFromSupabase();
      }
  }, []);

  // Helper to determine the "Home" page based on role
  const getHomePage = () => {
      if (currentUser?.role === 'captator') return <Navigate to="/referrals" replace />;
      return <DashboardPage />;
  }

  return (
    <HashRouter>
      <Routes>
        {/* Rota Pública (Landing Page) - Fora do Layout Principal */}
        <Route path="/lead-form/:brokerId" element={<PublicLeadFormPage />} />
        
        {/* Login Page */}
        <Route path="/login" element={
            <PublicRoute>
                <LoginPage />
            </PublicRoute>
        } />

        {/* Rotas Protegidas do Sistema */}
        <Route path="/" element={
            <RequireAuth>
                <Layout />
            </RequireAuth>
        }>
          <Route index element={getHomePage()} />
          <Route path="referrals" element={<ReferralPage />} />
          
          {/* Rotas bloqueadas para captadores via menu, mas segurança adicional pode ser feita aqui se necessário */}
          <Route path="properties" element={<PropertiesPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="crm" element={<CRMPage />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;