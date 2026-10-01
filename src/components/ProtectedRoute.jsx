import React from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, AlertCircle, Key } from 'lucide-react';
import { motion } from 'framer-motion';

const ProtectedRoute = () => {
  const { user, loading, isSupabaseConfigured } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-color)',
        gap: '16px',
      }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Loader2 size={44} color="var(--accent-primary)" />
        </motion.div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Restoring secure session...</p>
      </div>
    );
  }

  // If Supabase is not configured yet with real credentials
  if (!isSupabaseConfigured && !user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-color)',
        padding: '24px',
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel"
          style={{ maxWidth: '520px', padding: '36px', textAlign: 'center' }}
        >
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'rgba(232, 200, 106, 0.15)', color: 'var(--accent-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Key size={28} />
          </div>
          <h2 className="heading-font" style={{ fontSize: '1.5rem', marginBottom: '12px' }}>
            Supabase Configuration Required
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '24px' }}>
            Nutriq is now running on <strong>Supabase Auth & PostgreSQL</strong>.
            Please add your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env</code> to create an account and access your private health dashboard.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/login" className="btn btn-gradient" style={{ textDecoration: 'none', padding: '10px 24px' }}>
              Go to Login
            </Link>
            <Link to="/" className="btn btn-outline" style={{ textDecoration: 'none', padding: '10px 24px' }}>
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    // Save current location so we can redirect user back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
