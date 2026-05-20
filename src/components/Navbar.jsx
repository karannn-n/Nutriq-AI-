import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Menu, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How it Works', href: '#how-it-works' },
    { label: 'Intelligence', href: '#intelligence' },
  ];

  return (
    <>
      <style>{`
        .nav-link {
          color: rgba(255,255,255,0.55);
          text-decoration: none;
          font-size: 0.92rem;
          font-weight: 500;
          letter-spacing: 0.01em;
          transition: color 0.2s;
        }
        .nav-link:hover { color: #fff; }
        .nb-desktop { display: none; }
        .nb-mobile-btn { display: flex; }
        @media(min-width: 768px) {
          .nb-desktop { display: flex !important; }
          .nb-mobile-btn { display: none !important; }
        }
      `}</style>

      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          padding: '18px 0',
          background: scrolled ? 'rgba(8,10,18,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
          transition: 'background 0.3s, border-color 0.3s',
        }}
      >
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '11px',
              background: 'linear-gradient(135deg, #34d399, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(52,211,153,0.35)',
            }}>
              <Activity color="white" size={22} />
            </div>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.45rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
              Nutriq
            </span>
          </Link>

          {/* Desktop links */}
          <div className="nb-desktop" style={{ gap: '36px', alignItems: 'center' }}>
            {navLinks.map(l => <a key={l.label} href={l.href} className="nav-link">{l.label}</a>)}
          </div>

          {/* Desktop CTAs */}
          <div className="nb-desktop" style={{ gap: '12px', alignItems: 'center' }}>
            <Link to="/login" style={{
              color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.9rem',
              fontWeight: 500, padding: '9px 20px', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.12)', transition: 'all 0.2s',
              background: 'rgba(255,255,255,0.04)',
            }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
            >Log In</Link>
            <Link to="/register" style={{
              textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600,
              padding: '9px 22px', borderRadius: '10px', color: '#fff',
              background: 'linear-gradient(135deg, #34d399, #059669)',
              boxShadow: '0 0 18px rgba(52,211,153,0.3)',
              display: 'flex', alignItems: 'center', gap: '6px', transition: 'opacity 0.2s',
            }}
              onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
              onMouseOut={e => e.currentTarget.style.opacity = '1'}
            >
              Get Started <ArrowRight size={15} />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="nb-mobile-btn"
            onClick={() => setMobileMenuOpen(o => !o)}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: '#fff', alignItems: 'center', justifyContent: 'center' }}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                position: 'absolute', top: '100%', left: '16px', right: '16px', marginTop: '8px',
                background: 'rgba(14,17,28,0.97)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px',
                padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
              }}
            >
              {navLinks.map(l => (
                <a key={l.label} href={l.href} className="nav-link"
                  style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)' }}
                  onClick={() => setMobileMenuOpen(false)}>{l.label}</a>
              ))}
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} style={{
                textDecoration: 'none', textAlign: 'center', padding: '13px',
                borderRadius: '12px', color: '#fff', fontWeight: 600,
                background: 'linear-gradient(135deg, #34d399, #059669)',
              }}>Get Started</Link>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} style={{
                textDecoration: 'none', textAlign: 'center', padding: '12px',
                borderRadius: '12px', color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>Log In</Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
};

export default Navbar;
