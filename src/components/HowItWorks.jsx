import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Utensils, Brain, AlertTriangle, TrendingUp, ArrowLeft, ArrowRight } from 'lucide-react';
import { EASE, VIEWPORT, fadeUp, stagger } from './landing/motion';

const steps = [
  { icon: <Utensils size={18} />, color: '#2F7A52', tint: '#E6F3E4', title: 'Log Your Meal', desc: 'Type or describe what you ate in plain English — no barcodes, no manual entry.' },
  { icon: <Brain size={18} />, color: '#3E6FD1', tint: '#E4ECFA', title: 'AI Analysis', desc: 'Gemini AI extracts every macro and micro nutrient with scientific accuracy in under 2 seconds.' },
  { icon: <AlertTriangle size={18} />, color: '#C27A12', tint: '#FCEFC7', title: 'Smart Alerts', desc: 'Our engine scans your 7-day patterns and alerts you before deficiencies take hold.' },
  { icon: <TrendingUp size={18} />, color: '#C2415E', tint: '#FBE3E8', title: 'Improve & Thrive', desc: 'Get exact food recommendations to close your nutritional gaps and optimise your health.' },
];

const card = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const HowItWorks = () => {
  const rowRef = useRef(null);
  const scroll = dir => {
    const row = rowRef.current;
    if (!row) return;
    const cardWidth = row.firstElementChild?.getBoundingClientRect().width ?? 300;
    row.scrollBy({ left: dir * (cardWidth + 20), behavior: 'smooth' });
  };

  return (
    <section id="how-it-works" className="lp-flow">
      <div className="lp-container">
        <motion.div className="lp-flow-head" initial="hidden" whileInView="show" viewport={VIEWPORT} variants={stagger(0.1)}>
          <div>
            <motion.span className="lp-eyebrow" variants={fadeUp}>The Flow</motion.span>
            <motion.h2 className="lp-display lp-h2" variants={fadeUp}>From tracking to <em>thriving.</em></motion.h2>
          </div>
          <motion.div className="lp-flow-arrows" variants={fadeUp}>
            <button className="lp-arrow" onClick={() => scroll(-1)} aria-label="Previous step"><ArrowLeft size={18} /></button>
            <button className="lp-arrow" onClick={() => scroll(1)} aria-label="Next step"><ArrowRight size={18} /></button>
          </motion.div>
        </motion.div>

        <motion.ol ref={rowRef} className="lp-flow-row" style={{ listStyle: 'none' }}
          initial="hidden" whileInView="show" viewport={VIEWPORT} variants={stagger(0.12)}>
          {steps.map((s, i) => (
            <motion.li key={s.title} className="lp-step" variants={card}
              whileHover={{ y: -6, transition: { duration: 0.35, ease: EASE } }}>
              <div>
                <div className="lp-step-num" aria-hidden="true">0{i + 1}</div>
                <p className="lp-step-desc">{s.desc}</p>
              </div>
              <div className="lp-step-foot">
                <div className="lp-step-who">
                  <span className="lp-step-icon" style={{ background: s.tint, color: s.color }}>{s.icon}</span>
                  <div>
                    <div className="lp-step-title">{s.title}</div>
                    <div className="lp-step-sub">Step {i + 1} of {steps.length}</div>
                  </div>
                </div>
                <div className="lp-step-bars" aria-hidden="true">
                  {steps.map((_, j) => <b key={j} className={j <= i ? 'on' : ''} />)}
                </div>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
};

export default HowItWorks;
