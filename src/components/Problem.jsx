import React from 'react';
import { motion } from 'framer-motion';
import { EyeOff, Calculator, UserX } from 'lucide-react';
import { EASE, VIEWPORT, fadeUp, stagger } from './landing/motion';

const problems = [
  {
    icon: <EyeOff size={20} />, tint: '#EEF6EC', color: '#2F7A52',
    title: 'Hidden Deficiencies',
    desc: "You feel tired, brain-fogged, or slow — but you don't know why. Your diet is missing crucial micronutrients you can't see.",
  },
  {
    icon: <Calculator size={20} />, tint: '#EAF1FA', color: '#3E6FD1',
    title: 'Blind Calorie Counting',
    desc: 'Counting calories ignores what actually matters — the vitamins, minerals, and micronutrients that control your biology.',
  },
  {
    icon: <UserX size={20} />, tint: '#FBF0E4', color: '#D9792B',
    title: 'Generic Advice',
    desc: 'One-size-fits-all nutrition plans ignore your unique biological baseline. What works for someone else may not work for you.',
  },
];

const card = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: EASE } },
};

const Problem = () => (
  <section id="problem" className="lp-why">
    <div className="lp-container">
      <motion.div className="lp-why-head" initial="hidden" whileInView="show" viewport={VIEWPORT} variants={stagger(0.1)}>
        <motion.span className="lp-eyebrow" variants={fadeUp}>The Problem</motion.span>
        <motion.h2 className="lp-display lp-h2" variants={fadeUp}>
          The world is overfed, <span>yet malnourished.</span>
        </motion.h2>
      </motion.div>

      <motion.div className="lp-why-grid" initial="hidden" whileInView="show" viewport={VIEWPORT} variants={stagger(0.12)}>
        {problems.map(p => (
          <motion.article key={p.title} className="lp-why-card" style={{ background: p.tint }}
            variants={card} whileHover={{ y: -4, transition: { duration: 0.35, ease: EASE } }}>
            <div className="lp-why-icon" style={{ color: p.color }}>{p.icon}</div>
            <div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </div>
  </section>
);

export default Problem;
