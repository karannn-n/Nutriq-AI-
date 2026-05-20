import React from 'react';
import { motion } from 'framer-motion';
import { Utensils, Brain, AlertTriangle, TrendingUp } from 'lucide-react';

const steps = [
  { icon: <Utensils size={22} />, color: '#34d399', title: 'Log Your Meal', desc: 'Type or describe what you ate in plain English — no barcodes, no manual entry.' },
  { icon: <Brain size={22} />, color: '#818cf8', title: 'AI Analysis', desc: 'Gemini AI extracts every macro and micro nutrient with scientific accuracy in under 2 seconds.' },
  { icon: <AlertTriangle size={22} />, color: '#f59e0b', title: 'Smart Alerts', desc: 'Our engine scans your 7-day patterns and alerts you before deficiencies take hold.' },
  { icon: <TrendingUp size={22} />, color: '#fb7185', title: 'Improve & Thrive', desc: 'Get exact food recommendations to close your nutritional gaps and optimise your health.' },
];

const HowItWorks = () => (
  <section id="how-it-works" style={{ background: '#080a12', padding: '120px 0', position: 'relative' }}>
    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '600px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.3), transparent)' }} />

    <div className="container">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '80px' }}>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ color: '#818cf8', fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}
        >
          The Flow
        </motion.p>
        <motion.h2
          className="heading-font"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', color: '#fff', letterSpacing: '-1.5px' }}
        >
          From tracking to{' '}
          <span style={{ background: 'linear-gradient(135deg, #818cf8, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            thriving.
          </span>
        </motion.h2>
      </div>

      {/* Steps */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2px', position: 'relative' }}>
        {/* Connector line (desktop) */}
        <style>{`
          @media(min-width: 768px) {
            .hiw-connector { display: block !important; }
          }
        `}</style>
        <div className="hiw-connector" style={{ display: 'none', position: 'absolute', top: '44px', left: '12.5%', right: '12.5%', height: '1px', background: 'linear-gradient(90deg, rgba(52,211,153,0.3), rgba(129,140,248,0.3), rgba(245,158,11,0.3), rgba(251,113,133,0.3))', zIndex: 0 }} />

        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 24px', position: 'relative', zIndex: 1 }}
          >
            {/* Step number + icon circle */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: `rgba(${step.color === '#34d399' ? '52,211,153' : step.color === '#818cf8' ? '129,140,248' : step.color === '#f59e0b' ? '245,158,11' : '251,113,133'},0.1)`,
              border: `1.5px solid ${step.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '24px', color: step.color, position: 'relative',
              boxShadow: `0 0 24px ${step.color}20`,
            }}>
              {step.icon}
              <div style={{
                position: 'absolute', top: '-6px', right: '-6px',
                width: '22px', height: '22px', borderRadius: '50%',
                background: step.color, color: '#000',
                fontSize: '0.7rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Outfit, sans-serif',
              }}>{i + 1}</div>
            </div>
            <h3 className="heading-font" style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '10px', fontWeight: 600 }}>{step.title}</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', lineHeight: 1.65, maxWidth: '200px' }}>{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
