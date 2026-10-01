import React from 'react';
import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const columns = [
  { title: 'Product', links: ['Features', 'How It Works', 'Intelligence', 'Pricing'] },
  { title: 'Company', links: ['About Us', 'Careers', 'Blog', 'Contact'] },
  { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] },
];

const Footer = () => (
  <footer className="lp-footer">
    <div className="lp-container">
      <div className="lp-footer-top">
        <div className="lp-footer-brand">
          <Link to="/" className="lp-logo" aria-label="Nutriq home">
            <span className="lp-logo-mark"><Activity color="white" size={20} /></span>
            <span className="lp-logo-word">Nutriq</span>
          </Link>
          <p>AI-powered nutrition tracking and deficiency prediction. Redefining how humans fuel their bodies.</p>
        </div>

        <div className="lp-footer-cols">
          {columns.map(col => (
            <div key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map(l => <li key={l}><a href="#">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-footer-bottom">
        <p>© 2026 Nutriq Inc. All rights reserved.</p>
        <span className="lp-status"><i />All systems operational</span>
      </div>
    </div>
  </footer>
);

export default Footer;
