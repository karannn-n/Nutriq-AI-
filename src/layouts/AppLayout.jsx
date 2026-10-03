import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Activity, LayoutDashboard, Utensils, ClipboardList, PieChart, Settings, 
  LogOut, Bell, Search, Sparkles, ChevronDown, Menu, X, Plus, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { SyncStatusBadge } from '../components/SyncStatusBadge';

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { name: 'Dashboard', path: '/app/dashboard', icon: <LayoutDashboard size={18} />, badge: 'Live', badgeType: 'pulse' },
    { name: 'Meal Log', path: '/app/meal-log', icon: <Utensils size={18} /> },
    { name: 'Meal History', path: '/app/meals', icon: <ClipboardList size={18} /> },
    { name: 'Insights', path: '/app/insights', icon: <PieChart size={18} />, badge: '1', badgeType: 'count' },
    { name: 'Settings', path: '/app/settings', icon: <Settings size={18} /> },
  ];

  const handleSignOut = async (e) => {
    e.preventDefault();
    await signOut();
    navigate('/login', { replace: true });
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'NQ';

  // Compute page title dynamically
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/app/dashboard')) return 'Dashboard';
    if (path.includes('/app/meal-log')) return 'Meal Log';
    if (path.includes('/app/meals') || path.includes('/app/history')) return 'Meal History';
    if (path.includes('/app/insights')) return 'Nutritional Insights';
    if (path.includes('/app/settings')) return 'Settings';
    return 'Dashboard';
  };

  // Shared sidebar content for desktop & mobile drawer
  const renderSidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '22px 18px', position: 'relative' }}>
      {/* Ambient Top Glow */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '220px', height: '180px',
        background: 'radial-gradient(circle at top left, rgba(52, 211, 153, 0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', position: 'relative', zIndex: 1 }}>
        <Link to="/app/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #34D399 0%, #059669 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(52, 211, 153, 0.35)',
            color: '#FFFFFF'
          }}>
            <Activity size={19} strokeWidth={2.6} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="heading-font" style={{ fontSize: '1.38rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              Nutriq
            </span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px',
              borderRadius: '6px', background: 'rgba(52, 211, 153, 0.15)',
              color: '#34D399', letterSpacing: '0.04em'
            }}>
              AI
            </span>
          </div>
        </Link>

        {/* Mobile close button */}
        {mobileMenuOpen && (
          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px',
              color: '#9CA3AF', width: '32px', height: '32px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Workspace Selector (Mirroring reference design) */}
      <div style={{
        background: '#12241D',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '13px',
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'rgba(52, 211, 153, 0.15)',
            color: '#34D399',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sparkles size={15} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#7E998E', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, lineHeight: 1 }}>
              Team Workspace
            </div>
            <div style={{ fontSize: '0.86rem', color: '#FFFFFF', fontWeight: 600, marginTop: '2px', lineHeight: 1.2 }}>
              Personal Bio-AI
            </div>
          </div>
        </div>
        <ChevronDown size={15} color="#7E998E" />
      </div>

      {/* Quick Search Trigger (Mirroring reference design ⌘K) */}
      <div style={{
        background: '#0F2019',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '11px',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        color: '#7E998E',
        fontSize: '0.82rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={14} color="#7E998E" />
          <span>Search for...</span>
        </div>
        <span style={{
          fontSize: '0.68rem', fontWeight: 600,
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#8CA79B',
          padding: '2px 6px',
          borderRadius: '5px'
        }}>
          ⌘K
        </span>
      </div>

      {/* Navigation Group */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }} className="sidebar-scroll">
        <div style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: '#557A6C',
          textTransform: 'uppercase',
          padding: '0 8px',
          marginBottom: '8px'
        }}>
          Navigation
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  background: isActive ? '#173326' : 'transparent',
                  border: isActive ? '1px solid rgba(52, 211, 153, 0.22)' : '1px solid transparent',
                  color: isActive ? '#FFFFFF' : '#8CA79B',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.88rem',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
                  transition: 'all 0.18s ease'
                }}
                onMouseOver={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#11231B';
                    e.currentTarget.style.color = '#FFFFFF';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#8CA79B';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <span style={{ color: isActive ? '#34D399' : 'inherit', display: 'flex', alignItems: 'center' }}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </div>

                {/* Badge indicator if any */}
                {item.badge && (
                  item.badgeType === 'pulse' ? (
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '999px',
                      background: 'rgba(52, 211, 153, 0.15)',
                      color: '#34D399',
                      border: '1px solid rgba(52, 211, 153, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34D399' }} />
                      {item.badge}
                    </span>
                  ) : (
                    <span style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#10B981',
                      color: '#0A1612',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {item.badge}
                    </span>
                  )
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Account / Profile Area at Bottom (Mirroring reference design) */}
      <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: '#557A6C',
          textTransform: 'uppercase',
          padding: '0 8px',
          marginBottom: '10px'
        }}>
          User Account
        </div>

        <div style={{
          background: '#12241D',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '13px',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            {/* User Avatar with pulsing status indicator */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
                color: '#FFFFFF', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 700, fontSize: '0.84rem'
              }}>
                {initials}
              </div>
              <span style={{
                position: 'absolute', bottom: 0, right: 0,
                width: '9px', height: '9px', borderRadius: '50%',
                background: '#34D399', border: '2px solid #12241D'
              }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: '0.86rem', fontWeight: 600, color: '#FFFFFF',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                {displayName}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#7E998E' }}>
                #pro-member
              </div>
            </div>
          </div>

          {/* Sign Out trigger */}
          <button
            onClick={handleSignOut}
            title="Sign Out"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: '#7E998E',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.18s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#EF4444';
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '#7E998E';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--saas-bg, #F4F7F5)' }}>
      {/* Desktop Fixed Sidebar */}
      <aside style={{
        width: '270px',
        flexShrink: 0,
        background: 'var(--saas-sidebar-bg, #0A1612)',
        borderRight: '1px solid var(--saas-sidebar-border, rgba(255, 255, 255, 0.07))',
        display: 'none', // Shown on desktop via media query or inline below
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 40
      }} className="hidden-on-mobile desktop-sidebar">
        {renderSidebarContent()}
      </aside>

      {/* Inline styles for responsive layout helper */}
      <style>{`
        @media (min-width: 1024px) {
          .desktop-sidebar {
            display: flex !important;
          }
          .mobile-menu-trigger {
            display: none !important;
          }
        }
        @media (max-width: 1023px) {
          .desktop-sidebar {
            display: none !important;
          }
          .mobile-menu-trigger {
            display: flex !important;
          }
        }
      `}</style>

      {/* Mobile Drawer (Framer Motion) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(4px)', zIndex: 60
              }}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              style={{
                position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px',
                background: '#0A1612', zIndex: 70, borderRight: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              {renderSidebarContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        {/* Top Header Bar */}
        <header style={{
          height: '70px',
          background: '#FFFFFF',
          borderBottom: '1px solid var(--saas-border, #E5EBE7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 clamp(16px, 3vw, 36px)',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          {/* Left Title & Mobile Hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="mobile-menu-trigger"
              style={{
                background: '#F4F7F5',
                border: '1px solid #E5EBE7',
                borderRadius: '10px',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0F241D',
                cursor: 'pointer'
              }}
            >
              <Menu size={20} />
            </button>

            <div>
              <h1 className="heading-font" style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--saas-text-heading, #0F241D)',
                lineHeight: 1.1,
                margin: 0
              }}>
                {getPageTitle()}
              </h1>
            </div>
          </div>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <SyncStatusBadge />

            {/* Notification Bell Button (from reference design) */}
            <button
              title="Notifications"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1px solid var(--saas-border, #E5EBE7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4B6B5D',
                cursor: 'pointer',
                position: 'relative',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.18s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#34D399';
                e.currentTarget.style.color = '#0F241D';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--saas-border, #E5EBE7)';
                e.currentTarget.style.color = '#4B6B5D';
              }}
            >
              <Bell size={18} />
              <span style={{
                position: 'absolute', top: '9px', right: '10px',
                width: '7px', height: '7px',
                borderRadius: '50%', background: '#10B981',
                boxShadow: '0 0 6px #10B981'
              }} />
            </button>

            {/* Signature Dark Pill Action Button (Matches "Add Custom Widget" in reference!) */}
            <Link
              to="/app/meal-log"
              className="saas-pill-btn"
              style={{ padding: '8px 18px', fontSize: '0.86rem' }}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Log Meal</span>
            </Link>

            {/* User Avatar Indicator */}
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.84rem',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
              border: '2px solid #FFFFFF'
            }}>
              {initials}
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main style={{
          flex: 1,
          padding: 'clamp(18px, 2.5vw, 32px)',
          overflowY: 'auto'
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

