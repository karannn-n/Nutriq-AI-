import React from 'react';
import { motion } from 'framer-motion';

const Intelligence = () => (
  <section id="intelligence" style={{ background: '#080a12', padding: '120px 0', overflow: 'hidden', position: 'relative' }}>
    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '600px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.3), transparent)' }} />

    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '64px', maxWidth: '720px' }}>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}
        >
          Intelligence Engine
        </motion.p>
        <motion.h2
          className="heading-font"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', color: '#fff', letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '20px' }}
        >
          Insights that drive{' '}
          <span style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            action.
          </span>
        </motion.h2>
        <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
          Our dashboard gives you a 360° view of your nutritional health — turning microscopic data into a complete picture of your biological state.
        </p>
      </div>

      {/* Dashboard UI Mockup */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.9, type: 'spring', bounce: 0.15 }}
        style={{ width: '100%', maxWidth: '900px', position: 'relative' }}
      >
        {/* Ambient glow under card */}
        <div style={{ position: 'absolute', bottom: '-40px', left: '50%', transform: 'translateX(-50%)', width: '70%', height: '60px', background: 'rgba(52,211,153,0.15)', filter: 'blur(30px)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{
          width: '100%', borderRadius: '20px', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          background: '#0d1117',
        }}>
          {/* Titlebar */}
          <div style={{ height: '52px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '8px', background: '#080a12' }}>
            <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#eab308' }} />
            <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#22c55e' }} />
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ height: '22px', width: '180px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }} />
            </div>
          </div>

          {/* Body */}
          <div style={{ display: 'flex', height: '400px' }}>
            {/* Sidebar */}
            <div style={{ width: '180px', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#080a12', flexShrink: 0 }}>
              {[['80%', '#34d399'], ['55%', null], ['65%', null], ['50%', null]].map(([w, active], i) => (
                <div key={i} style={{ height: '36px', width: w, borderRadius: '8px', background: active ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)', border: active ? '1px solid rgba(52,211,153,0.25)' : '1px solid transparent', display: 'flex', alignItems: 'center', padding: '0 10px', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: active ? '#34d399' : 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                  <div style={{ height: '8px', flex: 1, borderRadius: '4px', background: active ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.07)' }} />
                </div>
              ))}
            </div>

            {/* Main content */}
            <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Metric cards */}
              <div style={{ display: 'flex', gap: '14px' }}>
                {[
                  { label: 'Vitamin D Alert', val: '-15%', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
                  { label: 'Weekly Score', val: '87', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
                  { label: 'Avg Calories', val: '1,820', color: '#818cf8', bg: 'rgba(129,140,248,0.08)', border: 'rgba(129,140,248,0.2)' },
                ].map((m, i) => (
                  <div key={i} style={{ flex: 1, height: '100px', borderRadius: '12px', background: m.bg, border: `1px solid ${m.border}`, padding: '14px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>{m.label}</div>
                    <div style={{ fontSize: '1.7rem', fontWeight: 700, color: m.color, fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>{m.val}</div>
                  </div>
                ))}
              </div>

              {/* Chart area */}
              <div style={{ flex: 1, borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', position: 'relative', overflow: 'hidden' }}>
                <svg viewBox="0 0 200 60" style={{ width: '100%', height: '100%', position: 'absolute', bottom: 0 }} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 60 Q25 30, 50 40 T100 15 T150 25 T200 10 L200 60 L0 60 Z" fill="url(#chartGrad)" />
                  <path d="M0 60 Q25 30, 50 40 T100 15 T150 25 T200 10" fill="none" stroke="#34d399" strokeWidth="1.5" />
                  <path d="M0 60 Q25 50, 50 52 T100 45 T150 48 T200 42 L200 60 L0 60 Z" fill="rgba(129,140,248,0.08)" />
                  <path d="M0 60 Q25 50, 50 52 T100 45 T150 48 T200 42" fill="none" stroke="#818cf8" strokeWidth="1" strokeDasharray="3 2" />
                </svg>
                <div style={{ position: 'absolute', top: '12px', left: '16px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Vitamin D — 7 day trend</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default Intelligence;
