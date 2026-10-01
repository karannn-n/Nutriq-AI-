import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowDown, Plus, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MotionLink from './landing/MotionLink';
import { Tomato, BasilLeaf, BasilSprig, AvocadoHalf, Peppercorns, Dish } from './landing/FoodArt';
import { EASE, T, SOFT_SPRING, buttonHover, buttonTap, useMediaQuery } from './landing/motion';

/*
 * Decorative ingredients. `side` sets the entrance direction, `delay` staggers them so the
 * scene assembles piece by piece, `depth` drives scroll parallax and `float` a gentle idle drift.
 */
const INGREDIENTS = [
  { id: 'pepA', side: 'left', delay: 0.15, depth: 0.2, el: <Peppercorns /> },
  { id: 'leafA', side: 'left', delay: 0.22, depth: 0.35, float: 6, rotate: -28, el: <BasilLeaf tone="deep" /> },
  { id: 'leafB', side: 'left', delay: 0.3, depth: 0.25, float: 5, rotate: 38, el: <BasilLeaf /> },
  { id: 'tomA', side: 'left', delay: 0.38, depth: 0.45, float: 5, el: <Tomato /> },
  { id: 'leafC', side: 'left', delay: 0.5, depth: 0.3, float: 6, rotate: 64, el: <BasilLeaf /> },
  { id: 'leafD', side: 'left', delay: 0.58, depth: 0.15, float: 4, rotate: -40, el: <BasilLeaf tone="deep" /> },
  { id: 'sprig', side: 'right', delay: 0.2, depth: 0.3, float: 5, rotate: 0, el: <BasilSprig /> },
  { id: 'leafE', side: 'right', delay: 0.28, depth: 0.4, float: 6, rotate: -22, el: <BasilLeaf /> },
  { id: 'tomB', side: 'right', delay: 0.36, depth: 0.5, float: 6, el: <Tomato /> },
  { id: 'pepB', side: 'right', delay: 0.44, depth: 0.2, el: <Peppercorns /> },
  { id: 'tomC', side: 'right', delay: 0.52, depth: 0.35, float: 4, el: <Tomato /> },
  { id: 'seeds', side: 'right', delay: 0.6, depth: 0.1, el: <Dish variant="seeds" /> },
];
const MOBILE_INGREDIENTS = ['leafA', 'tomB', 'leafD'];

const MEALS = [
  { name: 'Avocado Toast & Eggs', dish: 'toast', kcal: 410, protein: 18, micro: 'B12 rich' },
  { name: 'Grilled Chicken Grain Bowl', dish: 'grain', kcal: 520, protein: 42, micro: 'Zinc 4mg', featured: true },
  { name: 'Chickpea Spinach Salad', dish: 'greens', kcal: 380, protein: 16, micro: 'Iron 5mg' },
  { name: 'Salmon Rice Bowl', dish: 'salmon', kcal: 480, protein: 34, micro: 'Vitamin D' },
];

const NUTRIENT_CHIPS = [
  { label: 'D', bg: '#FCEFC7' },
  { label: 'Fe', bg: '#F9DCD5' },
  { label: 'Zn', bg: '#DDEBF7' },
  { label: 'B12', bg: '#DFF0DC' },
];

const Ingredient = ({ item, progress, reduce }) => {
  const y = useTransform(progress, [0, 1], [0, reduce ? 0 : -item.depth * 220]);
  const dir = item.side === 'left' ? -1 : 1;
  const rotate = item.rotate ?? 0;
  return (
    <motion.div className={`lp-ing lp-ing--${item.id}`} style={{ y }}>
      <motion.div
        initial={{ opacity: 0, x: dir * 70, y: 14, rotate: rotate + dir * 8 }}
        animate={{ opacity: 1, x: 0, y: 0, rotate }}
        transition={{ ...SOFT_SPRING, stiffness: 55, delay: T.ingredients + item.delay, opacity: { duration: 0.7, ease: 'easeOut', delay: T.ingredients + item.delay } }}
      >
        <motion.div
          animate={reduce || !item.float ? undefined : { y: [0, -item.float, 0] }}
          transition={{ duration: 5 + item.float * 0.4, repeat: Infinity, ease: 'easeInOut', delay: 1.8 + item.delay }}
        >
          {item.el}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

/* The large grain bowl (left) and avocado (right) — the hero's main food imagery. */
const HeroFood = ({ progress, reduce }) => {
  const bowlY = useTransform(progress, [0, 1], [0, reduce ? 0 : -90]);
  const bowlRotate = useTransform(progress, [0, 1], [0, reduce ? 0 : 12]);
  const avoY = useTransform(progress, [0, 1], [0, reduce ? 0 : -140]);
  return (
    <>
      <motion.div className="lp-ing lp-ing--bowl" style={{ y: bowlY, rotate: bowlRotate }}>
        <motion.div
          initial={{ opacity: 0, x: -60, y: 40, rotate: -14 }}
          animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          transition={{ ...SOFT_SPRING, stiffness: 40, damping: 18, delay: T.food, opacity: { duration: 0.9, delay: T.food } }}
        >
          <Dish variant="grain" />
        </motion.div>
      </motion.div>
      <motion.div className="lp-ing lp-ing--avo" style={{ y: avoY }}>
        <motion.div
          initial={{ opacity: 0, x: 60, y: 40, rotate: -6 }}
          animate={{ opacity: 1, x: 0, y: 0, rotate: -18 }}
          transition={{ ...SOFT_SPRING, stiffness: 45, damping: 18, delay: T.food + 0.12, opacity: { duration: 0.9, delay: T.food + 0.12 } }}
        >
          <AvocadoHalf />
        </motion.div>
      </motion.div>
    </>
  );
};

/* On phones the food composition moves into the flow, beneath the CTAs. */
const MobilePlate = () => (
  <motion.div
    className="lp-plate"
    aria-hidden="true"
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 1, ease: EASE, delay: T.trust }}
  >
    <motion.div style={{ left: '4%', top: 0, width: '82%' }}
      initial={{ rotate: -12 }} animate={{ rotate: 0 }} transition={{ duration: 1.4, ease: EASE, delay: T.trust }}>
      <Dish variant="grain" />
    </motion.div>
    <motion.div style={{ right: '-6%', bottom: '-4%', width: '42%' }}
      initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SOFT_SPRING, delay: T.trust + 0.3 }}>
      <AvocadoHalf style={{ transform: 'rotate(-20deg)' }} />
    </motion.div>
    <motion.div style={{ left: '-4%', bottom: '4%', width: '18%' }}
      initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SOFT_SPRING, delay: T.trust + 0.4 }}>
      <Tomato />
    </motion.div>
  </motion.div>
);

const mealVariants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { ...SOFT_SPRING, stiffness: 60 } },
};
const dishVariants = {
  hidden: { opacity: 0, scale: 0.88, rotate: -18 },
  show: { opacity: 1, scale: 1, rotate: 0, transition: { duration: 1.1, ease: EASE } },
};

const Hero = () => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const { user } = useAuth();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  const ingredients = isMobile ? INGREDIENTS.filter(i => MOBILE_INGREDIENTS.includes(i.id)) : INGREDIENTS;
  const logTarget = user ? '/app/meal-log' : '/register';

  return (
    <section id="top" className="lp-hero" ref={ref}>
      <motion.div className="lp-hero-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, ease: 'easeOut', delay: T.backdrop }} />

      <div className="lp-hero-deco" aria-hidden="true">
        {!isMobile && <HeroFood progress={scrollYProgress} reduce={reduce} />}
        {ingredients.map(item => (
          <Ingredient key={item.id} item={item} progress={scrollYProgress} reduce={reduce} />
        ))}
      </div>

      <div className="lp-container">
        <div className="lp-hero-copy">
          <motion.span className="lp-eyebrow"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: T.eyebrow }}>
            AI-powered nutrition intelligence
          </motion.span>

          <h1 className="lp-display lp-hero-title">
            <span className="lp-line">
              <motion.span initial={{ y: '105%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1.1, ease: EASE, delay: T.heading }}>
                Eat Smart.
              </motion.span>
            </span>
            <span className="lp-line">
              <motion.em initial={{ y: '105%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1.1, ease: EASE, delay: T.heading + 0.14 }}>
                Live Better.
              </motion.em>
            </span>
          </h1>

          <motion.p className="lp-lead lp-hero-sub"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: T.desc }}>
            Stop eating blindly. Log meals in plain English, predict deficiencies before they happen,
            and unlock your body's full potential with AI-driven nutritional insights.
          </motion.p>

          <motion.div className="lp-hero-ctas"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: T.cta }}>
            {user ? (
              <MotionLink to="/app/dashboard" className="lp-btn lp-btn-primary" whileHover={buttonHover} whileTap={buttonTap}>
                <LayoutDashboard size={17} /> Open Dashboard
              </MotionLink>
            ) : (
              <MotionLink to="/register" className="lp-btn lp-btn-primary" whileHover={buttonHover} whileTap={buttonTap}>
                Start for free <ArrowRight size={17} className="lp-btn-arrow" />
              </MotionLink>
            )}
            <motion.a href="#how-it-works" className="lp-btn lp-btn-ghost" whileHover={buttonHover} whileTap={buttonTap}>
              <span className="lp-btn-icon"><ArrowDown size={13} /></span> See how it works
            </motion.a>
          </motion.div>

          <motion.div className="lp-trust"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, ease: 'easeOut', delay: T.trust }}>
            <div className="lp-trust-stack" aria-hidden="true">
              {NUTRIENT_CHIPS.map(c => (
                <span key={c.label} className="lp-trust-chip" style={{ background: c.bg }}>{c.label}</span>
              ))}
            </div>
            <div className="lp-trust-text">
              <strong>Trusted by 12K+ users</strong>
              Tracking Vitamin D, Iron, Zinc &amp; B12
            </div>
          </motion.div>
        </div>

        {isMobile && <MobilePlate />}

        <motion.ul
          className="lp-meals"
          aria-label="Example meals"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: T.cards } } }}
          style={{ listStyle: 'none' }}
        >
          {MEALS.map(m => (
            <motion.li key={m.name} className={`lp-meal${m.featured ? ' is-featured' : ''}`}
              variants={mealVariants} whileHover={{ y: -6, transition: { duration: 0.35, ease: EASE } }}>
              <motion.div className="lp-meal-dish" variants={dishVariants}><Dish variant={m.dish} /></motion.div>
              <h3 className="lp-meal-name">{m.name}</h3>
              <p className="lp-meal-meta"><span>{m.protein}g protein</span><span>{m.micro}</span></p>
              <div className="lp-meal-foot">
                <span className="lp-meal-kcal">{m.kcal} kcal</span>
                <Link to={logTarget} className="lp-meal-add" aria-label={`Log ${m.name}`}>
                  <Plus size={17} />
                </Link>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
};

export default Hero;
