import { useSyncExternalStore } from 'react';
import { useReducedMotion, useScroll, useTransform } from 'framer-motion';

/* Shared motion language for the landing page — calm, organic, no overshoot. */
export const EASE = [0.22, 1, 0.36, 1];
export const SOFT_SPRING = { type: 'spring', stiffness: 70, damping: 20, mass: 1 };
export const VIEWPORT = { once: true, margin: '0px 0px -12% 0px' };

/* Hero entrance timeline (seconds) — the page "assembles" in this order. */
export const T = {
  backdrop: 0,
  ingredients: 0.15,
  food: 0.4,
  eyebrow: 0.7,
  heading: 0.8,
  desc: 1.1,
  cta: 1.3,
  trust: 1.45,
  cards: 1.55,
};

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

export const stagger = (staggerChildren = 0.1, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
});

/* Props for a single element that fades up when it scrolls into view. */
export const revealProps = (delay = 0, y = 24) => ({
  initial: { opacity: 0, y },
  whileInView: { opacity: 1, y: 0 },
  viewport: VIEWPORT,
  transition: { duration: 0.8, ease: EASE, delay },
});

/* Micro-interactions shared by buttons */
export const buttonHover = { y: -2, transition: { duration: 0.25, ease: EASE } };
export const buttonTap = { scale: 0.98 };

/* Scroll-linked drift for an element; flattened when the user prefers reduced motion. */
export const useParallax = (ref, distance = 40) => {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  return useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [distance, -distance]);
};

export const useMediaQuery = (query) =>
  useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
