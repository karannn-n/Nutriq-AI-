import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, Lock, Bell, Palette, Shield,
  Save, Camera, ChevronRight, Check, Eye, EyeOff, Trash2
} from 'lucide-react';

// ─── Theme Definitions ───────────────────────────────────────────────────────
const THEMES = [
  {
    id: 'mint',
    name: 'Mint Breeze',
    bg: '#B8E0D2',
    accent: '#2A8C6E',
    preview: ['#B8E0D2', '#52C4A0', '#2A8C6E'],
  },
  {
    id: 'lavender',
    name: 'Lavender Dusk',
    bg: '#DDD6F3',
    accent: '#7C3AED',
    preview: ['#DDD6F3', '#A78BFA', '#7C3AED'],
  },
  {
    id: 'sunset',
    name: 'Sunset Peach',
    bg: '#FFE4CC',
    accent: '#EA580C',
    preview: ['#FFE4CC', '#FB923C', '#EA580C'],
  },
  {
    id: 'ocean',
    name: 'Ocean Deep',
    bg: '#C8E6F5',
    accent: '#0369A1',
    preview: ['#C8E6F5', '#38BDF8', '#0369A1'],
  },
  {
    id: 'rose',
    name: 'Rose Garden',
    bg: '#FCE4EC',
    accent: '#BE185D',
    preview: ['#FCE4EC', '#F472B6', '#BE185D'],
  },
  {
    id: 'dark',
    name: 'Midnight Dark',
    bg: '#0F172A',
    accent: '#6366F1',
    preview: ['#0F172A', '#1E293B', '#6366F1'],
  },
];

// ─── Section Tab IDs ──────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'profile',   label: 'Profile',        icon: User },
  { id: 'theme',     label: 'Appearance',     icon: Palette },
  { id: 'notif',     label: 'Notifications',  icon: Bell },
  { id: 'security',  label: 'Security',       icon: Shield },
  { id: 'danger',    label: 'Danger Zone',    icon: Trash2 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  border: '1.5px solid var(--glass-border)',
  borderRadius: '12px',
  background: 'rgba(255,255,255,0.45)',
  color: 'var(--text-main)',
  fontSize: '0.95rem',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const sectionHeading = {
  fontFamily: 'Outfit, sans-serif',
  fontSize: '1.25rem',
  fontWeight: 700,
  color: 'var(--text-main)',
  marginBottom: '4px',
};

const sectionSub = {
  fontSize: '0.85rem',
  color: 'var(--text-muted)',
  marginBottom: '28px',
};

// ─── Toggle Component ─────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    style={{
      width: '48px', height: '26px',
      borderRadius: '999px',
      border: 'none', cursor: 'pointer',
      background: checked ? 'var(--accent-primary)' : 'rgba(0,0,0,0.15)',
      position: 'relative', transition: 'background 0.3s',
      flexShrink: 0,
    }}
  >
    <span style={{
      position: 'absolute', top: '3px',
      left: checked ? '25px' : '3px',
      width: '20px', height: '20px',
      borderRadius: '50%', background: '#fff',
      transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
    }} />
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Settings = () => {
  const [activeSection, setActiveSection] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    name: 'Alex Chen',
    email: 'alex.chen@email.com',
    phone: '+1 (555) 234-5678',
    bio: 'Fitness enthusiast tracking micro-nutrients daily.',
  });

  // Notification state
  const [notifs, setNotifs] = useState({
    mealReminders: true,
    weeklyReport: true,
    deficiencyAlerts: true,
    marketingEmails: false,
    pushNotifications: true,
  });

  // Security state
  const [security, setSecurity] = useState({
    currentPass: '', newPass: '', confirmPass: '',
  });

  // Active theme
  const [activeTheme, setActiveTheme] = useState('mint');

  // ── Apply theme to CSS vars ────────────────────────────────────────────────
  const applyTheme = (theme) => {
    setActiveTheme(theme.id);
    const root = document.documentElement;
    if (theme.id === 'dark') {
      root.style.setProperty('--bg-color', theme.bg);
      root.style.setProperty('--bg-secondary', '#1E293B');
      root.style.setProperty('--text-main', '#F1F5F9');
      root.style.setProperty('--text-muted', '#94A3B8');
      root.style.setProperty('--accent-primary', theme.accent);
      root.style.setProperty('--glass-bg', 'rgba(30,41,59,0.7)');
      root.style.setProperty('--glass-border', 'rgba(99,102,241,0.2)');
    } else {
      root.style.setProperty('--bg-color', theme.bg);
      root.style.setProperty('--bg-secondary', theme.preview[1]);
      root.style.setProperty('--text-main', '#0E2820');
      root.style.setProperty('--text-muted', '#3D7060');
      root.style.setProperty('--accent-primary', theme.accent);
      root.style.setProperty('--glass-bg', 'rgba(255,255,255,0.50)');
      root.style.setProperty('--glass-border', `${theme.accent}30`);
    }
  };

  // ── Save handler ──────────────────────────────────────────────────────────
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // ── Render sections ───────────────────────────────────────────────────────
  const renderProfile = () => (
    <motion.div key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h2 style={sectionHeading}>Profile Information</h2>
      <p style={sectionSub}>Update your personal details and public display name.</p>

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '88px', height: '88px', borderRadius: '50%',
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 700, color: '#fff',
            fontFamily: 'Outfit, sans-serif',
          }}>
            {profile.name.split(' ').map(n => n[0]).join('')}
          </div>
          <button style={{
            position: 'absolute', bottom: 0, right: 0,
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'var(--accent-primary)', border: '2px solid var(--bg-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff',
          }}>
            <Camera size={13} />
          </button>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{profile.name}</div>
          <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>Pro Plan · Member since 2024</div>
        </div>
      </div>

      {/* Fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {[
          { label: 'Full Name', key: 'name', icon: <User size={16} /> },
          { label: 'Email Address', key: 'email', icon: <Mail size={16} /> },
          { label: 'Phone Number', key: 'phone', icon: <Phone size={16} /> },
        ].map(({ label, key, icon }) => (
          <div key={key} style={key === 'phone' ? {} : {}}>
            <label style={labelStyle}>{label}</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}>{icon}</span>
              <input
                type="text"
                value={profile[key]}
                onChange={e => setProfile({ ...profile, [key]: e.target.value })}
                style={{ ...inputStyle, paddingLeft: '42px' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
              />
            </div>
          </div>
        ))}

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Bio</label>
          <textarea
            rows={3}
            value={profile.bio}
            onChange={e => setProfile({ ...profile, bio: e.target.value })}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
          />
        </div>
      </div>
    </motion.div>
  );

  const renderTheme = () => (
    <motion.div key="theme" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h2 style={sectionHeading}>Appearance</h2>
      <p style={sectionSub}>Choose a colour theme that matches your style.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
        {THEMES.map(theme => (
          <button
            key={theme.id}
            onClick={() => applyTheme(theme)}
            style={{
              border: activeTheme === theme.id
                ? `2px solid ${theme.accent}`
                : '2px solid transparent',
              borderRadius: '16px',
              padding: '16px',
              background: 'rgba(255,255,255,0.45)',
              backdropFilter: 'blur(10px)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              boxShadow: activeTheme === theme.id ? `0 0 0 4px ${theme.accent}22` : 'none',
            }}
          >
            {/* Colour swatches */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              {theme.preview.map((c, i) => (
                <div key={i} style={{
                  flex: 1, height: '28px', borderRadius: '8px',
                  background: c, border: '1px solid rgba(0,0,0,0.07)',
                }} />
              ))}
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', fontFamily: 'Outfit, sans-serif', color: 'var(--text-main)' }}>
              {theme.name}
            </div>
            {activeTheme === theme.id && (
              <div style={{
                marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '0.75rem', color: theme.accent, fontWeight: 600,
              }}>
                <Check size={12} /> Active
              </div>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );

  const renderNotifs = () => (
    <motion.div key="notif" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h2 style={sectionHeading}>Notifications</h2>
      <p style={sectionSub}>Control what updates and alerts you receive.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {[
          { key: 'mealReminders', label: 'Meal Reminders', desc: 'Get nudged to log your meals on time.' },
          { key: 'weeklyReport', label: 'Weekly Report', desc: 'Receive your nutrition summary every Monday.' },
          { key: 'deficiencyAlerts', label: 'Deficiency Alerts', desc: 'AI-powered alerts for nutritional gaps.' },
          { key: 'pushNotifications', label: 'Push Notifications', desc: 'Enable browser push notifications.' },
          { key: 'marketingEmails', label: 'Marketing Emails', desc: 'Offers, tips, and product updates.' },
        ].map(({ key, label, desc }) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 20px', borderRadius: '14px',
            background: 'rgba(255,255,255,0.35)',
            border: '1px solid var(--glass-border)',
            marginBottom: '10px',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{desc}</div>
            </div>
            <Toggle
              checked={notifs[key]}
              onChange={val => setNotifs({ ...notifs, [key]: val })}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );

  const renderSecurity = () => (
    <motion.div key="security" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h2 style={sectionHeading}>Security</h2>
      <p style={sectionSub}>Update your password to keep your account safe.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '460px' }}>
        {[
          { label: 'Current Password', key: 'currentPass' },
          { label: 'New Password', key: 'newPass' },
          { label: 'Confirm New Password', key: 'confirmPass' },
        ].map(({ label, key }) => (
          <div key={key}>
            <label style={labelStyle}>{label}</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Lock size={16} />
              </span>
              <input
                type={showPass ? 'text' : 'password'}
                value={security[key]}
                onChange={e => setSecurity({ ...security, [key]: e.target.value })}
                placeholder="••••••••"
                style={{ ...inputStyle, paddingLeft: '42px', paddingRight: '42px' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
              />
              <button
                onClick={() => setShowPass(p => !p)}
                style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        ))}

        {/* Password strength hints */}
        <div style={{
          padding: '14px 18px', borderRadius: '12px',
          background: 'rgba(42,140,110,0.08)',
          border: '1px solid rgba(42,140,110,0.2)',
          fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.6,
        }}>
          🔐 Use at least 8 characters, including uppercase, lowercase, a number, and a symbol.
        </div>
      </div>
    </motion.div>
  );

  const renderDanger = () => (
    <motion.div key="danger" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h2 style={{ ...sectionHeading, color: '#dc2626' }}>Danger Zone</h2>
      <p style={sectionSub}>These actions are permanent and cannot be undone.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          {
            title: 'Delete All Meal Logs',
            desc: 'Permanently erase all your meal history and nutrition data.',
            label: 'Delete Logs',
            color: '#f97316',
          },
          {
            title: 'Delete Account',
            desc: 'Permanently delete your Nutriq account and all associated data.',
            label: 'Delete Account',
            color: '#dc2626',
          },
        ].map(({ title, desc, label, color }) => (
          <div key={title} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px', borderRadius: '14px',
            background: `${color}0a`,
            border: `1px solid ${color}30`,
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color, marginBottom: '4px' }}>{title}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{desc}</div>
            </div>
            <button
              style={{
                padding: '9px 20px', borderRadius: '10px',
                background: `${color}15`, border: `1.5px solid ${color}50`,
                color, fontWeight: 600, fontSize: '0.85rem',
                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                fontFamily: 'Outfit, sans-serif',
              }}
              onMouseOver={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.background = `${color}15`; e.currentTarget.style.color = color; }}
            >
              {label}
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );

  const contentMap = {
    profile: renderProfile,
    theme: renderTheme,
    notif: renderNotifs,
    security: renderSecurity,
    danger: renderDanger,
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 className="heading-font" style={{ fontSize: '2rem', marginBottom: '6px' }}>Settings</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage your account, appearance, and preferences.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '28px', alignItems: 'start' }}>

        {/* ── Sidebar Nav ── */}
        <div className="glass-panel" style={{ padding: '12px', borderRadius: '18px' }}>
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id;
            const isDanger = id === 'danger';
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px', padding: '12px 14px',
                  borderRadius: '12px', border: 'none',
                  background: active
                    ? isDanger ? 'rgba(220,38,38,0.1)' : 'rgba(42,140,110,0.13)'
                    : 'transparent',
                  color: active
                    ? isDanger ? '#dc2626' : 'var(--accent-primary)'
                    : isDanger ? '#dc2626' : 'var(--text-muted)',
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.9rem', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.18s',
                  textAlign: 'left',
                  marginBottom: id === 'security' ? '8px' : '2px',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={17} />
                  {label}
                </span>
                {active && <ChevronRight size={15} />}
              </button>
            );
          })}
        </div>

        {/* ── Content Panel ── */}
        <div className="glass-panel" style={{ padding: '32px', borderRadius: '20px', minHeight: '420px' }}>
          {contentMap[activeSection]()}

          {/* Save Button (hidden on danger + theme tabs) */}
          {activeSection !== 'danger' && activeSection !== 'theme' && (
            <div style={{ marginTop: '36px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={handleSave}
                className="btn btn-gradient"
                style={{ padding: '12px 32px', fontSize: '0.95rem', borderRadius: '12px' }}
              >
                {saved ? <Check size={18} /> : <Save size={18} />}
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
              {saved && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 500 }}
                >
                  ✓ Your changes have been saved.
                </motion.span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
