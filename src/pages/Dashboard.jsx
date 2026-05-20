import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Camera, AlertTriangle, TrendingUp, Zap, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Dashboard API Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading || !data) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
           <Loader2 size={40} color="var(--accent-primary)" />
         </motion.div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 className="heading-font" style={{ fontSize: '2rem', marginBottom: '8px' }}>Welcome back, Alex.</h1>
          <p style={{ color: 'var(--text-muted)' }}>Here's your live nutritional blueprint.</p>
        </div>
        <Link to="/app/meal-log" className="btn btn-gradient" style={{ border: 'none', padding: '12px 24px', fontSize: '0.95rem', textDecoration: 'none' }}>
          <Camera size={18} /> Log Meal
        </Link>
      </div>

      {/* Top Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Weekly Score', value: data.topMetrics?.score || 'N/A', sub: 'Rolling Biological Baseline', color: 'var(--accent-primary)', icon: <Zap size={20} /> },
          { label: 'Avg Calories', value: data.topMetrics?.calories || 0, sub: 'Target tracked', color: 'var(--accent-secondary)', icon: <TrendingUp size={20} /> },
          { label: 'Deficiency Risks', value: data.alertData ? '1' : '0', sub: data.alertData ? `${data.alertData.target} low` : 'All Optimal', color: data.alertData ? 'var(--accent-tertiary)' : 'var(--accent-primary)', icon: <AlertTriangle size={20} /> },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-panel" style={{ padding: '24px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', color: stat.color }}>
               <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{stat.label}</span>
               {stat.icon}
             </div>
             <div className="heading-font" style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '4px' }}>{stat.value}</div>
             <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Left Column - Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel" style={{ padding: '24px', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between' }}>
            <h3 className="heading-font" style={{ fontSize: '1.2rem' }}>Vitamin D Fulfillment</h3>
          </div>
          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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
                <Area type="monotone" dataKey="optimal" stroke="rgba(212,129,138,0.45)" fill="transparent" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="completion" stroke="var(--accent-primary)" fillOpacity={1} fill="url(#colorComp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Right Column - Alerts & Recent */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <AnimatePresence>
          {data.alertData && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, rgba(255,255,255,0.02) 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: 'var(--accent-tertiary)' }}>
                  <AlertTriangle size={20} />
                </div>
                <h3 className="heading-font" style={{ fontSize: '1.1rem' }}>AI Prediction: {data.alertData.target}</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {data.alertData.message}
              </p>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Recent Meals */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-panel" style={{ padding: '24px', flex: 1 }}>
            <h3 className="heading-font" style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Recent Logs</h3>
            {data.recentMeals.length === 0 ? (
               <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '20px' }}>No meals logged yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {data.recentMeals.map((meal, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: i !== data.recentMeals.length -1 ? '1px solid var(--glass-border)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: '4px' }}>{meal.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{meal.time}</div>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{meal.cals} kcal</div>
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
