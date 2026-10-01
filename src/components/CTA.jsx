import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowDown, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import MotionLink from './landing/MotionLink';
import { Dish, Tomato, BasilLeaf } from './landing/FoodArt';
import { EASE, SOFT_SPRING, VIEWPORT, fadeUp, stagger, buttonHover, buttonTap } from './landing/motion';

const CTA = () => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { user } = useAuth();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const bowlRotate = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-10, 10]);
  const bowlY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [40, -40]);
  const garnishY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [80, -80]);

  return (
    <section className="lp-cta" ref={ref} aria-label="Get started">
      <div className="lp-container lp-cta-inner">
        <motion.div className="lp-cta-copy" initial="hidden" whileInView="show" viewport={VIEWPORT} variants={stagger(0.1)}>
          <motion.span className="lp-eyebrow" variants={fadeUp}>Free to start — no credit card required</motion.span>
          <motion.h2 className="lp-display lp-h2" variants={fadeUp}>
            Ready to change <em>how you eat?</em>
          </motion.h2>
          <motion.p className="lp-lead" variants={fadeUp}>
            Join thousands of users who use AI to discover their perfect nutritional balance and unlock peak health.
          </motion.p>
          <motion.div className="lp-cta-ctas" variants={fadeUp}>
            {user ? (
              <MotionLink to="/app/dashboard" className="lp-btn lp-btn-primary" whileHover={buttonHover} whileTap={buttonTap}>
                <LayoutDashboard size={17} /> Open Dashboard
              </MotionLink>
            ) : (
              <MotionLink to="/register" className="lp-btn lp-btn-primary" whileHover={buttonHover} whileTap={buttonTap}>
                Start your healthy journey <ArrowRight size={17} className="lp-btn-arrow" />
              </MotionLink>
            )}
            <motion.a href="#how-it-works" className="lp-btn lp-btn-ghost" whileHover={buttonHover} whileTap={buttonTap}>
              <span className="lp-btn-icon"><ArrowDown size={13} /></span> See how it works
            </motion.a>
          </motion.div>
        </motion.div>

        <div className="lp-cta-art" aria-hidden="true">
          <motion.div style={{ inset: 0, y: bowlY, rotate: bowlRotate }}>
            <motion.div initial={{ opacity: 0, x: 80, scale: 0.95 }} whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={VIEWPORT} transition={{ duration: 1.3, ease: EASE }}>
              <Dish variant="salmon" />
            </motion.div>
          </motion.div>
          <motion.div style={{ left: '-4%', top: '8%', width: '12%', y: garnishY }}
            initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={VIEWPORT}
            transition={{ ...SOFT_SPRING, delay: 0.4 }}>
            <Tomato />
          </motion.div>
          <motion.div style={{ left: '4%', bottom: '14%', width: '13%', y: garnishY }}
            initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={VIEWPORT}
            transition={{ ...SOFT_SPRING, delay: 0.55 }}>
            <BasilLeaf rotate={-50} />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
