import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Bell, Activity, PieChart } from 'lucide-react';
import { VIEWPORT, fadeUp, stagger } from './landing/motion';

const features = [
  { icon: <Camera size={22} />, title: 'Smart Meal Tracking', desc: 'Log food in plain English — no barcodes needed.' },
  { icon: <Bell size={22} />, title: 'Predictive Alerts', desc: 'Get warned up to 5 days before a deficiency.' },
  { icon: <Activity size={22} />, title: 'Biological Analytics', desc: 'See how diet drives energy and recovery.' },
  { icon: <PieChart size={22} />, title: 'Visual Insights', desc: 'Radar charts, trends and macro breakdowns.' },
];

const Features = () => (
  <section id="features" className="lp-strip" aria-label="Features">
    <motion.div
      className="lp-container lp-strip-grid"
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={stagger(0.1)}
    >
      {features.map(f => (
        <motion.div key={f.title} className="lp-strip-item" variants={fadeUp}>
          <div className="lp-strip-icon">{f.icon}</div>
          <h3 className="lp-strip-title">{f.title}</h3>
          <p className="lp-strip-desc">{f.desc}</p>
        </motion.div>
      ))}
    </motion.div>
  </section>
);

export default Features;
