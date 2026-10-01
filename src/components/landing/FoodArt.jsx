import React, { useId, useMemo } from 'react';

/*
 * Hand-built SVG food illustrations for the landing page.
 * Vector art keeps the page fast (no image requests, no layout shift) and fully on-brand.
 */

const useSvgId = () => useId().replace(/[^a-zA-Z0-9_-]/g, '');

/* Small deterministic PRNG so every bowl renders identically on each load. */
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const Tomato = ({ size = 48, style, className }) => {
  const id = useSvgId();
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={style} className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}b`} cx="36%" cy="36%" r="72%">
          <stop offset="0" stopColor="#FF9A7A" />
          <stop offset="0.45" stopColor="#E8432E" />
          <stop offset="1" stopColor="#9E1B12" />
        </radialGradient>
      </defs>
      <ellipse cx="54" cy="93" rx="30" ry="4.5" fill="rgba(70,45,20,0.16)" />
      <circle cx="50" cy="54" r="38" fill={`url(#${id}b)`} />
      <ellipse cx="35" cy="38" rx="11" ry="6" fill="#fff" opacity="0.38" transform="rotate(-35 35 38)" />
      <ellipse cx="30" cy="48" rx="3" ry="2" fill="#fff" opacity="0.5" />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="50" cy="11" rx="3.6" ry="9.5" fill="#3E7A2C" transform={`rotate(${a + 18} 50 20)`} />
      ))}
      <circle cx="50" cy="20" r="4" fill="#2F6320" />
    </svg>
  );
};

export const BasilLeaf = ({ size = 56, rotate = 0, tone = 'fresh', style, className }) => {
  const id = useSvgId();
  const [c1, c2] = tone === 'deep' ? ['#5FA046', '#245C27'] : ['#8CCB63', '#2F7D32'];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}
      style={{ transform: `rotate(${rotate}deg)`, ...style }} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <path d="M50 97 C 16 80, 8 38, 50 3 C 92 38, 84 80, 50 97 Z" fill={`url(#${id}l)`} />
      <path d="M50 97 C 22 78, 18 40, 50 3 C 38 40, 40 76, 50 97 Z" fill="#fff" opacity="0.1" />
      <path d="M50 95 L50 10" stroke="#1B4F1F" strokeOpacity="0.4" strokeWidth="1.6" strokeLinecap="round" />
      <g stroke="#1B4F1F" strokeOpacity="0.25" strokeWidth="1.1" fill="none" strokeLinecap="round">
        <path d="M50 76 Q38 70 27 62" /><path d="M50 76 Q62 70 73 62" />
        <path d="M50 56 Q39 49 30 40" /><path d="M50 56 Q61 49 70 40" />
        <path d="M50 36 Q43 30 38 23" /><path d="M50 36 Q57 30 62 23" />
      </g>
    </svg>
  );
};

/* Three leaves on a stem — the large garnish at the top-right of the hero. */
export const BasilSprig = ({ size = 150, style, className }) => (
  <svg viewBox="0 0 200 200" width={size} height={size} style={style} className={className} aria-hidden="true">
    <path d="M30 190 C 70 150, 100 120, 120 70" stroke="#3B6E2A" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <g transform="translate(86 6) rotate(20 50 50) scale(0.95)"><LeafPaths tone="fresh" /></g>
    <g transform="translate(18 64) rotate(-55 50 50) scale(0.8)"><LeafPaths tone="deep" /></g>
    <g transform="translate(98 92) rotate(75 50 50) scale(0.72)"><LeafPaths tone="fresh" /></g>
  </svg>
);

const LeafPaths = ({ tone }) => {
  const id = useSvgId();
  const [c1, c2] = tone === 'deep' ? ['#5FA046', '#245C27'] : ['#8CCB63', '#2F7D32'];
  return (
    <>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <path d="M50 97 C 16 80, 8 38, 50 3 C 92 38, 84 80, 50 97 Z" fill={`url(#${id}s)`} />
      <path d="M50 97 C 22 78, 18 40, 50 3 C 38 40, 40 76, 50 97 Z" fill="#fff" opacity="0.1" />
      <path d="M50 95 L50 10" stroke="#1B4F1F" strokeOpacity="0.4" strokeWidth="1.6" />
    </>
  );
};

export const AvocadoHalf = ({ size = 220, style, className }) => {
  const id = useSvgId();
  const shape = 'M100 14 C 140 14, 156 60, 168 108 C 181 160, 146 192, 100 192 C 54 192, 19 160, 32 108 C 44 60, 60 14, 100 14 Z';
  return (
    <svg viewBox="0 0 200 210" width={size} height={size * 1.05} style={style} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}k`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4B6B22" /><stop offset="1" stopColor="#1E3311" />
        </linearGradient>
        <radialGradient id={`${id}f`} cx="50%" cy="60%" r="60%">
          <stop offset="0" stopColor="#F1EC9A" /><stop offset="0.55" stopColor="#D5DE78" />
          <stop offset="0.85" stopColor="#A6C957" /><stop offset="1" stopColor="#6E9E33" />
        </radialGradient>
        <radialGradient id={`${id}p`} cx="38%" cy="34%" r="70%">
          <stop offset="0" stopColor="#B87444" /><stop offset="0.6" stopColor="#7A4020" /><stop offset="1" stopColor="#4A230F" />
        </radialGradient>
      </defs>
      <path d={shape} fill={`url(#${id}k)`} />
      <path d={shape} fill={`url(#${id}f)`} transform="translate(100 108) scale(0.88) translate(-100 -108)" />
      <circle cx="100" cy="128" r="40" fill="#8FA83E" opacity="0.35" />
      <circle cx="100" cy="128" r="34" fill={`url(#${id}p)`} />
      <ellipse cx="89" cy="115" rx="11" ry="7" fill="#fff" opacity="0.28" transform="rotate(-30 89 115)" />
      <path d="M58 60 C 66 42, 82 32, 96 30" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
};

export const Peppercorns = ({ size = 60, style, className }) => (
  <svg viewBox="0 0 60 60" width={size} height={size} style={style} className={className} aria-hidden="true">
    {[[10, 12, 3.2], [24, 6, 2.6], [30, 22, 3.4], [46, 14, 2.4], [14, 36, 2.8], [40, 40, 3], [52, 30, 2.2], [26, 50, 2.6]].map(([x, y, r], i) => (
      <g key={i}>
        <circle cx={x} cy={y} r={r} fill={i % 3 === 0 ? '#5B3A22' : '#3A2716'} />
        <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.3} fill="#fff" opacity="0.25" />
      </g>
    ))}
  </svg>
);

/* ─── Procedural bowls ──────────────────────────────────────────────── */

const DISHES = {
  grain: {
    seed: 7, base: '#E6D7B2',
    groups: [
      { shape: 'grain', colors: ['#F5EDD8', '#DCC99E', '#EADCB9', '#C9A86A'], count: 240, size: [1.6, 2.4], sector: [0, 360], r: [0, 1] },
      { shape: 'shred', colors: ['#7C3F7B', '#9A4E95', '#5E2C60'], count: 44, size: [5, 8], sector: [25, 95], r: [0.35, 0.95] },
      { shape: 'slice', colors: ['#D9A066', '#C98B4E'], stripe: '#6E3F1C', count: 5, size: [11, 13], sector: [110, 200], r: [0.4, 0.78] },
      { shape: 'avo', colors: ['#CBD86A'], count: 6, size: [10, 11], sector: [215, 290], r: [0.45, 0.8] },
      { shape: 'half', colors: ['#E8432E'], count: 5, size: [6.5, 8], sector: [300, 360], r: [0.35, 0.85] },
      { shape: 'leaf', colors: ['#3E7A2C', '#5E9E3A', '#2E6424'], count: 7, size: [7, 10], sector: [0, 360], r: [0.1, 0.5] },
      { shape: 'grain', colors: ['#FFF8E6', '#2B1D12'], count: 28, size: [0.9, 1.3], sector: [0, 360], r: [0, 0.9] },
    ],
  },
  greens: {
    seed: 21, base: '#3F6A2C',
    groups: [
      { shape: 'leaf', colors: ['#4F8F35', '#6FAE45', '#2E6424', '#86C35A'], count: 46, size: [8, 13], sector: [0, 360], r: [0, 1] },
      { shape: 'dot', colors: ['#E5BC78', '#D8A95F'], count: 18, size: [4.5, 5.5], sector: [0, 360], r: [0.1, 0.85] },
      { shape: 'half', colors: ['#E8432E'], count: 7, size: [6, 7.5], sector: [0, 360], r: [0.2, 0.85] },
      { shape: 'shred', colors: ['#B04A7A', '#8E3A66'], count: 12, size: [5, 7], sector: [0, 360], r: [0.2, 0.9] },
      { shape: 'cube', colors: ['#F5F1E6'], count: 7, size: [4, 5], sector: [0, 360], r: [0.2, 0.8] },
    ],
  },
  toast: {
    seed: 3, base: '#EDE0C2',
    groups: [
      { shape: 'leaf', colors: ['#6FAE45', '#4F8F35'], count: 12, size: [8, 11], sector: [0, 360], r: [0.55, 1] },
      { shape: 'avo', colors: ['#CBD86A'], count: 7, size: [11, 12], sector: [150, 330], r: [0.25, 0.7] },
      { shape: 'egg', colors: ['#FFFDF6'], count: 2, size: [15, 16], sector: [350, 400], r: [0.3, 0.5] },
      { shape: 'half', colors: ['#E8432E'], count: 4, size: [6, 7], sector: [0, 360], r: [0.55, 0.9] },
      { shape: 'grain', colors: ['#2B1D12', '#F4E9D0'], count: 30, size: [0.9, 1.3], sector: [0, 360], r: [0, 0.9] },
    ],
  },
  salmon: {
    seed: 11, base: '#F1EADA',
    groups: [
      { shape: 'grain', colors: ['#FFFFFF', '#F3EDE0', '#E8DFCB'], count: 220, size: [1.8, 2.6], sector: [0, 360], r: [0, 1] },
      { shape: 'slice', colors: ['#F28B5B', '#EE7C4C'], stripe: '#FFE3D2', count: 4, size: [13, 15], sector: [120, 220], r: [0.35, 0.7] },
      { shape: 'avo', colors: ['#CBD86A'], count: 6, size: [10, 11], sector: [235, 310], r: [0.45, 0.82] },
      { shape: 'dot', colors: ['#8DBF4A', '#7AAE3A'], count: 16, size: [4, 5], sector: [320, 400], r: [0.35, 0.85] },
      { shape: 'half', colors: ['#E8432E'], count: 4, size: [6.5, 7.5], sector: [55, 110], r: [0.4, 0.85] },
      { shape: 'shred', colors: ['#F29A3A', '#E7862A'], count: 22, size: [5, 7], sector: [45, 115], r: [0.3, 0.95] },
      { shape: 'leaf', colors: ['#3E7A2C', '#5E9E3A'], count: 6, size: [7, 9], sector: [0, 360], r: [0.1, 0.55] },
      { shape: 'grain', colors: ['#2B1D12', '#FFF8E6'], count: 26, size: [0.9, 1.3], sector: [0, 360], r: [0, 0.9] },
    ],
  },
  berry: {
    seed: 17, base: '#F6F1EA',
    groups: [
      { shape: 'grain', colors: ['#E9D9B5', '#D8BE8A', '#C9A66B'], count: 70, size: [2.2, 3.2], sector: [150, 330], r: [0.2, 0.95] },
      { shape: 'dot', colors: ['#3C3C7A', '#2E2D63', '#4A4A92'], count: 20, size: [4.5, 5.5], sector: [0, 360], r: [0.1, 0.9] },
      { shape: 'dot', colors: ['#C8243E', '#E03A52'], count: 10, size: [5.5, 7], sector: [0, 360], r: [0.1, 0.85] },
      { shape: 'leaf', colors: ['#5E9E3A'], count: 3, size: [6, 7], sector: [0, 360], r: [0, 0.4] },
    ],
  },
  seeds: {
    seed: 5, base: '#6B4A2E',
    groups: [
      { shape: 'grain', colors: ['#3E2A1A', '#8A6440', '#5A3D24', '#A77D52'], count: 170, size: [2.2, 3.2], sector: [0, 360], r: [0, 1] },
    ],
  },
};

const renderTopping = (g, key, x, y, s, rot, color) => {
  const t = `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)})`;
  switch (g.shape) {
    case 'grain':
      return <ellipse key={key} transform={t} rx={s} ry={s * 0.62} fill={color} />;
    case 'dot':
      return (
        <g key={key} transform={t}>
          <circle r={s} fill={color} />
          <circle cx={-s * 0.32} cy={-s * 0.32} r={s * 0.32} fill="#fff" opacity="0.35" />
        </g>
      );
    case 'half':
      return (
        <g key={key} transform={t}>
          <circle r={s} fill={color} />
          <circle r={s * 0.72} fill="#F66A4F" />
          <circle cx={-s * 0.25} r={s * 0.14} fill="#FCD9A0" /><circle cx={s * 0.25} r={s * 0.14} fill="#FCD9A0" />
          <circle cy={s * 0.3} r={s * 0.12} fill="#FCD9A0" />
        </g>
      );
    case 'leaf':
      return <path key={key} transform={t} fill={color}
        d={`M0 ${-s} C ${s * 0.8} ${-s * 0.4}, ${s * 0.8} ${s * 0.4}, 0 ${s} C ${-s * 0.8} ${s * 0.4}, ${-s * 0.8} ${-s * 0.4}, 0 ${-s} Z`} />;
    case 'shred':
      return <path key={key} transform={t} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"
        d={`M ${-s} 0 Q 0 ${-s * 0.7}, ${s} 0`} />;
    case 'cube':
      return <rect key={key} transform={t} x={-s} y={-s} width={s * 2} height={s * 2} rx="1.5" fill={color} stroke="rgba(0,0,0,0.06)" />;
    case 'avo':
      return (
        <g key={key} transform={t}>
          <ellipse rx={s * 1.15} ry={s * 0.42} fill="#5E7F2A" />
          <ellipse rx={s * 1.05} ry={s * 0.32} fill={color} />
          <ellipse cy={-s * 0.08} rx={s * 0.7} ry={s * 0.1} fill="#F1EC9A" opacity="0.7" />
        </g>
      );
    case 'slice':
      return (
        <g key={key} transform={t}>
          <rect x={-s * 1.2} y={-s * 0.5} width={s * 2.4} height={s} rx={s * 0.45} fill={color} />
          {[-0.6, 0, 0.6].map((o) => (
            <line key={o} x1={s * o - s * 0.18} y1={-s * 0.42} x2={s * o + s * 0.18} y2={s * 0.42}
              stroke={g.stripe} strokeOpacity="0.55" strokeWidth={s * 0.12} strokeLinecap="round" />
          ))}
        </g>
      );
    case 'egg':
      return (
        <g key={key} transform={t}>
          <path fill={color} stroke="rgba(0,0,0,0.05)"
            d={`M ${-s} 0 C ${-s} ${-s * 0.9}, ${s * 0.9} ${-s * 1.05}, ${s * 1.05} ${-s * 0.1} C ${s * 1.1} ${s * 0.9}, ${-s * 0.8} ${s}, ${-s} 0 Z`} />
          <circle r={s * 0.45} fill="#F7A21B" />
          <circle cx={-s * 0.14} cy={-s * 0.14} r={s * 0.16} fill="#FFD66B" />
        </g>
      );
    default:
      return null;
  }
};

const buildToppings = (dish) => {
  const rand = rng(dish.seed);
  const R = 74;
  const out = [];
  dish.groups.forEach((g, gi) => {
    for (let i = 0; i < g.count; i++) {
      const a = ((g.sector[0] + rand() * (g.sector[1] - g.sector[0])) * Math.PI) / 180;
      const rr = R * (g.r[0] + Math.sqrt(rand()) * (g.r[1] - g.r[0]));
      const s = g.size[0] + rand() * (g.size[1] - g.size[0]);
      const radial = (a * 180) / Math.PI + 90;
      const rot = g.shape === 'slice' || g.shape === 'avo' ? radial + (rand() - 0.5) * 20 : rand() * 360;
      const color = g.colors[Math.floor(rand() * g.colors.length)];
      out.push(renderTopping(g, `${gi}-${i}`, 100 + Math.cos(a) * rr, 100 + Math.sin(a) * rr, s, rot, color));
    }
  });
  return out;
};

/* Top-down ceramic bowl filled with a named recipe. */
export const Dish = ({ variant = 'grain', size = 120, rim = '#FBF8F2', style, className }) => {
  const id = useSvgId();
  const dish = DISHES[variant];
  const toppings = useMemo(() => buildToppings(dish), [dish]);
  return (
    <svg viewBox="0 0 212 212" width={size} height={size} style={style} className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}sh`} cx="50%" cy="50%" r="50%">
          <stop offset="0.82" stopColor="rgba(45,32,15,0.22)" /><stop offset="1" stopColor="rgba(45,32,15,0)" />
        </radialGradient>
        <linearGradient id={`${id}rim`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#FFFFFF" /><stop offset="0.6" stopColor={rim} /><stop offset="1" stopColor="#DDD3C2" />
        </linearGradient>
        <radialGradient id={`${id}in`} cx="50%" cy="50%" r="50%">
          <stop offset="0.78" stopColor="rgba(0,0,0,0)" /><stop offset="1" stopColor="rgba(40,25,10,0.28)" />
        </radialGradient>
        <clipPath id={`${id}c`}><circle cx="100" cy="100" r="77" /></clipPath>
      </defs>
      <circle cx="108" cy="110" r="102" fill={`url(#${id}sh)`} />
      <circle cx="100" cy="100" r="95" fill={`url(#${id}rim)`} stroke="rgba(60,45,25,0.08)" />
      <circle cx="100" cy="100" r="79" fill="rgba(60,45,25,0.12)" />
      <circle cx="100" cy="100" r="77" fill={dish.base} />
      <g clipPath={`url(#${id}c)`}>
        {toppings}
        <circle cx="100" cy="100" r="77" fill={`url(#${id}in)`} />
      </g>
      <path d="M 28 64 A 80 80 0 0 1 72 18" stroke="#fff" strokeOpacity="0.85" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
};
