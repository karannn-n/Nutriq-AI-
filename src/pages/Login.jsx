import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { signIn, user, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/app/dashboard';

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      await signIn({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '24px' }}>
      <div className="ambient-glow" style={{ top: '20%', left: '20%', background: 'var(--accent-primary)', width: '500px', height: '500px' }}></div>
      <div className="ambient-glow" style={{ bottom: '20%', right: '20%', background: 'var(--accent-secondary)', width: '500px', height: '500px' }}></div>
      
      <Link to="/" style={{ position: 'absolute', top: '32px', left: '32px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Activity color="var(--accent-primary)" size={32} />
        <span className="heading-font" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>Nutriq</span>
      </Link>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel"
        style={{ width: '100%', maxWidth: '440px', padding: '48px', position: 'relative', zIndex: 10 }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 className="heading-font" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Welcome back</h1>
          <p style={{ color: 'var(--text-muted)' }}>Enter your details to access your dashboard.</p>
        </div>

        {!isSupabaseConfigured && (
          <div style={{
            background: 'rgba(232, 200, 106, 0.15)',
            border: '1px solid rgba(232, 200, 106, 0.4)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '0.85rem',
            color: 'var(--text-main)',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
          }}>
            <AlertCircle size={20} color="var(--accent-secondary)" style={{ flexShrink: 0 }} />
            <span>Supabase is in setup mode. Add your credentials to <code>.env</code> to connect.</span>
          </div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '0.88rem',
              color: '#ef4444',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                disabled={submitting}
                style={{ 
                  width: '100%', padding: '14px 16px 14px 48px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.7)', border: '1px solid var(--glass-border)',
                  color: 'var(--text-main)', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Password</label>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={submitting}
                style={{ 
                  width: '100%', padding: '14px 16px 14px 48px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.7)', border: '1px solid var(--glass-border)',
                  color: 'var(--text-main)', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="btn btn-gradient" 
            style={{ 
              width: '100%', marginTop: '8px', padding: '16px', border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {submitting ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <Loader2 size={20} />
                </motion.div>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '32px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Create an account</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
