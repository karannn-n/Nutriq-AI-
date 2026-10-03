export const THEMES = [
  {
    id: 'mint',
    name: 'Mint Breeze',
    bg: '#F4F7F5',
    accent: '#10B981',
    preview: ['#F4F7F5', '#EAF4EE', '#10B981'],
  },
  {
    id: 'lavender',
    name: 'Lavender Dusk',
    bg: '#DDD6F3',
    accent: '#7C3AED',
    preview: ['#DDD6F3', '#A78BFA', '#7C3AED'],
  },
  {
    id: 'sunset',
    name: 'Sunset Peach',
    bg: '#FFE4CC',
    accent: '#EA580C',
    preview: ['#FFE4CC', '#FB923C', '#EA580C'],
  },
  {
    id: 'ocean',
    name: 'Ocean Deep',
    bg: '#C8E6F5',
    accent: '#0369A1',
    preview: ['#C8E6F5', '#38BDF8', '#0369A1'],
  },
  {
    id: 'rose',
    name: 'Rose Garden',
    bg: '#FCE4EC',
    accent: '#BE185D',
    preview: ['#FCE4EC', '#F472B6', '#BE185D'],
  },
  {
    id: 'dark',
    name: 'Midnight Dark',
    bg: '#0F172A',
    accent: '#6366F1',
    preview: ['#0F172A', '#1E293B', '#6366F1'],
  },
];

export const getSavedThemeId = () => {
  return localStorage.getItem('nutriq-theme') || 'mint';
};

export const applyTheme = (themeId) => {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const root = document.documentElement;

  if (theme.id === 'dark') {
    root.style.setProperty('--bg-color', theme.bg);
    root.style.setProperty('--bg-secondary', '#1E293B');
    root.style.setProperty('--text-main', '#F1F5F9');
    root.style.setProperty('--text-muted', '#94A3B8');
    root.style.setProperty('--accent-primary', theme.accent);
    root.style.setProperty('--glass-bg', 'rgba(30,41,59,0.7)');
    root.style.setProperty('--glass-border', 'rgba(99,102,241,0.2)');
  } else {
    root.style.setProperty('--bg-color', theme.bg);
    root.style.setProperty('--bg-secondary', theme.preview[1]);
    root.style.setProperty('--text-main', '#0F241D');
    root.style.setProperty('--text-muted', '#648275');
    root.style.setProperty('--accent-primary', theme.accent);
    root.style.setProperty('--glass-bg', 'rgba(255,255,255,0.95)');
    root.style.setProperty('--glass-border', '#E5EBE7');
  }

  // Persist to local storage
  localStorage.setItem('nutriq-theme', themeId);
  return theme;
};
