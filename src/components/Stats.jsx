import React, { useEffect, useRef } from 'react';
import { motion, animate, useInView, useReducedMotion } from 'framer-motion';
import { Users, Target, FlaskConical, Zap } from 'lucide-react';
import { EASE, VIEWPORT, fadeUp, stagger } from './landing/motion';
import { BasilLeaf, Dish, Tomato } from './landing/FoodArt';

const stats = [
  { icon: <Users size={26} />, to: 12, suffix: 'K+', label: 'Active Users' },
  { icon: <Target size={26} />, to: 98, suffix: '%', label: 'Accuracy Rate' },
  { icon: <FlaskConical size={26} />, to: 4, suffix: '', label: 'Nutrients Tracked Daily' },
  { icon: <Zap size={26} />, to: 2, prefix: '< ', suffix: 's', label: 'AI Response' },
];

/* Counts up once when scrolled into view; writes to the DOM directly to avoid re-renders. */
const CountUp = ({ to, prefix = '', suffix = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: EASE,
      onUpdate: v => { if (ref.current) ref.current.textContent = `${prefix}${Math.round(v)}${suffix}`; },
    });
    return () => controls.stop();
  }, [inView, reduce, to, prefix, suffix]);

  return <span ref={ref} aria-hidden="true">{prefix}{reduce ? to : 0}{suffix}</span>;
};

const Stats = () => (
  <section className="lp-stats" aria-label="Nutriq in numbers">
    <div className="lp-stats-art" aria-hidden="true">
      <Dish variant="greens" size={260} style={{ left: '-60px', top: '-90px' }} />
      <BasilLeaf size={120} rotate={40} style={{ left: '30%', top: '-40px' }} />
      <Tomato size={90} style={{ right: '28%', bottom: '-30px' }} />
      <Dish variant="salmon" size={240} style={{ right: '-50px', top: '-60px' }} />
    </div>
    <motion.div className="lp-container lp-stats-grid" initial="hidden" whileInView="show" viewport={VIEWPORT} variants={stagger(0.1)}>
      {stats.map(s => (
        <motion.div key={s.label} className="lp-stat" variants={fadeUp}>
          <div className="lp-stat-icon">{s.icon}</div>
          <div className="lp-stat-value">
            <span className="lp-sr">{s.prefix}{s.to}{s.suffix}</span>
            <CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} />
          </div>
          <div className="lp-stat-label">{s.label}</div>
        </motion.div>
      ))}
    </motion.div>
  </section>
);

export default Stats;
