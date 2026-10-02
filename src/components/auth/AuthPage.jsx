import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  Leaf,
  BarChart3,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './auth.css';

const BASE = import.meta.env.BASE_URL || '/';
const foodUrl = (file) => `${BASE.endsWith('/') ? BASE : BASE + '/'}food/${file}`;

const EASE = [0.22, 1, 0.36, 1];

const GoogleIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
    />
  </svg>
);

const AuthPage = ({ initialMode = 'register' }) => {
  const [mode, setMode] = useState(initialMode); // 'register' | 'login'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { signIn, signUp, signInWithGoogle, resetPassword, user, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();

  const from = location.state?.from?.pathname || '/app/dashboard';

  // Keep state in sync with URL
  useEffect(() => {
    setMode(initialMode);
    setErrorMessage('');
    setSuccessMessage('');
  }, [initialMode]);

  // If already authenticated, redirect
  useEffect(() => {
    if (user) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const switchMode = (newMode) => {
    setMode(newMode);
    setResetMode(false);
    setErrorMessage('');
    setSuccessMessage('');
    if (newMode === 'login') {
      navigate('/login', { replace: true });
    } else {
      navigate('/register', { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setSubmitting(true);

    try {
      if (resetMode) {
        if (!email) {
          setErrorMessage('Please enter your email address.');
          setSubmitting(false);
          return;
        }
        await resetPassword(email);
        setSuccessMessage('Password reset link sent! Please check your inbox.');
        setSubmitting(false);
        return;
      }

      if (mode === 'register') {
        if (password.length < 6) {
          setErrorMessage('Password must be at least 6 characters long.');
          setSubmitting(false);
          return;
        }
        const data = await signUp({ email, password, fullName: name });
        if (data?.user && !data?.session) {
          setSuccessMessage('Registration successful! Please check your email to confirm your account before logging in.');
        } else {
          navigate(from, { replace: true });
        }
      } else {
        await signIn({ email, password });
        navigate(from, { replace: true });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMessage(err.message || 'Google sign-in failed. Please try again.');
      setGoogleSubmitting(false);
    }
  };

  const formFieldsVariant = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
  };

  return (
    <div className="nutriq-auth-page">
      {/* Soft background ambient glows */}
      <div className="auth-ambient-glow auth-glow-1" aria-hidden="true" />
      <div className="auth-ambient-glow auth-glow-2" aria-hidden="true" />

      {/* Top Bar */}
      <header className="auth-topbar">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
        >
          <Link to="/" className="auth-back-link">
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>
        </motion.div>

        <div className="auth-topbar-brand-mobile">
          <Link to="/" className="auth-brand-mobile-link">
            <span className="auth-logo-badge auth-logo-badge--sm">
              <Activity size={17} />
            </span>
            <span className="auth-logo-wordmark auth-logo-wordmark--sm">Nutriq</span>
          </Link>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="auth-main-container">
        {/* ── Left Side: Brand & Visuals ────────────────────────────── */}
        <section className="auth-brand-section" aria-label="Nutriq benefits">
          {/* Nutriq Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.12 }}
          >
            <Link to="/" className="auth-brand-header">
              <span className="auth-logo-badge">
                <Activity size={22} />
              </span>
              <span className="auth-logo-wordmark">Nutriq</span>
            </Link>
          </motion.div>

          {/* Eyebrow */}
          <motion.span
            className="auth-eyebrow"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
          >
            AI-POWERED NUTRITION INTELLIGENCE
          </motion.span>

          {/* Headline */}
          <motion.h1
            className="auth-title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.26 }}
          >
            Better Food Choices for a <em>Healthier You</em>
          </motion.h1>

          {/* Description */}
          <motion.p
            className="auth-lead"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: EASE, delay: 0.32 }}
          >
            Track your meals, analyze nutrients, predict deficiencies and get
            personalized recommendations — all in one place.
          </motion.p>

          {/* Feature Chips */}
          <motion.div
            className="auth-feature-chips"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.38 }}
          >
            <div className="auth-chip">
              <span className="auth-chip-icon">
                <Leaf size={16} />
              </span>
              <span className="auth-chip-text">Personalized Nutrition Insights</span>
            </div>
            <div className="auth-chip">
              <span className="auth-chip-icon">
                <BarChart3 size={16} />
              </span>
              <span className="auth-chip-text">Track Vitamins &amp; Minerals</span>
            </div>
            <div className="auth-chip">
              <span className="auth-chip-icon">
                <ShieldCheck size={16} />
              </span>
              <span className="auth-chip-text">Secure &amp; Private</span>
            </div>
          </motion.div>

          {/* Food Photography Floating Vignette Composition */}
          <div className="auth-food-stage" aria-hidden="true">
            {/* Main Healthy Bowl */}
            <motion.div
              className="auth-food-el auth-food--main"
              initial={{ opacity: 0, x: 50, y: 20, scale: 0.88, rotate: -4 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 38,
                damping: 18,
                mass: 1.05,
                delay: 0.28,
                opacity: { duration: 0.9, ease: 'easeOut', delay: 0.28 },
              }}
            >
              <motion.div
                animate={reduce ? undefined : { y: [0, -7, 0], rotate: [0, 1.2, 0] }}
                transition={{ duration: 7.2, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }}
              >
                <img
                  src={foodUrl('hero_bowl.png')}
                  alt="Nutriq Mediterranean grain and chicken bowl"
                />
              </motion.div>
            </motion.div>

            {/* Avocado Half (Bottom Left) */}
            <motion.div
              className="auth-food-el auth-food--avocado"
              initial={{ opacity: 0, x: -60, y: 40, scale: 0.86, rotate: -15 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 12 }}
              transition={{
                type: 'spring',
                stiffness: 42,
                damping: 17,
                delay: 0.40,
                opacity: { duration: 0.9, delay: 0.40 },
              }}
            >
              <motion.div
                animate={reduce ? undefined : { y: [0, -8, 0], rotate: [12, 10, 12] }}
                transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 1.9 }}
              >
                <img src={foodUrl('avocado_half.png')} alt="" />
              </motion.div>
            </motion.div>

            {/* Toasted Seeds Dish */}
            <motion.div
              className="auth-food-el auth-food--seeds"
              initial={{ opacity: 0, x: -45, y: -20, scale: 0.86, rotate: 15 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: -5 }}
              transition={{
                type: 'spring',
                stiffness: 40,
                damping: 16,
                delay: 0.46,
              }}
            >
              <img src={foodUrl('seeds_dish.png')} alt="" />
            </motion.div>

            {/* Tomato A (Bottom) */}
            <motion.div
              className="auth-food-el auth-food--tomA"
              initial={{ opacity: 0, x: -35, y: 25, scale: 0.82 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 48,
                damping: 16,
                delay: 0.50,
              }}
            >
              <img src={foodUrl('tomato_single.png')} alt="" />
            </motion.div>

            {/* Tomato B (Top) */}
            <motion.div
              className="auth-food-el auth-food--tomB"
              initial={{ opacity: 0, y: -30, scale: 0.82 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 50,
                damping: 16,
                delay: 0.36,
              }}
            >
              <img src={foodUrl('tomato_single.png')} alt="" />
            </motion.div>

            {/* Basil Leaf A (Upper Left) */}
            <motion.div
              className="auth-food-el auth-food--leafA"
              initial={{ opacity: 0, x: -40, y: -20, scale: 0.85, rotate: -35 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: -18 }}
              transition={{
                type: 'spring',
                stiffness: 50,
                damping: 17,
                delay: 0.26,
              }}
            >
              <img src={foodUrl('basil_leaf.png')} alt="" />
            </motion.div>

            {/* Basil Leaf B (Bottom) */}
            <motion.div
              className="auth-food-el auth-food--leafB"
              initial={{ opacity: 0, x: 30, y: 25, scale: 0.85, rotate: 20 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 42 }}
              transition={{
                type: 'spring',
                stiffness: 46,
                damping: 16,
                delay: 0.54,
              }}
            >
              <img src={foodUrl('basil_leaf.png')} alt="" />
            </motion.div>

            {/* Peppercorns Cluster */}
            <motion.div
              className="auth-food-el auth-food--pep"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.60 }}
            >
              <img src={foodUrl('peppercorns.png')} alt="" />
            </motion.div>

            {/* Handwritten Note Accent */}
            <motion.div
              className="auth-handwritten-note"
              initial={{ opacity: 0, scale: 0.9, rotate: -12 }}
              animate={{ opacity: 1, scale: 1, rotate: -7 }}
              transition={{ duration: 1.0, ease: 'easeOut', delay: 0.65 }}
            >
              <span>Good Food</span>
              <span>Brighter Days</span>
              <div className="auth-handwritten-flourish" />
            </motion.div>
          </div>
        </section>

        {/* ── Right Side: Polished Authentication Card ──────────────── */}
        <motion.div
          className="auth-card-wrapper"
          initial={{ opacity: 0, y: 35, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.85, ease: EASE, delay: 0.22 }}
        >
          <div className="auth-card">
            {/* Tab Pill Switcher (Create account / Sign in) */}
            <div className="auth-pill-nav" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register' && !resetMode}
                className={`auth-pill-btn ${mode === 'register' && !resetMode ? 'is-active' : ''}`}
                onClick={() => switchMode('register')}
              >
                {mode === 'register' && !resetMode && (
                  <motion.div
                    className="auth-pill-indicator"
                    layoutId="authTabIndicator"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span style={{ position: 'relative', zIndex: 3 }}>Create account</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login' && !resetMode}
                className={`auth-pill-btn ${mode === 'login' && !resetMode ? 'is-active' : ''}`}
                onClick={() => switchMode('login')}
              >
                {mode === 'login' && !resetMode && (
                  <motion.div
                    className="auth-pill-indicator"
                    layoutId="authTabIndicator"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span style={{ position: 'relative', zIndex: 3 }}>Sign in</span>
              </button>
            </div>

            {/* Heading */}
            <div className="auth-card-head">
              <AnimatePresence mode="wait">
                <motion.div
                  key={resetMode ? 'reset' : mode}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="auth-card-title">
                    {resetMode
                      ? 'Reset password'
                      : mode === 'register'
                      ? 'Create your account'
                      : 'Welcome back'}
                  </h2>
                  <p className="auth-card-subtitle">
                    {resetMode
                      ? "Enter your email to receive recovery instructions."
                      : mode === 'register'
                      ? 'Start your nutrition journey today.'
                      : 'Continue your nutrition journey.'}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Supabase Notice if in setup mode */}
            {!isSupabaseConfigured && (
              <div className="auth-alert auth-alert-info">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Supabase is in setup mode. Add your credentials to <code>.env</code> to connect to live authentication.
                </span>
              </div>
            )}

            {/* Error Message Alert */}
            {errorMessage && (
              <motion.div
                className="auth-alert auth-alert-error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {/* Success Message Alert */}
            {successMessage && (
              <motion.div
                className="auth-alert auth-alert-success"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <CheckCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{successMessage}</span>
              </motion.div>
            )}

            {/* Google Sign-in placed at the TOP (as requested in spec) */}
            {!resetMode && (
              <div className="auth-google-wrapper">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleSubmitting || submitting}
                  className="auth-btn-google"
                >
                  {googleSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      >
                        <Loader2 size={18} />
                      </motion.div>
                      <span>Connecting Google...</span>
                    </>
                  ) : (
                    <>
                      <GoogleIcon />
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                <div className="auth-divider">
                  <div className="auth-divider-line" />
                  <span className="auth-divider-text">or continue with email</span>
                  <div className="auth-divider-line" />
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form">
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  show: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
                }}
                className="auth-form-fields"
              >
                {/* Full Name (Sign Up only) */}
                <AnimatePresence>
                  {mode === 'register' && !resetMode && (
                    <motion.div
                      key="nameField"
                      variants={formFieldsVariant}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="auth-field"
                    >
                      <label htmlFor="auth-name" className="auth-label">
                        Full Name
                      </label>
                      <div className="auth-input-box">
                        <span className="auth-input-icon">
                          <User size={19} />
                        </span>
                        <input
                          id="auth-name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Alex Chen"
                          required
                          disabled={submitting}
                          className="auth-input"
                          autoComplete="name"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email Field */}
                <motion.div variants={formFieldsVariant} className="auth-field">
                  <label htmlFor="auth-email" className="auth-label">
                    Email
                  </label>
                  <div className="auth-input-box">
                    <span className="auth-input-icon">
                      <Mail size={19} />
                    </span>
                    <input
                      id="auth-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      disabled={submitting}
                      className="auth-input"
                      autoComplete="email"
                    />
                  </div>
                </motion.div>

                {/* Password Field (Hidden in reset mode) */}
                {!resetMode && (
                  <motion.div variants={formFieldsVariant} className="auth-field">
                    <div className="auth-label-row">
                      <label htmlFor="auth-password" className="auth-label">
                        Password
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          className="auth-forgot-link"
                          onClick={() => {
                            setResetMode(true);
                            setErrorMessage('');
                            setSuccessMessage('');
                          }}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="auth-input-box">
                      <span className="auth-input-icon">
                        <Lock size={19} />
                      </span>
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          mode === 'register'
                            ? 'Create a strong password (min 6 chars)'
                            : 'Enter your password'
                        }
                        required
                        minLength={6}
                        disabled={submitting}
                        className="auth-input"
                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="auth-password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Submit CTA */}
                <motion.div variants={formFieldsVariant}>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="auth-btn-primary"
                  >
                    {submitting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        >
                          <Loader2 size={19} />
                        </motion.div>
                        <span>
                          {resetMode
                            ? 'Sending Link...'
                            : mode === 'register'
                            ? 'Creating Account...'
                            : 'Signing In...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          {resetMode
                            ? 'Send Recovery Link'
                            : mode === 'register'
                            ? 'Create Account'
                            : 'Sign In'}
                        </span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </motion.div>

                {/* Reset Mode Cancel Link */}
                {resetMode && (
                  <motion.div variants={formFieldsVariant} style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="auth-switch-btn"
                      onClick={() => setResetMode(false)}
                      style={{ fontSize: '0.85rem' }}
                    >
                      ← Back to sign in
                    </button>
                  </motion.div>
                )}

                {/* Switch Prompt (Already have an account? / Don't have an account?) */}
                {!resetMode && (
                  <motion.div variants={formFieldsVariant} className="auth-switch-prompt">
                    {mode === 'register' ? (
                      <>
                        Already have an account?
                        <button
                          type="button"
                          className="auth-switch-btn"
                          onClick={() => switchMode('login')}
                        >
                          Sign in
                        </button>
                      </>
                    ) : (
                      <>
                        Don't have an account?
                        <button
                          type="button"
                          className="auth-switch-btn"
                          onClick={() => switchMode('register')}
                        >
                          Create one
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </motion.div>
            </form>

            {/* Security Trust Badge */}
            <motion.div
              className="auth-card-trust"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75, duration: 0.8 }}
            >
              <ShieldCheck className="auth-trust-icon" />
              <div className="auth-trust-text">
                <strong>Your data is secure and never shared.</strong>
                We use industry-standard encryption to keep your health and nutritional information safe.
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AuthPage;
