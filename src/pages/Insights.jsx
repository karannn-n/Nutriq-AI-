import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, TrendingUp, Flame } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLOR = { good: '#2A8C6E', low: '#E8C86A', deficient: '#D4818A' };
const STATUS_LABEL = { good: 'On Track', low: 'Low', deficient: 'Deficient' };

const card = {
  padding: '24px',
  borderRadius: '20px',
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--glass-shadow)',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem' }}>
      <div style={{ fontWeight: 700, marginBottom: '4px', fontFamily: 'Outfit, sans-serif' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color || 'var(--text-main)' }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

// ─── Nutrient Card ────────────────────────────────────────────────────────────
const NutrientCard = ({ label, avg, rdi, unit, pct, status, delay }) => {
  const color = STATUS_COLOR[status];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{ ...card, padding: '20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1rem', marginBottom: '2px' }}>{label}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {avg} / {rdi} {unit} daily
          </div>
        </div>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px',
          borderRadius: '999px', background: `${color}18`, color,
          border: `1px solid ${color}40`,
        }}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: delay + 0.2 }}
          style={{ height: '100%', borderRadius: '999px', background: color }}
        />
      </div>
      <div style={{ marginTop: '6px', fontSize: '0.78rem', color, fontWeight: 600 }}>{pct}% of RDI</div>
    </motion.div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const Insights = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const apiURL = import.meta.env.VITE_API_URL;
        if (!apiURL) throw new Error("VITE_API_URL environment variable is not defined");
        const response = await fetch(`${apiURL}/api/insights`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.warn("API Offline, falling back to local storage database:", err.message);
        try {
          const { getOfflineInsights } = await import('../utils/offlineDb');
          setData(getOfflineInsights());
        } catch (localErr) {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  if (loading) return (
    <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
        <Loader2 size={40} color="var(--accent-primary)" />
      </motion.div>
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', paddingTop: '60px', color: '#dc2626' }}>
      <AlertTriangle size={40} style={{ marginBottom: '12px' }} />
      <p>Could not load insights: {error}</p>
    </div>
  );

  // Empty state
  if (!data.hasMeals) return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="heading-font" style={{ fontSize: '2rem', marginBottom: '6px' }}>Deep Insights</h1>
        <p style={{ color: 'var(--text-muted)' }}>Long-term behavioural tracking powered by AI.</p>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, padding: '60px', textAlign: 'center' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(42,140,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--accent-primary)' }}>
          <Sparkles size={36} />
        </div>
        <h2 className="heading-font" style={{ fontSize: '1.8rem', marginBottom: '12px' }}>Need more data!</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto', lineHeight: 1.7 }}>
          Log at least a few meals and the AI Intelligence Engine will generate your personalised nutritional breakdown, trend charts, and health recommendations here.
        </p>
      </motion.div>
    </div>
  );

  // ── Radar data ──────────────────────────────────────────────────────────────
  const radarData = data.nutrientStatus.map(n => ({
    subject: n.label.replace('Vitamin ', 'Vit. '),
    value: n.pct,
    fullMark: 100,
  }));

  // ── Macro pie data ─────────────────────────────────────────────────────────
  const pieData = [
    { name: 'Protein', value: Math.round(data.macros.protein * 4), color: '#2A8C6E' },
    { name: 'Carbs',   value: Math.round(data.macros.carbs * 4),   color: '#E8C86A' },
    { name: 'Fat',     value: Math.round(data.macros.fat * 9),     color: '#D4818A' },
  ].filter(d => d.value > 0);

  // ── Deficiency count ────────────────────────────────────────────────────────
  const goodCount = data.nutrientStatus.filter(n => n.status === 'good').length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 className="heading-font" style={{ fontSize: '2rem', marginBottom: '6px' }}>Deep Insights</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          AI-powered analysis of your last 7 days · {data.totalMeals} meals logged
        </p>
      </div>

      {/* ── AI Summary Banner ── */}
      <AnimatePresence>
        {data.aiSummary && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              ...card,
              marginBottom: '28px',
              background: 'linear-gradient(135deg, rgba(42,140,110,0.10) 0%, rgba(82,196,160,0.06) 100%)',
              border: '1px solid rgba(42,140,110,0.25)',
              display: 'flex', alignItems: 'flex-start', gap: '16px',
            }}
          >
            <div style={{
              width: '44px', height: '44px', flexShrink: 0, borderRadius: '12px',
              background: 'rgba(42,140,110,0.12)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--accent-primary)',
            }}>
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-primary)', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                AI Weekly Summary
              </div>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-main)' }}>{data.aiSummary}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Stat Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px', marginBottom: '28px' }}>
        {[
          { icon: <CheckCircle2 size={20} />, label: 'Nutrients On Track', value: `${goodCount} / 4`, color: '#2A8C6E' },
          { icon: <Flame size={20} />,        label: 'Avg Daily Calories',  value: `${data.macros.calories} kcal`, color: '#D4818A' },
          { icon: <TrendingUp size={20} />,   label: 'Avg Daily Protein',   value: `${data.macros.protein}g`, color: '#2A8C6E' },
          { icon: <AlertTriangle size={20} />,label: 'Deficiencies Found',  value: `${data.deficiencies.length}`, color: data.deficiencies.length > 0 ? '#E8C86A' : '#2A8C6E' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} style={{ ...card, padding: '20px' }}>
            <div style={{ color: s.color, marginBottom: '10px' }}>{s.icon}</div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.7rem', fontWeight: 700, marginBottom: '2px' }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Nutrient Status Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '28px' }}>
        {data.nutrientStatus.map((n, i) => (
          <NutrientCard key={n.label} {...n} delay={i * 0.08} />
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>

        {/* Radar Chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={card}>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>Nutrient Radar</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>% of RDI met per nutrient</div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="rgba(42,140,110,0.15)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <Radar name="You" dataKey="value" stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Macro Pie */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={card}>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>Macro Split</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Average daily calories by macro</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v} kcal`} contentStyle={{ borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.92)', fontSize: '0.82rem' }} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '0.82rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No macro data yet.</div>
          )}
        </motion.div>
      </div>

      {/* ── Daily Trends Bar Chart ── */}
      {data.dailyTrends.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ ...card, marginBottom: '28px' }}>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>Daily Micronutrient Intake</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Last 7 days — Vitamin D (mcg), Iron (mg), Zinc (mg), B12 (mcg)</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.dailyTrends} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,140,110,0.10)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="vit_d" name="Vit. D"  fill="#2A8C6E" radius={[4,4,0,0]} />
              <Bar dataKey="iron"  name="Iron"    fill="#52C4A0" radius={[4,4,0,0]} />
              <Bar dataKey="zinc"  name="Zinc"    fill="#E8C86A" radius={[4,4,0,0]} />
              <Bar dataKey="b12"   name="B12"     fill="#D4818A" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* ── Deficiency Alert Cards ── */}
      {data.deficiencies.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.1rem', marginBottom: '16px' }}>
            ⚠️ Action Needed
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.deficiencies.map(name => {
              const ns = data.nutrientStatus.find(n => n.label === name);
              return (
                <div key={name} style={{
                  ...card, padding: '18px 22px',
                  background: 'rgba(212,129,138,0.07)',
                  border: '1px solid rgba(212,129,138,0.25)',
                  display: 'flex', alignItems: 'center', gap: '16px',
                }}>
                  <AlertTriangle size={22} color="#D4818A" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#D4818A', marginBottom: '2px' }}>
                      {name} — {ns?.pct}% of RDI
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Average intake is significantly below the recommended daily intake of {ns?.rdi} {ns?.unit}.
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

    </div>
  );
};

export default Insights;
