import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

/* Animated floating pill stat */
const Stat = ({ value, label, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6 }}
    style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '14px',
      padding: '14px 22px',
      textAlign: 'center',
      backdropFilter: 'blur(12px)',
    }}
  >
    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.6rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: '4px', letterSpacing: '0.03em' }}>{label}</div>
  </motion.div>
);

const Hero = () => {
  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      paddingTop: '90px',
      overflow: 'hidden',
      position: 'relative',
      background: 'linear-gradient(165deg, #080a12 0%, #0d1117 55%, #0a1a12 100%)',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(52,211,153,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(52,211,153,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />

      {/* Glow orbs */}
      <div style={{ position: 'absolute', top: '-10%', left: '20%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '0%', right: '10%', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '7px 18px', borderRadius: '40px', marginBottom: '36px',
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.25)',
              color: '#34d399', fontSize: '0.83rem', fontWeight: 600, letterSpacing: '0.04em',
            }}
          >
            <Sparkles size={14} />
            Powered by Gemini AI · v2.0
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="heading-font"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            style={{
              fontSize: 'clamp(3rem, 8vw, 5.8rem)',
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: '-2.5px',
              color: '#fff',
              marginBottom: '28px',
            }}
          >
            Eat Smart.{' '}
            <span style={{
              background: 'linear-gradient(135deg, #34d399 0%, #059669 60%, #6ee7b7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Live Better.
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              fontSize: 'clamp(1.05rem, 2.5vw, 1.25rem)',
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.7,
              maxWidth: '580px',
              margin: '0 auto 48px',
            }}
          >
            Stop eating blindly. Log meals in plain English, predict deficiencies before they happen, and unlock your body's full potential with AI-driven nutritional insights.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '64px' }}
          >
            <Link to="/register" style={{
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '15px 36px', borderRadius: '14px', fontSize: '1rem', fontWeight: 600,
              color: '#fff', background: 'linear-gradient(135deg, #34d399, #059669)',
              boxShadow: '0 0 30px rgba(52,211,153,0.35)',
              fontFamily: 'Outfit, sans-serif', transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(52,211,153,0.5)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(52,211,153,0.35)'; }}
            >
              Start for free <ArrowRight size={18} />
            </Link>
            <a href="#how-it-works" style={{
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '15px 36px', borderRadius: '14px', fontSize: '1rem', fontWeight: 500,
              color: 'rgba(255,255,255,0.75)',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              fontFamily: 'Outfit, sans-serif', transition: 'background 0.2s, color 0.2s',
            }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
            >
              See how it works
            </a>
          </motion.div>

          {/* Stats row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Stat value="12K+" label="Active Users" delay={0.5} />
            <Stat value="98%" label="Accuracy Rate" delay={0.6} />
            <Stat value="4 Nutrients" label="Tracked Daily" delay={0.7} />
            <Stat value="< 2s" label="AI Response" delay={0.8} />
          </div>
        </div>
      </div>

      {/* Floating orbs decoration */}
      <motion.div
        animate={{ y: [0, -18, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '28%', left: '8%', width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
      >
        <span style={{ fontSize: '1.5rem' }}>🥗</span>
      </motion.div>
      <motion.div
        animate={{ y: [0, 22, 0] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut', delay: 1 }}
        style={{ position: 'absolute', top: '60%', right: '8%', width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
      >
        <span style={{ fontSize: '1.5rem' }}>🧬</span>
      </motion.div>
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 2 }}
        style={{ position: 'absolute', bottom: '20%', left: '12%', width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(232,200,106,0.1)', border: '1px solid rgba(232,200,106,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
      >
        <span style={{ fontSize: '1.3rem' }}>⚡</span>
      </motion.div>
    </section>
  );
};

export default Hero;
