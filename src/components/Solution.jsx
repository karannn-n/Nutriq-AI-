import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const Solution = () => {
  return (
    <section>
      <div className="ambient-glow" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--accent-primary)', width: '800px', height: '400px' }}></div>
      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="glass-panel"
          style={{
            padding: '60px 40px',
            textAlign: 'center',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', marginBottom: '24px' }}>
            <Sparkles color="var(--accent-primary)" size={32} />
          </div>
          <h2 className="heading-font" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '24px' }}>
            Enter <span className="text-gradient">Intelligence</span>
          </h2>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '700px', margin: '0 auto', lineHeight: 1.6 }}>
            Nutriq takes the guesswork out of eating. Our AI analyzes your meals, detects potential nutritional gaps before they become symptoms, and guides you toward optimal balance.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Solution;
