import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Problem from '../components/Problem';
import Solution from '../components/Solution';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Intelligence from '../components/Intelligence';
import CTA from '../components/CTA';
import Footer from '../components/Footer';

const LandingPage = () => {
  // Switch body to dark while on landing page, restore on unmount
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = '#080a12';
    document.body.style.backgroundImage = 'none';
    return () => {
      document.body.style.background = prev;
      document.body.style.backgroundImage = '';
    };
  }, []);

  return (
    <div style={{ background: '#080a12', color: '#fff', minHeight: '100vh' }}>
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Features />
        <HowItWorks />
        <Intelligence />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
