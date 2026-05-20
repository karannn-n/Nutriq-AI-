import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Mail, Lock, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Simulate login for now
    navigate('/app/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
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
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 className="heading-font" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Welcome back</h1>
          <p style={{ color: 'var(--text-muted)' }}>Enter your details to access your dashboard.</p>
        </div>

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
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
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

          <button type="submit" className="btn btn-gradient" style={{ width: '100%', marginTop: '16px', padding: '16px' }}>
            Sign In <ArrowRight size={20} />
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '32px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Create one</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
