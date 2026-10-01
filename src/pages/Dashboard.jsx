import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Camera, AlertTriangle, TrendingUp, Zap, Loader2, ArrowRight, Info, Check, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
      <div style={{ height: '100%', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
           <Loader2 size={40} color="var(--accent-primary)" />
         </motion.div>
      </div>
    );
  }

  const activeAlerts = (data.alerts || (data.alertData ? [data.alertData] : [])).filter(
    (a) => !dismissedAlerts.includes(a.target)
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="heading-font" style={{ fontSize: '2.2rem', marginBottom: '6px' }}>Welcome back, {displayName}.</h1>
          <p style={{ color: 'var(--text-muted)' }}>Here is your live nutritional blueprint and rolling 7-day biological baseline.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/app/meals" className="btn btn-outline" style={{ padding: '12px 20px', fontSize: '0.92rem', textDecoration: 'none' }}>
            History
          </Link>
          <Link to="/app/meal-log" className="btn btn-gradient" style={{ border: 'none', padding: '12px 24px', fontSize: '0.92rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={18} /> Log Meal
          </Link>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {[
          { label: 'Weekly Score', value: `${data.topMetrics?.score ?? 88}%`, sub: 'Rolling Biological Baseline', color: 'var(--accent-primary)', icon: <Zap size={20} /> },
          { label: 'Daily Avg Calories', value: `${data.topMetrics?.calories ?? 0} kcal`, sub: 'Calculated 7-day intake', color: 'var(--accent-secondary)', icon: <TrendingUp size={20} /> },
          { label: 'Deficiency Risks', value: activeAlerts.length, sub: activeAlerts.length > 0 ? `${activeAlerts.map(a => a.target).join(', ')} low` : 'All Micronutrients Optimal', color: activeAlerts.length > 0 ? 'var(--accent-tertiary)' : 'var(--accent-primary)', icon: <AlertTriangle size={20} /> },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-panel" style={{ padding: '24px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', color: stat.color }}>
               <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{stat.label}</span>
               {stat.icon}
             </div>
             <div className="heading-font" style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '4px' }}>{stat.value}</div>
             <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column - Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel" style={{ padding: '28px', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="heading-font" style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Vitamin D Fulfillment</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>7-day intake vs Recommended Daily Benchmark (15 mcg)</span>
              </div>
              <Link to="/app/insights" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                Full Insights <ArrowRight size={14} />
              </Link>
            </div>
            <div style={{ flex: 1, width: '100%', minHeight: '300px' }}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.chartData || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,140,110,0.12)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)', fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)', fontSize: 12}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'rgba(184,224,210,0.97)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-main)' }} />
                  <Area type="monotone" dataKey="optimal" stroke="rgba(212,129,138,0.45)" fill="transparent" strokeDasharray="5 5" name="Target RDI" />
                  <Area type="monotone" dataKey="completion" stroke="var(--accent-primary)" fillOpacity={1} fill="url(#colorComp)" name="Your Intake" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Clinical Disclaimer Callout */}
          <div style={{
            background: 'rgba(42, 140, 110, 0.07)',
            border: '1px solid rgba(42, 140, 110, 0.2)',
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            <Info size={22} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              <strong>Nutritional Disclaimer:</strong> Nutriq tracks biological baselines and computes predictive shortfalls using dietary pattern analysis. These indicators reflect nutritional trends and are not clinical medical diagnoses.
            </span>
          </div>
        </div>

        {/* Right Column - Alerts & Recent */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Active Deficiency Alerts */}
          <AnimatePresence>
            {activeAlerts.length > 0 ? (
              activeAlerts.map((alert, idx) => (
                <motion.div
                  key={alert.target || idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(255,255,255,0.4) 100%)',
                    borderRadius: '18px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ padding: '6px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '8px', color: '#b45309' }}>
                        <AlertTriangle size={18} />
                      </div>
                      <h3 className="heading-font" style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>Shortfall Risk: {alert.target}</h3>
                    </div>
                    <button
                      onClick={() => handleDismissAlert(alert.target)}
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'underline',
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '14px' }}>
                    {alert.message}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#b45309', fontWeight: 500 }}>
                    <ShieldCheck size={14} /> AI Dietary Recommendation
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel" style={{ padding: '24px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: 'rgba(42,140,110,0.15)', borderRadius: '50%', color: 'var(--accent-primary)' }}>
                  <Check size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No Projected Deficiencies</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>7-day intake meets baseline targets.</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent Meals Feed */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel" style={{ padding: '24px', borderRadius: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="heading-font" style={{ fontSize: '1.15rem' }}>Recent Meal Logs</h3>
              <Link to="/app/meals" style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
                View All →
              </Link>
            </div>

            {(!data.recentMeals || data.recentMeals.length === 0) ? (
               <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 10px', fontSize: '0.9rem' }}>
                 No meals logged yet today.<br />
                 <Link to="/app/meal-log" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, marginTop: '8px', display: 'inline-block' }}>
                   + Log your first meal
                 </Link>
               </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {data.recentMeals.map((meal, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: i !== data.recentMeals.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                    <div style={{ maxWidth: '70%' }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 500, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meal.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{meal.time}</div>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '0.92rem' }}>
                      {meal.cals} kcal
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
