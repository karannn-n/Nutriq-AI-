import React, { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Problem from '../components/Problem';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Intelligence from '../components/Intelligence';
import Stats from '../components/Stats';
import CTA from '../components/CTA';
import Footer from '../components/Footer';
import '../components/landing/landing.css';

const LANDING_BG = '#FBF8F3';

const LandingPage = () => {
  // Match the body to the landing canvas (avoids theme gradients on overscroll), restore on unmount
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = LANDING_BG;
    document.body.style.backgroundImage = 'none';
    return () => {
      document.body.style.background = prev;
      document.body.style.backgroundImage = '';
    };
  }, []);

  return (
    // reducedMotion="user": transform animations are skipped for visitors who prefer reduced motion
    <MotionConfig reducedMotion="user">
      <div className="lp">
        <Navbar />
        <main>
          <Hero />
          <Features />
          <Intelligence />
          <Problem />
          <Stats />
          <HowItWorks />
          <CTA />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
};

export default LandingPage;
