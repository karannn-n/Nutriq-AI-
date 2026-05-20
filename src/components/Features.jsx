import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Bell, Activity, PieChart } from 'lucide-react';

const features = [
  {
    icon: <Camera size={22} />,
    color: '#34d399',
    bg: 'rgba(52,211,153,0.1)',
    border: 'rgba(52,211,153,0.2)',
    title: 'Smart Meal Tracking',
    desc: 'Log food in plain English. Our AI breaks down macros and micros with clinical precision — no barcodes needed.',
  },
  {
    icon: <Bell size={22} />,
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.1)',
    border: 'rgba(129,140,248,0.2)',
    title: 'Predictive Alerts',
    desc: 'Get warned before you become deficient. The engine detects nutritional patterns up to 5 days in advance.',
  },
  {
    icon: <Activity size={22} />,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.2)',
    title: 'Biological Analytics',
    desc: 'Understand how your diet drives your energy, recovery, and long-term health at a biological level.',
  },
  {
    icon: <PieChart size={22} />,
    color: '#fb7185',
    bg: 'rgba(251,113,133,0.1)',
    border: 'rgba(251,113,133,0.2)',
    title: 'Visual Insights',
    desc: 'Premium radar charts, trend lines, and macro breakdowns that make nutrition data feel effortless to understand.',
  },
];

const Features = () => (
  <section id="features" style={{ background: '#0d1117', padding: '120px 0', position: 'relative' }}>
    {/* Subtle top separator glow */}
    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '600px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.3), transparent)' }} />

    <div className="container">
      <div style={{ marginBottom: '72px' }}>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ color: '#34d399', fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}
        >
          What Nutriq Does
        </motion.p>
        <motion.h2
          className="heading-font"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', color: '#fff', letterSpacing: '-1.5px', lineHeight: 1.1 }}
        >
          Features that feel like{' '}
          <span style={{ background: 'linear-gradient(135deg, #34d399, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            magic.
          </span>
        </motion.h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '20px' }}>
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '20px',
              padding: '32px',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'default',
              transition: 'border-color 0.3s',
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = f.border}
            onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
          >
            {/* Top accent line */}
            <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '2px', background: `linear-gradient(90deg, transparent, ${f.color}, transparent)`, borderRadius: '1px' }} />

            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: f.bg, border: `1px solid ${f.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '22px', color: f.color,
            }}>
              {f.icon}
            </div>
            <h3 className="heading-font" style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '12px', fontWeight: 600 }}>{f.title}</h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, fontSize: '0.92rem' }}>{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
