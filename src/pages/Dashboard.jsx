import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Camera, AlertTriangle, TrendingUp, Zap, Loader2, ArrowRight, 
  Info, Check, ShieldCheck, ChevronDown, Utensils, RefreshCw, 
  Sparkles, ExternalLink, Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Mini visual sparkline bars for the top metric cards (mirroring reference screenshot)
const MetricBars = ({ color = '#34D399', heights = [35, 60, 45, 80, 55, 95] }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '32px' }}>
    {heights.map((h, idx) => (
      <div
        key={idx}
        style={{
          width: '4px',
          height: `${h}%`,
          borderRadius: '2px',
          background: color,
          opacity: 0.35 + (idx / heights.length) * 0.65,
          transition: 'height 0.3s ease'
        }}
      />
    ))}
  </div>
);

// Mini wave sparkline for table rows (mirroring reference screenshot dynamic curves)
const WaveSparkline = ({ trend = 'up' }) => {
  const isUp = trend === 'up';
  const stroke = isUp ? '#10B981' : '#F87171';
  const fill = isUp ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
  const pathD = isUp 
    ? 'M0,14 Q15,18 30,8 T60,4' 
    : 'M0,6 Q15,4 30,14 T60,16';
  const areaD = `${pathD} L60,20 L0,20 Z`;

  return (
    <svg width="64" height="20" viewBox="0 0 64 20" style={{ overflow: 'visible' }}>
      <path d={areaD} fill={fill} />
      <path d={pathD} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
};

// Sleek dark pill tooltip matching reference screenshot (e.g. 82.6 CCI pill)
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const intake = payload.find(p => p.dataKey === 'completion')?.value ?? 0;
    const target = payload.find(p => p.dataKey === 'optimal')?.value ?? 15;
    return (
      <div style={{
        background: '#0B1713',
        border: '1px solid rgba(52, 211, 153, 0.3)',
        borderRadius: '10px',
        padding: '8px 12px',
        color: '#FFFFFF',
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.35)',
        fontSize: '0.8rem'
      }}>
        <div style={{ fontWeight: 600, color: '#8CA79B', marginBottom: '4px' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34D399' }} />
          <span>Intake: <strong>{intake} mcg</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', color: '#D4818A' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D4818A' }} />
          <span>RDI Target: <strong>{target} mcg</strong></span>
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const { user, profile, session } = useAuth();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

  useEffect(() => {
    let isCancelled = false;

    const fetchDashboard = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        const headers = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`${apiURL}/api/dashboard`, { headers });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        
        if (!isCancelled) {
          setData(result);
        }
      } catch (err) {
        console.warn("API request failed:", err.message);
        if (!isCancelled) {
          setData({
            recentMeals: [],
            chartData: [
              { name: 'Mon', completion: 0, optimal: 15 },
              { name: 'Tue', completion: 0, optimal: 15 },
              { name: 'Wed', completion: 0, optimal: 15 },
              { name: 'Thu', completion: 0, optimal: 15 },
              { name: 'Fri', completion: 0, optimal: 15 },
              { name: 'Sat', completion: 0, optimal: 15 },
              { name: 'Sun', completion: 0, optimal: 15 },
            ],
            alerts: [],
            alertData: null,
            topMetrics: { score: 100, calories: 0 },
          });
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchDashboard();

    return () => {
      isCancelled = true;
    };
  }, [session]);

  const handleDismissAlert = (target) => {
    setDismissedAlerts((prev) => [...prev, target]);
  };

  if (loading || !data) {
    return (
      <div style={{ height: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Loader2 size={36} color="var(--saas-sage-primary, #10B981)" />
        </motion.div>
        <span style={{ fontSize: '0.88rem', color: '#648275', fontWeight: 500 }}>
          Synchronizing nutritional baseline...
        </span>
      </div>
    );
  }

  const activeAlerts = (data.alerts || (data.alertData ? [data.alertData] : [])).filter(
    (a) => !dismissedAlerts.includes(a.target)
  );

  return (
    <div style={{ maxWidth: '1380px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* ==========================================
          HEADER BAR: Welcome & Quick Action Buttons
          ========================================== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 className="heading-font" style={{ fontSize: 'clamp(1.6rem, 2.2vw, 2rem)', fontWeight: 700, color: 'var(--saas-text-heading, #0F241D)', marginBottom: '4px' }}>
            Welcome back, {displayName}.
          </h1>
          <p style={{ color: 'var(--saas-text-muted, #648275)', fontSize: '0.88rem' }}>
            Live nutritional blueprint & rolling 7-day biological baseline.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link to="/app/meals" className="saas-pill-btn-white" style={{ fontSize: '0.86rem', padding: '8px 18px' }}>
            History
          </Link>
          <Link to="/app/meal-log" className="saas-pill-btn" style={{ fontSize: '0.86rem', padding: '8px 20px' }}>
            <Camera size={16} />
            <span>Log Meal</span>
          </Link>
        </div>
      </div>

      {/* ==========================================
          ROW 1: Top 3 Compact Analytics Cards
          (Mirroring reference: 1 Dark Card + 2 White Cards)
          ========================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }} className="dashboard-top-metrics">
        
        {/* Card 1: Featured Dark Forest Hero Card (Air Pollution Level equivalent) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="saas-dark-card"
          style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: '#8CA79B', fontWeight: 500 }}>
                Weekly Nutrition Score
              </span>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'rgba(52, 211, 153, 0.15)', color: '#34D399',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Zap size={16} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
              <span className="heading-font" style={{ fontSize: '2.1rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>
                {data.topMetrics?.score ?? 88}%
              </span>
              <span style={{ fontSize: '0.78rem', color: '#A7F3D0' }}>
                metabolic pace
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '0.74rem', color: '#34D399', fontWeight: 600,
              background: 'rgba(52, 211, 153, 0.14)', padding: '2px 8px', borderRadius: '999px'
            }}>
              ▲ 2.3% vs baseline
            </span>
            <MetricBars color="#34D399" heights={[30, 50, 70, 95, 60, 85]} />
          </div>
        </motion.div>

        {/* Card 2: White Card (Daily Avg Calories) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          className="saas-card"
          style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--saas-text-muted, #648275)', fontWeight: 500 }}>
                Daily Avg Calories
              </span>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'rgba(212, 129, 138, 0.15)', color: '#D4818A',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <TrendingUp size={16} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
              <span className="heading-font" style={{ fontSize: '2.1rem', fontWeight: 700, color: 'var(--saas-text-heading, #0F241D)', lineHeight: 1 }}>
                {data.topMetrics?.calories ?? 0}
              </span>
              <span style={{ fontSize: '0.86rem', color: 'var(--saas-text-muted, #648275)' }}>
                / 2,000 kcal
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--saas-border-light, #EEF2F0)' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '0.74rem', color: '#D4818A', fontWeight: 600,
              background: 'rgba(212, 129, 138, 0.12)', padding: '2px 8px', borderRadius: '999px'
            }}>
              ▼ 1.4% target pace
            </span>
            <MetricBars color="#D4818A" heights={[40, 75, 60, 85, 50, 65]} />
          </div>
        </motion.div>

        {/* Card 3: White Card (Deficiency Risk Status) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16 }}
          className="saas-card"
          style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--saas-text-muted, #648275)', fontWeight: 500 }}>
                Deficiency Risk Index
              </span>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: activeAlerts.length > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: activeAlerts.length > 0 ? '#D97706' : '#10B981',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {activeAlerts.length > 0 ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
              <span className="heading-font" style={{ fontSize: '2.1rem', fontWeight: 700, color: 'var(--saas-text-heading, #0F241D)', lineHeight: 1 }}>
                {activeAlerts.length > 0 ? `${activeAlerts.length} Flagged` : '0 Optimal'}
              </span>
              <span style={{ fontSize: '0.82rem', color: activeAlerts.length > 0 ? '#D97706' : '#10B981', fontWeight: 600 }}>
                {activeAlerts.length > 0 ? 'Shortfall Risk' : 'Nominal'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--saas-border-light, #EEF2F0)' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '0.74rem',
              color: activeAlerts.length > 0 ? '#B45309' : '#059669',
              fontWeight: 600,
              background: activeAlerts.length > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              padding: '2px 8px', borderRadius: '999px',
              maxWidth: '190px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {activeAlerts.length > 0 ? `${activeAlerts.map(a => a.target).join(', ')} low` : 'All Micronutrients Optimal'}
            </span>
            <MetricBars color="#10B981" heights={[60, 70, 85, 90, 75, 100]} />
          </div>
        </motion.div>

      </div>

      {/* ==========================================
          ROW 2: Main Chart (Left) + KPI Summary Card (Right)
          (Mirroring reference: Climate Change Index + 99,681m TONS card)
          ========================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.1fr)',
        gap: '20px',
        alignItems: 'stretch'
      }} className="dashboard-grid-2col">
        
        {/* Main Chart Card (Vitamin D & Baseline) */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="saas-card"
          style={{ padding: '22px', display: 'flex', flexDirection: 'column', minHeight: '360px' }}
        >
          {/* Chart Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 className="heading-font" style={{ fontSize: '1.18rem', fontWeight: 700, color: 'var(--saas-text-heading, #0F241D)', margin: 0 }}>
                Vitamin D Fulfillment
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--saas-text-muted, #648275)' }}>
                7-day intake vs Recommended Daily Benchmark (15 mcg)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Range Pill Button (mirroring reference "2 month" button) */}
              <div style={{
                background: '#0B1713',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '0.76rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}>
                <span>7 Days</span>
                <ChevronDown size={13} color="#8CA79B" />
              </div>

              <Link
                to="/app/insights"
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--saas-sage-primary, #10B981)',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>Full Insights</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Area Chart Container */}
          <div style={{ flex: 1, width: '100%', minHeight: '260px' }}>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.chartData || []} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="saasEmeraldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="90%" stopColor="#10B981" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F0" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#7E998E" 
                  tick={{ fill: '#7E998E', fontSize: 12, fontWeight: 500 }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#7E998E" 
                  tick={{ fill: '#7E998E', fontSize: 12, fontWeight: 500 }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="optimal" 
                  stroke="#D4818A" 
                  fill="transparent" 
                  strokeDasharray="4 4" 
                  strokeWidth={1.8}
                  name="Target RDI" 
                />
                <Area 
                  type="monotone" 
                  dataKey="completion" 
                  stroke="#10B981" 
                  strokeWidth={2.4}
                  fillOpacity={1} 
                  fill="url(#saasEmeraldGrad)" 
                  name="Your Intake" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Right KPI Summary Card (Mirroring reference "99,681m TONS" card) */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.22 }}
          style={{
            background: 'var(--saas-sage-soft, #EAF4EE)',
            border: '1px solid rgba(42, 140, 110, 0.22)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.04)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
              <span className="heading-font" style={{
                fontSize: 'clamp(2.3rem, 3.2vw, 3rem)',
                fontWeight: 700,
                color: 'var(--saas-sage-text, #0E2E21)',
                lineHeight: 1
              }}>
                {data.topMetrics?.score ?? 88}%
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#4B6B5D', letterSpacing: '0.04em' }}>
                BIO-INDEX
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.84rem', color: '#059669', fontWeight: 600 }}>
                ▲ 20% metabolic balance
              </span>
            </div>
          </div>

          {/* Two stacked insight rows (mirroring reference Mechanical & Chemical recycling) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
              background: '#FFFFFF',
              border: '1px solid rgba(42, 140, 110, 0.14)',
              borderRadius: '14px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(52, 211, 153, 0.16)', color: '#059669',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <RefreshCw size={15} />
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#0F241D' }}>
                    Micronutrient Absorption
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#648275' }}>
                    Target RDI Fulfillment
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669' }}>
                Optimal
              </span>
            </div>

            <div style={{
              background: '#FFFFFF',
              border: '1px solid rgba(42, 140, 110, 0.14)',
              borderRadius: '14px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(52, 211, 153, 0.16)', color: '#059669',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ShieldCheck size={15} />
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#0F241D' }}>
                    Biological Stability
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#648275' }}>
                    7-day Rolling Baseline
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669' }}>
                Nominal
              </span>
            </div>
          </div>
        </motion.div>

      </div>

      {/* ==========================================
          ROW 3: Meal Table (Left) + Dark AI Alert Widget (Right)
          (Mirroring reference: Table by Region + Global pollution card)
          ========================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.1fr)',
        gap: '20px',
        alignItems: 'start'
      }} className="dashboard-grid-2col">
        
        {/* Left Column: Recent Meals Table Layout (Plastic Recycling by Region equivalent) */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.28 }}
          className="saas-card"
          style={{ padding: '22px' }}
        >
          {/* Table Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 className="heading-font" style={{ fontSize: '1.18rem', fontWeight: 700, color: 'var(--saas-text-heading, #0F241D)', margin: 0 }}>
                Recent Meal Logs & Biomarkers
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--saas-text-muted, #648275)' }}>
                Direct dietary capture & nutritional records
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: '#0B1713',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '0.76rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span>Today</span>
                <ChevronDown size={13} color="#8CA79B" />
              </div>

              <Link
                to="/app/meals"
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--saas-sage-primary, #10B981)',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                View All →
              </Link>
            </div>
          </div>

          {/* Meals Table Content */}
          {(!data.recentMeals || data.recentMeals.length === 0) ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 16px',
              background: '#F8FAF9',
              borderRadius: '14px',
              border: '1px dashed #D3DFD7'
            }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)', color: '#10B981',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <Utensils size={20} />
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F241D', marginBottom: '4px' }}>
                No meals logged yet today
              </div>
              <p style={{ fontSize: '0.8rem', color: '#648275', marginBottom: '14px' }}>
                Capture your breakfast, lunch, or dinner to update live biomarkers.
              </p>
              <Link
                to="/app/meal-log"
                className="saas-pill-btn"
                style={{ fontSize: '0.82rem', padding: '7px 18px' }}
              >
                + Log your first meal
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '480px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--saas-border-light, #EEF2F0)' }}>
                    <th style={{ padding: '8px 10px', fontSize: '0.72rem', color: '#7E998E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Meal / Item
                    </th>
                    <th style={{ padding: '8px 10px', fontSize: '0.72rem', color: '#7E998E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Calories
                    </th>
                    <th style={{ padding: '8px 10px', fontSize: '0.72rem', color: '#7E998E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Dynamic
                    </th>
                    <th style={{ padding: '8px 10px', fontSize: '0.72rem', color: '#7E998E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Status
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '0.72rem', color: '#7E998E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentMeals.map((meal, i) => (
                    <tr
                      key={meal.id || i}
                      style={{
                        borderBottom: i !== data.recentMeals.length - 1 ? '1px solid #F0F4F2' : 'none',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#F8FAF9'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Name & Time */}
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '10px',
                            background: 'rgba(16, 185, 129, 0.12)', color: '#059669',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Utensils size={15} />
                          </div>
                          <div style={{ maxWidth: '200px' }}>
                            <div style={{
                              fontSize: '0.88rem', fontWeight: 600, color: '#0F241D',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                            }}>
                              {meal.name}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#7E998E' }}>
                              {meal.time}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Calories */}
                      <td style={{ padding: '12px 10px', fontSize: '0.88rem', fontWeight: 600, color: '#0F241D' }}>
                        {meal.cals} <span style={{ fontSize: '0.74rem', fontWeight: 400, color: '#7E998E' }}>kcal</span>
                      </td>

                      {/* Dynamic Curve */}
                      <td style={{ padding: '12px 10px' }}>
                        <WaveSparkline trend={i % 2 === 0 ? 'up' : 'down'} />
                      </td>

                      {/* Status Tag */}
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 600,
                          padding: '3px 8px', borderRadius: '6px',
                          background: 'rgba(52, 211, 153, 0.14)', color: '#059669'
                        }}>
                          Logged
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <Link
                          to="/app/meals"
                          style={{
                            color: '#7E998E',
                            textDecoration: 'none',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.color = '#10B981'}
                          onMouseOut={(e) => e.currentTarget.style.color = '#7E998E'}
                        >
                          <span>Details</span>
                          <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Right Column: Dark AI Deficiencies Widget (Global Pollution card equivalent) */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.32 }}
          className="saas-dark-card"
          style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div>
            {/* Widget Top Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#34D399" />
                <h3 className="heading-font" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                  AI Bio-Prediction & Risks
                </h3>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#34D399',
                borderRadius: '999px',
                padding: '3px 9px',
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399' }} />
                <span>Active</span>
              </div>
            </div>

            {/* Deficiency Alerts or Nominal State */}
            <AnimatePresence>
              {activeAlerts.length > 0 ? (
                activeAlerts.map((alert, idx) => (
                  <motion.div
                    key={alert.target || idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.32)',
                      borderRadius: '14px',
                      padding: '16px',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          padding: '4px', background: 'rgba(245, 158, 11, 0.22)',
                          borderRadius: '6px', color: '#FBBF24'
                        }}>
                          <AlertTriangle size={15} />
                        </div>
                        <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#FFFFFF' }}>
                          Shortfall: {alert.target}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDismissAlert(alert.target)}
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          fontSize: '0.72rem', color: '#9CA3AF', textDecoration: 'underline'
                        }}
                      >
                        Dismiss
                      </button>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: '#D1D5DB', lineHeight: 1.45, marginBottom: '10px' }}>
                      {alert.message}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#FBBF24', fontWeight: 600 }}>
                      <Sparkles size={13} />
                      <span>AI Dietary Recommendation</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div style={{
                  background: 'rgba(52, 211, 153, 0.08)',
                  border: '1px solid rgba(52, 211, 153, 0.22)',
                  borderRadius: '14px',
                  padding: '20px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'rgba(52, 211, 153, 0.18)', color: '#34D399',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Check size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFFFFF' }}>
                      All Baselines Nominal
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#8CA79B', marginTop: '2px' }}>
                      7-day intake meets baseline targets across tracked micronutrients.
                    </div>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Clinical Disclaimer Callout in Dark Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginTop: '12px'
          }}>
            <Info size={16} color="#34D399" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '0.74rem', color: '#8CA79B', lineHeight: 1.45 }}>
              <strong style={{ color: '#D1D5DB' }}>Nutritional Disclaimer:</strong> Nutriq tracks biological baselines and computes predictive shortfalls using dietary pattern analysis. These indicators reflect nutritional trends and are not clinical medical diagnoses.
            </span>
          </div>
        </motion.div>

      </div>

    </div>
  );
};

export default Dashboard;

