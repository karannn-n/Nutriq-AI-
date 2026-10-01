import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, ArrowRight, Check, ChevronDown, LayoutDashboard, PlusCircle, History,
  Lightbulb, Settings, Zap, Flame, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import MotionLink from './landing/MotionLink';
import { EASE, VIEWPORT, fadeUp, stagger, buttonHover, buttonTap, useParallax } from './landing/motion';

const SIDEBAR = [
  { icon: <LayoutDashboard size={13} />, label: 'Dashboard', active: true },
  { icon: <PlusCircle size={13} />, label: 'Log Meal' },
  { icon: <History size={13} />, label: 'Meal History' },
  { icon: <Lightbulb size={13} />, label: 'Insights' },
  { icon: <Settings size={13} />, label: 'Settings' },
];

const MACROS = [
  { label: 'Carbs', pct: 45, color: '#2F7A52' },
  { label: 'Protein', pct: 25, color: '#5B8DEF' },
  { label: 'Fat', pct: 30, color: '#F29A4B' },
];

/* Micronutrients Nutriq tracks, as % of weekly target */
const MICROS = [
  { label: 'Vitamin D', v: 0.42, low: true },
  { label: 'Iron', v: 0.82 },
  { label: 'Zinc', v: 0.7 },
  { label: 'B12', v: 0.88 },
];

const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } };

const MiniBars = ({ values, color }) => (
  <svg className="lp-mock-bars" width="46" height="26" viewBox="0 0 46 26" aria-hidden="true">
    {values.map((v, i) => (
      <motion.rect key={i} x={i * 8} width="5" rx="1.5" fill={color} opacity={i === values.length - 1 ? 1 : 0.35}
        initial={{ height: 0, y: 26 }} whileInView={{ height: v * 26, y: 26 - v * 26 }} viewport={VIEWPORT}
        transition={{ duration: 0.8, ease: EASE, delay: 0.6 + i * 0.05 }} />
    ))}
  </svg>
);

/* Each segment starts where the previous one ended */
const MACRO_STARTS = MACROS.map((_, i) => MACROS.slice(0, i).reduce((sum, m) => sum + m.pct / 100, 0));

const Donut = () => {
  const gap = 0.012;
  return (
    <svg width="96" height="96" viewBox="0 0 100 100" role="img" aria-label="Macros: 45% carbs, 25% protein, 30% fat">
      <circle cx="50" cy="50" r="38" fill="none" stroke="#F1EEE8" strokeWidth="12" />
      {MACROS.map((m, i) => {
        const frac = m.pct / 100;
        const rot = -90 + MACRO_STARTS[i] * 360;
        return (
          <g key={m.label} transform={`rotate(${rot} 50 50)`}>
            <motion.circle cx="50" cy="50" r="38" fill="none" stroke={m.color} strokeWidth="12" strokeLinecap="butt"
              initial={{ pathLength: 0 }} whileInView={{ pathLength: frac - gap }} viewport={VIEWPORT}
              transition={{ duration: 1, ease: EASE, delay: 0.7 + i * 0.2 }} />
          </g>
        );
      })}
      <text x="50" y="49" textAnchor="middle" fontSize="13" fontWeight="700" fill="#14231A">1,820</text>
      <text x="50" y="61" textAnchor="middle" fontSize="8" fill="#6B776F">kcal / day</text>
    </svg>
  );
};

const Radar = () => {
  const c = 60, R = 38;
  const pt = (i, v) => {
    const a = (-90 + i * 90) * (Math.PI / 180);
    return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v];
  };
  const poly = MICROS.map((m, i) => pt(i, m.v).join(',')).join(' ');
  const labelPos = [[60, 12], [110, 63], [60, 116], [10, 63]];
  return (
    <svg className="lp-radar" viewBox="0 0 120 120" role="img" aria-label="Micronutrients: Vitamin D low, Iron, Zinc and B12 on track">
      {[0.25, 0.5, 0.75, 1].map(s => (
        <polygon key={s} points={MICROS.map((_, i) => pt(i, s).join(',')).join(' ')} fill="none" stroke="#E7E3DA" strokeWidth="0.8" />
      ))}
      {MICROS.map((_, i) => <line key={i} x1={c} y1={c} x2={pt(i, 1)[0]} y2={pt(i, 1)[1]} stroke="#E7E3DA" strokeWidth="0.8" />)}
      <motion.polygon points={poly} fill="rgba(78,154,110,0.28)" stroke="#2F7A52" strokeWidth="1.4" strokeLinejoin="round"
        style={{ transformOrigin: '60px 60px' }}
        initial={{ scale: 0.3, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={VIEWPORT}
        transition={{ duration: 1.1, ease: EASE, delay: 0.8 }} />
      {MICROS.map((m, i) => {
        const [x, y] = pt(i, m.v);
        return <circle key={m.label} cx={x} cy={y} r="2.2" fill={m.low ? '#F29A4B' : '#2F7A52'} />;
      })}
      {MICROS.map((m, i) => (
        <text key={m.label} x={labelPos[i][0]} y={labelPos[i][1]} textAnchor="middle" fontSize="7"
          fill={m.low ? '#C76A1C' : '#6B776F'} fontWeight={m.low ? 700 : 400}>{m.label}</text>
      ))}
    </svg>
  );
};

const DashboardMockup = () => (
  <motion.div className="lp-mock" aria-label="Preview of the Nutriq dashboard" role="img"
    initial="hidden" whileInView="show" viewport={VIEWPORT} variants={stagger(0.08, 0.3)}>
    <aside className="lp-mock-side">
      <div className="lp-mock-brand"><span><Activity size={13} color="#fff" /></span>Nutriq</div>
      <ul className="lp-mock-nav">
        {SIDEBAR.map(s => (
          <motion.li key={s.label} className={s.active ? 'is-active' : ''} variants={item}>{s.icon}{s.label}</motion.li>
        ))}
      </ul>
    </aside>
    <div className="lp-mock-main">
      <motion.div className="lp-mock-head" variants={item}>
        <h4>Your Nutrition Overview</h4>
        <span className="lp-mock-pill">This Week <ChevronDown size={11} /></span>
      </motion.div>

      <div className="lp-mock-metrics">
        <motion.div className="lp-mock-card" variants={item}>
          <div className="lp-mock-label"><i style={{ background: '#E6F3E4', color: '#2F7A52' }}><Zap size={10} /></i>Weekly Score</div>
          <div className="lp-mock-row">
            <div><div className="lp-mock-value">88<small>%</small></div><div className="lp-mock-delta" style={{ color: '#2F7A52' }}>+ 6%</div></div>
            <MiniBars values={[0.4, 0.55, 0.5, 0.7, 0.65, 0.9]} color="#2F7A52" />
          </div>
        </motion.div>
        <motion.div className="lp-mock-card" variants={item}>
          <div className="lp-mock-label"><i style={{ background: '#FDEBDD', color: '#E0762B' }}><Flame size={10} /></i>Avg Calories</div>
          <div className="lp-mock-row">
            <div><div className="lp-mock-value">1,820<small>kcal</small></div><div className="lp-mock-delta" style={{ color: '#E0762B' }}>7-day avg</div></div>
            <MiniBars values={[0.7, 0.5, 0.8, 0.6, 0.75, 0.65]} color="#F29A4B" />
          </div>
        </motion.div>
        <motion.div className="lp-mock-card" variants={item}>
          <div className="lp-mock-label"><i style={{ background: '#FCEFC7', color: '#B7791F' }}><AlertTriangle size={10} /></i>Deficiency Risks</div>
          <div className="lp-mock-value">1</div>
          <div className="lp-mock-delta" style={{ color: '#B7791F' }}>Vitamin D low</div>
        </motion.div>
      </div>

      <div className="lp-mock-charts">
        <motion.div className="lp-mock-card" variants={item}>
          <h5>Macronutrient Distribution</h5>
          <div className="lp-donut-wrap">
            <Donut />
            <ul className="lp-legend">
              {MACROS.map(m => <li key={m.label}><b style={{ background: m.color }} />{m.label} {m.pct}%</li>)}
            </ul>
          </div>
        </motion.div>
        <motion.div className="lp-mock-card" variants={item}>
          <h5>Micronutrient Status</h5>
          <Radar />
        </motion.div>
      </div>
    </div>
  </motion.div>
);

const Intelligence = () => {
  const artRef = useRef(null);
  const y = useParallax(artRef, 30);
  const { user } = useAuth();

  return (
    <section id="intelligence" className="lp-intel">
      <div className="lp-container lp-intel-grid">
        <motion.div className="lp-intel-copy" initial="hidden" whileInView="show" viewport={VIEWPORT} variants={stagger(0.1)}>
          <motion.span className="lp-eyebrow" variants={fadeUp}>Intelligence Engine</motion.span>
          <motion.h2 className="lp-display lp-h2" variants={fadeUp}>
            Insights that drive <em>action.</em>
          </motion.h2>
          <motion.p className="lp-lead" variants={fadeUp}>
            Our dashboard gives you a 360° view of your nutritional health — turning microscopic data
            into a complete picture of your biological state.
          </motion.p>
          <motion.ul className="lp-intel-points" variants={fadeUp}>
            {['Weekly health score & calorie trends', 'Macro split for every meal you log', 'Vitamin D, Iron, Zinc & B12 status at a glance'].map(p => (
              <li key={p}><span className="dot"><Check size={13} /></span>{p}</li>
            ))}
          </motion.ul>
          <motion.div variants={fadeUp}>
            <MotionLink to={user ? '/app/dashboard' : '/register'} className="lp-btn lp-btn-primary" whileHover={buttonHover} whileTap={buttonTap}>
              {user ? 'Open your dashboard' : 'Explore your dashboard'} <ArrowRight size={16} className="lp-btn-arrow" />
            </MotionLink>
          </motion.div>
        </motion.div>

        <motion.div ref={artRef} style={{ y }}>
          <motion.div initial={{ opacity: 0, x: 48 }} whileInView={{ opacity: 1, x: 0 }} viewport={VIEWPORT}
            transition={{ duration: 1.1, ease: EASE }}>
            <DashboardMockup />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Intelligence;
