import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const CTA = () => (
  <section style={{ background: '#0d1117', padding: '120px 0', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '600px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.3), transparent)' }} />

    {/* Background glow */}
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '700px', height: '400px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(52,211,153,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

    <div className="container" style={{ position: 'relative', zIndex: 10 }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        style={{
          textAlign: 'center',
          padding: '80px 40px',
          borderRadius: '28px',
          border: '1px solid rgba(52,211,153,0.12)',
          background: 'rgba(52,211,153,0.03)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '7px 18px', borderRadius: '40px', marginBottom: '32px',
          background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)',
          color: '#34d399', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.05em',
        }}>
          <Sparkles size={13} /> Free to start — no credit card required
        </div>

        <h2 className="heading-font" style={{
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          color: '#fff', letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '20px',
        }}>
          Ready to change<br />
          <span style={{ background: 'linear-gradient(135deg, #34d399, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            how you eat?
          </span>
        </h2>
        <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.45)', maxWidth: '520px', margin: '0 auto 48px', lineHeight: 1.7 }}>
          Join thousands of users who use AI to discover their perfect nutritional balance and unlock peak health.
        </p>

        <Link to="/register" style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          padding: '16px 44px', borderRadius: '14px', fontSize: '1.05rem', fontWeight: 600,
          color: '#fff', textDecoration: 'none',
          background: 'linear-gradient(135deg, #34d399, #059669)',
          boxShadow: '0 0 40px rgba(52,211,153,0.35)',
          fontFamily: 'Outfit, sans-serif', transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 55px rgba(52,211,153,0.5)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(52,211,153,0.35)'; }}
        >
          Start your healthy journey <ArrowRight size={19} />
        </Link>
      </motion.div>
    </div>
  </section>
);

export default CTA;
