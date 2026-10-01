import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import MealLog from './pages/MealLog';
import MealHistory from './pages/MealHistory';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { SyncProvider } from './contexts/SyncContext';
import { getSavedThemeId, applyTheme } from './utils/theme';

function App() {
  useEffect(() => {
    applyTheme(getSavedThemeId());
  }, []);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <SyncProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected App Routes requiring Supabase authentication */}
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppLayout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="meal-log" element={<MealLog />} />
                <Route path="meals" element={<MealHistory />} />
                <Route path="history" element={<MealHistory />} />
                <Route path="insights" element={<Insights />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </SyncProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
