import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Menu, X, ArrowRight, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MotionLink from './landing/MotionLink';
import { EASE, buttonHover, buttonTap } from './landing/motion';

const navLinks = [
  { label: 'Home', href: '#top', id: 'top' },
  { label: 'Features', href: '#features', id: 'features' },
  { label: 'Intelligence', href: '#intelligence', id: 'intelligence' },
  { label: 'Why Nutriq', href: '#problem', id: 'problem' },
  { label: 'How It Works', href: '#how-it-works', id: 'how-it-works' },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [active, setActive] = useState('top');
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll-spy: highlight the section currently crossing the upper third of the viewport
  useEffect(() => {
    const sections = navLinks.map(l => document.getElementById(l.id)).filter(Boolean);
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-35% 0px -60% 0px' },
    );
    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <motion.nav
      className={`lp-nav${scrolled || mobileMenuOpen ? ' is-scrolled' : ''}`}
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
      aria-label="Primary"
    >
      <div className="lp-nav-inner">
        <Link to="/" className="lp-logo" aria-label="Nutriq home">
          <span className="lp-logo-mark"><Activity color="white" size={20} /></span>
          <span className="lp-logo-word">Nutriq</span>
        </Link>

        <ul className="lp-nav-links">
          {navLinks.map(l => (
            <li key={l.id}>
              <a href={l.href} className={`lp-nav-link${active === l.id ? ' is-active' : ''}`}
                aria-current={active === l.id ? 'true' : undefined}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="lp-nav-actions">
          {user ? (
            <MotionLink to="/app/dashboard" className="lp-btn lp-btn-sm lp-btn-primary" whileHover={buttonHover} whileTap={buttonTap}>
              <LayoutDashboard size={16} /> Open Dashboard
            </MotionLink>
          ) : (
            <>
              <Link to="/login" className="lp-nav-login">Log In</Link>
              <MotionLink to="/register" className="lp-btn lp-btn-sm lp-btn-primary" whileHover={buttonHover} whileTap={buttonTap}>
                Get Started <ArrowRight size={15} className="lp-btn-arrow" />
              </MotionLink>
            </>
          )}
        </div>

        <button
          className="lp-nav-toggle"
          onClick={() => setMobileMenuOpen(o => !o)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="lp-mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {navLinks.map(l => (
              <a key={l.id} href={l.href} className="lp-mobile-link" onClick={() => setMobileMenuOpen(false)}>{l.label}</a>
            ))}
            <hr />
            {user ? (
              <Link to="/app/dashboard" className="lp-btn lp-btn-primary" onClick={() => setMobileMenuOpen(false)}>
                <LayoutDashboard size={16} /> Open Dashboard
              </Link>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                <Link to="/register" className="lp-btn lp-btn-primary" onClick={() => setMobileMenuOpen(false)}>
                  Get Started <ArrowRight size={16} />
                </Link>
                <Link to="/login" className="lp-btn lp-btn-ghost" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
