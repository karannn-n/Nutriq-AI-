import React from 'react';
import { motion } from 'framer-motion';

const problems = [
  {
    emoji: '😴',
    title: 'Hidden Deficiencies',
    desc: "You feel tired, brain-fogged, or slow — but you don't know why. Your diet is missing crucial micronutrients you can't see.",
  },
  {
    emoji: '🔢',
    title: 'Blind Calorie Counting',
    desc: "Counting calories ignores what actually matters — the vitamins, minerals, and micronutrients that control your biology.",
  },
  {
    emoji: '📋',
    title: 'Generic Advice',
    desc: "One-size-fits-all nutrition plans ignore your unique biological baseline. What works for someone else may not work for you.",
  },
];

const Problem = () => (
  <section id="problem" style={{ background: '#0d1117', padding: '120px 0', position: 'relative' }}>
    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '600px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(251,113,133,0.25), transparent)' }} />

    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '64px', maxWidth: '680px', margin: '0 auto 64px' }}>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ color: '#fb7185', fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}
        >
          The Problem
        </motion.p>
        <motion.h2
          className="heading-font"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', color: '#fff', letterSpacing: '-1.5px', lineHeight: 1.1 }}
        >
          The world is overfed,{' '}
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>yet malnourished.</span>
        </motion.h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {problems.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            style={{
              padding: '36px', borderRadius: '20px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '20px' }}>{p.emoji}</div>
            <h3 className="heading-font" style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '12px', fontWeight: 600 }}>{p.title}</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, fontSize: '0.92rem' }}>{p.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Problem;
