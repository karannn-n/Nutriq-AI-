import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Activity, LayoutDashboard, Utensils, PieChart, Settings, LogOut, Bell } from 'lucide-react';

const AppLayout = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/app/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Meal Log', path: '/app/meal-log', icon: <Utensils size={20} /> },
    { name: 'Insights', path: '/app/insights', icon: <PieChart size={20} /> },
    { name: 'Settings', path: '/app/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)' }}>
      {/* Sidebar */}
      <aside style={{ 
        width: '260px', 
        borderRight: '1px solid var(--glass-border)',
        background: 'rgba(255,255,255,0.50)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
        padding: '24px 0'
      }}>
        <div style={{ padding: '0 24px', marginBottom: '40px' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity color="var(--accent-primary)" size={28} />
            <span className="heading-font" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>Nutriq</span>
          </Link>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px', flex: 1 }}>
          {navItems.map((item) => {
            const isActive = location.pathname.includes(item.path);
            return (
              <Link key={item.name} to={item.path} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', borderRadius: '12px',
                textDecoration: 'none',
                background: isActive ? 'rgba(42,140,110,0.15)' : 'transparent',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { if(!isActive) e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.background = isActive ? 'rgba(42,140,110,0.15)' : 'rgba(42,140,110,0.08)'; }}
              onMouseOut={(e) => { if(!isActive) e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = isActive ? 'rgba(42,140,110,0.15)' : 'transparent'; }}
              >
                {item.icon}
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '0 16px' }}>
          <Link to="/" style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px', borderRadius: '12px',
            textDecoration: 'none', color: '#ef4444', fontWeight: 500
          }}>
            <LogOut size={20} />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div className="ambient-glow" style={{ top: '0%', right: '0%', background: 'var(--accent-primary)', width: '400px', height: '400px', opacity: 0.05 }}></div>
        
        {/* Top Header */}
        <header style={{ 
          height: '70px', borderBottom: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', position: 'relative' }}>
              <Bell size={20} />
              <span style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', background: 'var(--accent-tertiary)', borderRadius: '50%' }}></span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Alex Chen</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pro Plan</div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                AC
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
