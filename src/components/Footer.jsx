import React from 'react';
import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer style={{ background: '#080a12', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '64px 0 32px' }}>
    <div className="container">
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '48px', marginBottom: '60px' }}>

        {/* Brand */}
        <div style={{ flex: '1 1 280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #34d399, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(52,211,153,0.3)' }}>
              <Activity color="white" size={19} />
            </div>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>Nutriq</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, maxWidth: '270px', fontSize: '0.88rem' }}>
            AI-powered nutrition tracking and deficiency prediction. Redefining how humans fuel their bodies.
          </p>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap' }}>
          {[
            { title: 'Product', links: ['Features', 'How It Works', 'Intelligence', 'Pricing'] },
            { title: 'Company', links: ['About Us', 'Careers', 'Blog', 'Contact'] },
            { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] },
          ].map(col => (
            <div key={col.title}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '18px' }}>{col.title}</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {col.links.map(l => (
                  <li key={l}>
                    <a href="#" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: '0.88rem', transition: 'color 0.2s' }}
                      onMouseOver={e => e.target.style.color = '#fff'}
                      onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.35)'}
                    >{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.82rem' }}>© 2026 Nutriq Inc. All rights reserved.</p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>All systems operational</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
