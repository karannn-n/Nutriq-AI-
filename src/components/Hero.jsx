import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowDown, Plus, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MotionLink from './landing/MotionLink';
import { EASE, T, SOFT_SPRING, buttonHover, buttonTap, useMediaQuery } from './landing/motion';

const BASE = import.meta.env.BASE_URL || '/';
const foodUrl = (file) => `${BASE.endsWith('/') ? BASE : BASE + '/'}food/${file}`;

/*
 * Decorative ingredients with realistic photography cutouts.
 * Each element enters independently from its natural side with distinct delays,
 * subtle scales, gentle spring curves, and organic floating idle loops.
 */
const INGREDIENTS = [
  {
    id: 'pepA',
    side: 'left',
    delay: 0.18,
    slideX: 55,
    slideY: -22,
    depth: 0.2,
    rotate: -12,
    initialRotate: -28,
    stiffness: 58,
    damping: 18,
    src: foodUrl('peppercorns.png'),
    cls: 'lp-food-pep',
    alt: 'Whole peppercorns',
  },
  {
    id: 'leafA',
    side: 'left',
    delay: 0.26,
    slideX: 75,
    slideY: 12,
    depth: 0.35,
    float: 6,
    rotate: -28,
    initialRotate: -45,
    stiffness: 48,
    damping: 16,
    src: foodUrl('basil_leaf.png'),
    cls: 'lp-food-leaf',
    alt: 'Fresh organic basil leaf',
  },
  {
    id: 'leafB',
    side: 'left',
    delay: 0.34,
    slideX: 65,
    slideY: -16,
    depth: 0.25,
    float: 5,
    rotate: 38,
    initialRotate: 16,
    stiffness: 52,
    damping: 17,
    src: foodUrl('basil_leaf.png'),
    cls: 'lp-food-leaf',
    alt: 'Fresh basil leaf',
  },
  {
    id: 'tomA',
    side: 'left',
    delay: 0.42,
    slideX: 80,
    slideY: 18,
    depth: 0.45,
    float: 5,
    rotate: -8,
    initialRotate: -24,
    stiffness: 46,
    damping: 15,
    src: foodUrl('tomato_single.png'),
    cls: 'lp-food-tom',
    alt: 'Vine-ripened cherry tomato',
  },
  {
    id: 'leafC',
    side: 'left',
    delay: 0.52,
    slideX: 70,
    slideY: 24,
    depth: 0.3,
    float: 6,
    rotate: 64,
    initialRotate: 42,
    stiffness: 42,
    damping: 15,
    src: foodUrl('basil_leaf.png'),
    cls: 'lp-food-leaf',
    alt: 'Fresh basil leaf',
  },
  {
    id: 'leafD',
    side: 'left',
    delay: 0.60,
    slideX: 60,
    slideY: 30,
    depth: 0.15,
    float: 4,
    rotate: -40,
    initialRotate: -58,
    stiffness: 45,
    damping: 16,
    src: foodUrl('basil_leaf.png'),
    cls: 'lp-food-leaf',
    alt: 'Fresh basil leaf',
  },
  {
    id: 'sprig',
    side: 'right',
    delay: 0.22,
    slideX: 52,
    slideY: -45, // enters subtly from nearest top-right corner
    depth: 0.3,
    float: 5,
    rotate: 8,
    initialRotate: -8,
    stiffness: 48,
    damping: 16,
    src: foodUrl('basil_sprig.png'),
    cls: 'lp-food-sprig',
    alt: 'Fresh Italian basil sprig',
  },
  {
    id: 'leafE',
    side: 'right',
    delay: 0.30,
    slideX: 65,
    slideY: -12,
    depth: 0.4,
    float: 6,
    rotate: -22,
    initialRotate: -4,
    stiffness: 50,
    damping: 17,
    src: foodUrl('basil_leaf.png'),
    cls: 'lp-food-leaf',
    alt: 'Fresh basil leaf',
  },
  {
    id: 'tomB',
    side: 'right',
    delay: 0.38,
    slideX: 85,
    slideY: 15,
    depth: 0.5,
    float: 6,
    rotate: 14,
    initialRotate: 30,
    stiffness: 44,
    damping: 16,
    src: foodUrl('tomato_single.png'),
    cls: 'lp-food-tom',
    alt: 'Vine-ripened cherry tomato',
  },
  {
    id: 'pepB',
    side: 'right',
    delay: 0.46,
    slideX: 60,
    slideY: 20,
    depth: 0.2,
    rotate: 15,
    initialRotate: -10,
    stiffness: 54,
    damping: 18,
    src: foodUrl('peppercorns.png'),
    cls: 'lp-food-pep',
    alt: 'Peppercorn spices',
  },
  {
    id: 'tomC',
    side: 'right',
    delay: 0.54,
    slideX: 70,
    slideY: 25,
    depth: 0.35,
    float: 4,
    rotate: -15,
    initialRotate: -35,
    stiffness: 46,
    damping: 15,
    src: foodUrl('tomato_single.png'),
    cls: 'lp-food-tom',
    alt: 'Vine-ripened cherry tomato',
  },
  {
    id: 'seeds',
    side: 'right',
    delay: 0.62,
    slideX: 75,
    slideY: 35,
    depth: 0.1,
    rotate: 0,
    initialRotate: 12,
    stiffness: 40,
    damping: 16,
    src: foodUrl('seeds_dish.png'),
    cls: 'lp-food-seeds',
    alt: 'Toasted seeds bowl',
  },
];

const MOBILE_INGREDIENTS = ['leafA', 'tomB', 'leafD'];

const MEALS = [
  { name: 'Avocado Toast & Eggs', img: foodUrl('avocado_toast.png'), kcal: 410, protein: 18, micro: 'B12 rich', dishRotate: -6 },
  { name: 'Grilled Chicken Grain Bowl', img: foodUrl('chicken_bowl.png'), kcal: 520, protein: 42, micro: 'Zinc 4mg', featured: true, dishRotate: 4 },
  { name: 'Chickpea Spinach Salad', img: foodUrl('chickpea_salad.png'), kcal: 380, protein: 16, micro: 'Iron 5mg', dishRotate: -4 },
  { name: 'Salmon Rice Bowl', img: foodUrl('salmon_bowl.png'), kcal: 480, protein: 34, micro: 'Vitamin D', dishRotate: 6 },
];

const NUTRIENT_CHIPS = [
  { label: 'D', bg: '#FCEFC7' },
  { label: 'Fe', bg: '#F9DCD5' },
  { label: 'Zn', bg: '#DDEBF7' },
  { label: 'B12', bg: '#DFF0DC' },
];

const Ingredient = ({ item, progress, reduce }) => {
  const y = useTransform(progress, [0, 1], [0, reduce ? 0 : -item.depth * 200]);
  const dir = item.side === 'left' ? -1 : 1;
  const rotate = item.rotate ?? 0;
  const initialRotate = item.initialRotate ?? (rotate + dir * 8);
  const slideX = (item.slideX ?? 70) * dir;
  const slideY = item.slideY ?? 14;

  return (
    <motion.div className={`lp-ing lp-ing--${item.id}`} style={{ y }}>
      <motion.div
        initial={{ opacity: 0, x: slideX, y: slideY, scale: 0.88, rotate: initialRotate }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate }}
        transition={{
          type: 'spring',
          stiffness: item.stiffness ?? 55,
          damping: item.damping ?? 17,
          mass: 1,
          delay: item.delay,
          opacity: { duration: 0.8, ease: 'easeOut', delay: item.delay },
        }}
      >
        <motion.div
          animate={reduce || !item.float ? undefined : { y: [0, -item.float, 0], rotate: [rotate, rotate + dir * 1.5, rotate] }}
          transition={{ duration: 5 + (item.float ?? 4) * 0.4, repeat: Infinity, ease: 'easeInOut', delay: 1.6 + item.delay }}
        >
          <img src={item.src} alt={item.alt || ''} className={`lp-food-img ${item.cls || ''}`} loading="eager" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

/* The large grain bowl (left) and avocado (right) — the hero's main food imagery. */
const HeroFood = ({ progress, reduce }) => {
  const bowlY = useTransform(progress, [0, 1], [0, reduce ? 0 : -80]);
  const bowlRotate = useTransform(progress, [0, 1], [0, reduce ? 0 : 8]);
  const avoY = useTransform(progress, [0, 1], [0, reduce ? 0 : -120]);

  return (
    <>
      <motion.div className="lp-ing lp-ing--bowl" style={{ y: bowlY, rotate: bowlRotate }}>
        <motion.div
          initial={{ opacity: 0, x: -95, y: 30, scale: 0.88, rotate: -6 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 36,
            damping: 18,
            mass: 1.1,
            delay: 0.28,
            opacity: { duration: 1.0, ease: 'easeOut', delay: 0.28 },
          }}
        >
          <motion.div
            animate={reduce ? undefined : { y: [0, -8, 0], rotate: [0, 1.2, 0] }}
            transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut', delay: 1.8 }}
          >
            <img
              src={foodUrl('hero_bowl.png')}
              alt="Nutriq Quinoa & Grilled Chicken Bowl"
              className="lp-food-img lp-food-hero-bowl"
              loading="eager"
            />
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div className="lp-ing lp-ing--avo" style={{ y: avoY }}>
        <motion.div
          initial={{ opacity: 0, x: 90, y: 35, scale: 0.86, rotate: 6 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: -16 }}
          transition={{
            type: 'spring',
            stiffness: 42,
            damping: 17,
            mass: 1.05,
            delay: 0.40,
            opacity: { duration: 0.95, ease: 'easeOut', delay: 0.40 },
          }}
        >
          <motion.div
            animate={reduce ? undefined : { y: [0, -10, 0], rotate: [-16, -13, -16] }}
            transition={{ duration: 6.8, repeat: Infinity, ease: 'easeInOut', delay: 2.1 }}
          >
            <img
              src={foodUrl('avocado_half.png')}
              alt="Fresh Ripe Hass Avocado"
              className="lp-food-img lp-food-hero-avo"
              loading="eager"
            />
          </motion.div>
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
    <motion.div
      style={{ left: '4%', top: 0, width: '82%' }}
      initial={{ opacity: 0, scale: 0.88, rotate: -10 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 1.2, ease: EASE, delay: T.trust }}
    >
      <img src={foodUrl('hero_bowl.png')} alt="" className="lp-food-img lp-food-hero-bowl" />
    </motion.div>
    <motion.div
      style={{ right: '-4%', bottom: '-4%', width: '44%' }}
      initial={{ opacity: 0, x: 30, scale: 0.85 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ ...SOFT_SPRING, delay: T.trust + 0.25 }}
    >
      <img src={foodUrl('avocado_half.png')} alt="" className="lp-food-img lp-food-hero-avo" style={{ transform: 'rotate(-18deg)' }} />
    </motion.div>
    <motion.div
      style={{ left: '-2%', bottom: '6%', width: '22%' }}
      initial={{ opacity: 0, x: -30, scale: 0.85 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ ...SOFT_SPRING, delay: T.trust + 0.38 }}
    >
      <img src={foodUrl('tomato_single.png')} alt="" className="lp-food-img lp-food-tom" />
    </motion.div>
  </motion.div>
);

const mealVariants = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0, transition: { ...SOFT_SPRING, stiffness: 60 } },
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
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: T.cards } } }}
          style={{ listStyle: 'none' }}
        >
          {MEALS.map((m, idx) => (
            <motion.li key={m.name} className={`lp-meal${m.featured ? ' is-featured' : ''}`}
              variants={mealVariants} whileHover={{ y: -6, transition: { duration: 0.35, ease: EASE } }}>
              <motion.div
                className="lp-meal-dish"
                initial={{ opacity: 0, scale: 0.82, y: 16, rotate: m.dishRotate ?? -5 }}
                animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 50,
                  damping: 16,
                  delay: T.cards + 0.08 + idx * 0.12,
                }}
              >
                <img src={m.img} alt={m.name} loading="lazy" />
              </motion.div>
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
