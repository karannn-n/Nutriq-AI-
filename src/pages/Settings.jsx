import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, Lock, Bell, Palette, Shield,
  Save, Camera, ChevronRight, Check, Eye, EyeOff, Trash2,
  Utensils, Target, Clock, AlertCircle, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabaseClient';

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
  { id: 'diet',      label: 'Diet & Goals',   icon: Utensils },
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
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const { user, profile: authProfile, session, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Profile state
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
  });

  // Dietary state
  const [dietary, setDietary] = useState({
    targetCalories: 2000,
    dietaryPreference: 'balanced',
    dailyReminderTime: '20:00',
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

  // ── Load user settings and profile from Supabase API ───────────────────────
  useEffect(() => {
    let isSubscribed = true;

    const fetchUserData = async () => {
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      try {
        const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const headers = { 'Authorization': `Bearer ${session.access_token}` };

        const [profRes, setRes] = await Promise.all([
          fetch(`${apiURL}/api/user/profile`, { headers }).then(r => r.json()).catch(() => null),
          fetch(`${apiURL}/api/user/settings`, { headers }).then(r => r.json()).catch(() => null),
        ]);

        if (!isSubscribed) return;

        if (profRes?.profile) {
          setProfile({
            name: profRes.profile.full_name || user?.user_metadata?.full_name || '',
            email: profRes.profile.email || user?.email || '',
            phone: profRes.profile.phone || '',
            bio: profRes.profile.bio || '',
          });
        } else if (user) {
          setProfile(p => ({
            ...p,
            name: authProfile?.full_name || user?.user_metadata?.full_name || '',
            email: user?.email || '',
          }));
        }

        if (setRes?.settings) {
          const s = setRes.settings;
          setDietary({
            targetCalories: s.target_calories || 2000,
            dietaryPreference: s.dietary_preference || 'balanced',
            dailyReminderTime: s.daily_reminder_time || '20:00',
          });
          setNotifs(prev => ({
            ...prev,
            mealReminders: s.email_notifications ?? true,
            deficiencyAlerts: s.deficiency_alerts_enabled ?? true,
          }));
          if (s.theme) {
            const foundTheme = THEMES.find(t => t.id === s.theme);
            if (foundTheme) applyTheme(foundTheme);
          }
        }
      } catch (err) {
        console.warn('Could not load user settings:', err.message);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    fetchUserData();
    return () => { isSubscribed = false; };
  }, [session, user, authProfile]);

  // ── Save handler with Supabase persistence ──────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);

    try {
      const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      if (!session?.access_token) {
        throw new Error('Please sign in to save your settings.');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      };

      // 1. Save profile
      const profRes = await fetch(`${apiURL}/api/user/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          full_name: profile.name,
          phone: profile.phone,
          bio: profile.bio,
        }),
      });
      if (!profRes.ok) {
        const errJson = await profRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to update profile.');
      }

      // 2. Save settings
      const setRes = await fetch(`${apiURL}/api/user/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          theme: activeTheme,
          target_calories: Number(dietary.targetCalories) || 2000,
          dietary_preference: dietary.dietaryPreference,
          daily_reminder_time: dietary.dailyReminderTime,
          email_notifications: notifs.mealReminders,
          deficiency_alerts_enabled: notifs.deficiencyAlerts,
        }),
      });
      if (!setRes.ok) {
        const errJson = await setRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to update settings.');
      }

      // 3. Security (Password change)
      if (security.newPass) {
        if (security.newPass !== security.confirmPass) {
          throw new Error('New password and confirmation do not match.');
        }
        if (security.newPass.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        const { error: passErr } = await supabase.auth.updateUser({ password: security.newPass });
        if (passErr) throw passErr;
        setSecurity({ currentPass: '', newPass: '', confirmPass: '' });
      }

      if (refreshProfile) {
        await refreshProfile();
      }

      setSaved(true);
      setFeedback({ type: 'success', message: 'All changes saved to Supabase successfully!' });
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to save changes.' });
    } finally {
      setSaving(false);
    }
  };

  // ── Render Profile Section ──────────────────────────────────────────────────
  const renderProfile = () => {
    const initials = (profile.name || user?.email || 'Alex Chen')
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'NQ';

    return (
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
              fontSize: '1.8rem', fontWeight: 700, color: '#fff',
              fontFamily: 'Outfit, sans-serif',
            }}>
              {initials}
            </div>
            <button
              type="button"
              title="Change Avatar"
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'var(--accent-primary)', border: '2px solid var(--bg-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff',
              }}
            >
              <Camera size={13} />
            </button>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{profile.name || 'Set your name'}</div>
            <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
              {profile.email || user?.email || 'Logged in user'} · Nutriq Cloud
            </div>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <User size={16} />
              </span>
              <input
                type="text"
                value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
                placeholder="Your full name"
                style={{ ...inputStyle, paddingLeft: '42px' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Email Address (Supabase Auth)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Mail size={16} />
              </span>
              <input
                type="text"
                disabled
                value={profile.email || user?.email || ''}
                style={{ ...inputStyle, paddingLeft: '42px', opacity: 0.75, cursor: 'not-allowed' }}
              />
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Phone Number</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Phone size={16} />
              </span>
              <input
                type="text"
                value={profile.phone}
                onChange={e => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                style={{ ...inputStyle, paddingLeft: '42px' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
              />
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Bio & Health Goals</label>
            <textarea
              rows={3}
              value={profile.bio}
              onChange={e => setProfile({ ...profile, bio: e.target.value })}
              placeholder="e.g. Fitness enthusiast tracking micro-nutrients daily for athletic recovery."
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
            />
          </div>
        </div>
      </motion.div>
    );
  };

  // ── Render Diet & Goals Section ─────────────────────────────────────────────
  const renderDiet = () => (
    <motion.div key="diet" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h2 style={sectionHeading}>Dietary Preferences & Goals</h2>
      <p style={sectionSub}>Configure your daily nutritional targets and dietary preferences to calibrate AI deficiency intelligence.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '580px' }}>
        {/* Target Calories */}
        <div>
          <label style={labelStyle}>Daily Calorie Target (kcal)</label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Target size={16} />
              </span>
              <input
                type="number"
                min="800"
                max="6000"
                step="50"
                value={dietary.targetCalories}
                onChange={e => setDietary({ ...dietary, targetCalories: Number(e.target.value) })}
                style={{ ...inputStyle, paddingLeft: '42px' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
              />
            </div>
          </div>
          {/* Quick presets */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            {[1800, 2000, 2200, 2500].map(cal => (
              <button
                key={cal}
                type="button"
                onClick={() => setDietary({ ...dietary, targetCalories: cal })}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  border: dietary.targetCalories === cal ? '1.5px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                  background: dietary.targetCalories === cal ? 'rgba(42,140,110,0.15)' : 'rgba(255,255,255,0.4)',
                  color: dietary.targetCalories === cal ? 'var(--accent-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {cal} kcal
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Plan */}
        <div>
          <label style={labelStyle}>Dietary Plan / Lifestyle</label>
          <select
            value={dietary.dietaryPreference}
            onChange={e => setDietary({ ...dietary, dietaryPreference: e.target.value })}
            style={{
              ...inputStyle,
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%233D7060%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 14px center',
              backgroundSize: '12px auto',
            }}
          >
            <option value="balanced">Balanced / Omnivore (All Foods)</option>
            <option value="high_protein">High-Protein Athletic</option>
            <option value="vegetarian">Vegetarian (Lacto-Ovo)</option>
            <option value="vegan">Strict Vegan (Plant-Exclusive)</option>
            <option value="pescatarian">Pescatarian (Fish & Plants)</option>
            <option value="keto">Ketogenic (Low Carb, High Fat)</option>
            <option value="mediterranean">Mediterranean</option>
          </select>
        </div>

        {/* Daily Reminder Time */}
        <div>
          <label style={labelStyle}>Daily Meal Logging Reminder</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Clock size={16} />
            </span>
            <input
              type="time"
              value={dietary.dailyReminderTime}
              onChange={e => setDietary({ ...dietary, dailyReminderTime: e.target.value })}
              style={{ ...inputStyle, paddingLeft: '42px' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
            />
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            We'll remind you to log your meals at this time each evening.
          </div>
        </div>

        {/* Informational Callout */}
        <div style={{
          padding: '16px 20px',
          borderRadius: '14px',
          background: 'rgba(42, 140, 110, 0.08)',
          border: '1px solid rgba(42, 140, 110, 0.2)',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
        }}>
          <AlertCircle size={20} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
            <strong>Predictive Nutrition Intelligence:</strong> These preferences adjust your reference micronutrient thresholds and power the 7-day rolling deficiency risk calculations across your dashboard and insights.
          </div>
        </div>
      </div>
    </motion.div>
  );

  // ── Render Theme Section ────────────────────────────────────────────────────
  const renderTheme = () => (
    <motion.div key="theme" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h2 style={sectionHeading}>Appearance</h2>
      <p style={sectionSub}>Choose a colour theme that matches your style.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
        {THEMES.map(theme => (
          <button
            key={theme.id}
            type="button"
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

  // ── Render Notifications Section ───────────────────────────────────────────
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

  // ── Render Security Section ────────────────────────────────────────────────
  const renderSecurity = () => (
    <motion.div key="security" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h2 style={sectionHeading}>Security</h2>
      <p style={sectionSub}>Update your password to keep your Supabase account safe.</p>

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
                type="button"
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

        <div style={{
          padding: '14px 18px', borderRadius: '12px',
          background: 'rgba(42,140,110,0.08)',
          border: '1px solid rgba(42,140,110,0.2)',
          fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.6,
        }}>
          🔐 Use at least 6 characters. Your credentials are securely managed by Supabase Authentication.
        </div>
      </div>
    </motion.div>
  );

  // ── Render Danger Zone ─────────────────────────────────────────────────────
  const renderDanger = () => (
    <motion.div key="danger" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h2 style={{ ...sectionHeading, color: '#dc2626' }}>Danger Zone</h2>
      <p style={sectionSub}>These actions are permanent and cannot be undone.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          {
            title: 'Delete All Meal Logs',
            desc: 'Permanently erase all your meal history and nutrition data from Supabase.',
            label: 'Delete Logs',
            color: '#f97316',
          },
          {
            title: 'Sign Out Account',
            desc: 'Sign out of this device and return to the login screen.',
            label: 'Sign Out',
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
              type="button"
              onClick={async () => {
                if (label === 'Delete Logs') {
                  if (window.confirm('Are you sure you want to delete all your meal logs from Supabase?')) {
                    if (user) {
                      const { error } = await supabase.from('meals').delete().eq('user_id', user.id);
                      if (error) alert('Failed: ' + error.message);
                      else alert('All your meal logs have been deleted.');
                    }
                  }
                } else if (label === 'Sign Out') {
                  if (window.confirm('Are you sure you want to sign out of Nutriq?')) {
                    await signOut();
                    navigate('/');
                  }
                }
              }}
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
    diet: renderDiet,
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
        <p style={{ color: 'var(--text-muted)' }}>Manage your profile, dietary targets, appearance, and cloud preferences.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '28px', alignItems: 'start' }}>

        {/* ── Sidebar Nav ── */}
        <div className="glass-panel" style={{ padding: '12px', borderRadius: '18px' }}>
          {SECTIONS.map((sec) => {
            const active = activeSection === sec.id;
            const isDanger = sec.id === 'danger';
            const NavIcon = sec.icon;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  setActiveSection(sec.id);
                  setFeedback(null);
                }}
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
                  marginBottom: sec.id === 'security' ? '8px' : '2px',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <NavIcon size={17} />
                  {sec.label}
                </span>
                {active && <ChevronRight size={15} />}
              </button>
            );
          })}
        </div>

        {/* ── Content Panel ── */}
        <div className="glass-panel" style={{ padding: '32px', borderRadius: '20px', minHeight: '420px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px', gap: '12px', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="animate-spin" />
              <span>Loading cloud settings...</span>
            </div>
          ) : (
            <>
              {contentMap[activeSection]()}

              {/* Feedback Alert */}
              {feedback && (
                <div style={{
                  marginTop: '20px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: feedback.type === 'success' ? 'rgba(42, 140, 110, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: feedback.type === 'success' ? 'var(--accent-primary)' : '#dc2626',
                  border: `1px solid ${feedback.type === 'success' ? 'rgba(42, 140, 110, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                }}>
                  {feedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Save Button (hidden on danger + theme tabs) */}
              {activeSection !== 'danger' && activeSection !== 'theme' && (
                <div style={{ marginTop: '36px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className="btn btn-gradient"
                    style={{
                      padding: '12px 32px',
                      fontSize: '0.95rem',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: saving ? 0.75 : 1,
                      cursor: saving ? 'wait' : 'pointer',
                    }}
                  >
                    {saving ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Saving...
                      </>
                    ) : saved ? (
                      <>
                        <Check size={18} />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Save Changes
                      </>
                    )}
                  </button>
                  {saved && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 500 }}
                    >
                      ✓ Synced with Supabase
                    </motion.span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
