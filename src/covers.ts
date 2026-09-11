/**
 * A cover picture for every post.
 *
 * PROBLEM: an image-led feed needs an image, and almost no post has one. A
 * grid of empty grey boxes looks worse than the text cards it replaced.
 *
 * So every post gets a drawn cover derived from its own id. A real photo, when
 * someone uploads one, replaces it entirely — the cover only ever fills a hole.
 *
 * Deterministic, not random: the same post draws the same cover on every
 * device, every render, forever. A cover that changed on reload would read as
 * a glitch, and would make the feed impossible to recognise at a glance.
 *
 * Deliberately illustrative. Nobody should mistake a placeholder for a
 * photograph of the actual place, and an obviously drawn cover cannot mislead
 * someone about what they are turning up to.
 *
 * Glyphs are Lucide (ISC) — the same set the tab icons use. See NOTICE.
 */

import type { Post, EventPost, RequestPost, OfferPost } from './types.js';

/* ── the palette, as covers use it ───────────────────────────────────────── */

const LIME = '#E3FF4F';
const NEARBLACK = '#0B0B0C';
const PICKET = '#F3F2EA';

/**
 * Ground pairs and the ink that sits on them.
 *
 * On a near-black interface the covers ARE the colour — the chrome is
 * deliberately monochrome, so a feed's entire palette comes from these and
 * from people's photographs. They are built as posters rather than as
 * backgrounds: saturated, high contrast, and different enough from one another
 * that a column of them does not read as one texture.
 *
 * Every pair is checked so the glyph and the title survive on the ground under
 * them. A cover whose subject is illegible is decoration pretending to be
 * information.
 */
const SCHEMES: readonly (readonly [string, string, string])[] = [
  [NEARBLACK, '#1D1D24', LIME],        // black, lime ink — the house style
  ['#2B1B57', '#4B2A8C', LIME],        // violet
  ['#0E5C6B', '#12849B', LIME],        // deep teal
  ['#C2402F', '#E85C46', PICKET],      // hot coral, cream ink
  ['#7FD8FF', '#BCEBFF', '#052430'],   // cyan, dark ink
  ['#FFB27F', '#FFD3B2', '#2A1206'],   // amber, dark ink
];

/** Lucide path bodies, 24x24 grid. */
const G: Record<string, string> = {
  'volleyball': '<path d="M11 7a16 16 20 0 1 10.98 4.362" /> <path d="M12 12a13 13 0 0 1-8.66 5" /> <path d="M16.83 13.634a16 16 0 0 1-9.267 7.328" /> <path d="M20.66 17A13 13 0 0 0 12 12a13 13 0 0 1 0-10" /> <path d="M8.17 15.366a16 16 0 0 1-1.713-11.69" /> <circle cx="12" cy="12" r="10" />',
  'dumbbell': '<path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z" /> <path d="m2.5 21.5 1.4-1.4" /> <path d="m20.1 3.9 1.4-1.4" /> <path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z" /> <path d="m9.6 14.4 4.8-4.8" />',
  'bike': '<circle cx="18.5" cy="17.5" r="3.5" /> <circle cx="5.5" cy="17.5" r="3.5" /> <circle cx="15" cy="5" r="1" /> <path d="M12 17.5V14l-3-3 4-3 2 3h2" />',
  'music': '<path d="M9 18V5l12-2v13" /> <circle cx="6" cy="18" r="3" /> <circle cx="18" cy="16" r="3" />',
  'guitar': '<path d="m11.9 12.1 4.514-4.514" /> <path d="M20.1 2.3a1 1 0 0 0-1.4 0l-1.114 1.114A2 2 0 0 0 17 4.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 17.828 7h1.344a2 2 0 0 0 1.414-.586L21.7 5.3a1 1 0 0 0 0-1.4z" /> <path d="m6 16 2 2" /> <path d="M8.23 9.85A3 3 0 0 1 11 8a5 5 0 0 1 5 5 3 3 0 0 1-1.85 2.77l-.92.38A2 2 0 0 0 12 18a4 4 0 0 1-4 4 6 6 0 0 1-6-6 4 4 0 0 1 4-4 2 2 0 0 0 1.85-1.23z" />',
  'mic-vocal': '<path d="m11 7.601-5.994 8.19a1 1 0 0 0 .1 1.298l.817.818a1 1 0 0 0 1.314.087L15.09 12" /> <path d="M16.5 21.174C15.5 20.5 14.372 20 13 20c-2.058 0-3.928 2.356-6 2-2.072-.356-2.775-3.369-1.5-4.5" /> <circle cx="16" cy="7" r="5" />',
  'store': '<path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" /> <path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244" /> <path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05" />',
  'shopping-basket': '<path d="m15 11-1 9" /> <path d="m19 11-4-7" /> <path d="M2 11h20" /> <path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4" /> <path d="M4.5 15.5h15" /> <path d="m5 11 4-7" /> <path d="m9 11 1 9" />',
  'carrot': '<path d="M15 16a1 1 0 0 0-7-7q-4 4-5.987 12.385a.5.5 0 0 0 .602.602Q11 20 15 16l-3-3" /> <path d="M15 9q4 4 7 0-3-4-7 0 4-4 0-7-4 3 0 7" /> <path d="m8 15-2.58-2.58" />',
  'tag': '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /> <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />',
  'package': '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" /> <path d="M12 22V12" /> <polyline points="3.29 7 12 12 20.71 7" /> <path d="m7.5 4.27 9 5.15" />',
  'sofa': '<path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" /> <path d="M2 16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z" /> <path d="M4 18v2" /> <path d="M20 18v2" /> <path d="M12 4v9" />',
  'utensils': '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /> <path d="M7 2v20" /> <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />',
  'coffee': '<path d="M10 2v2" /> <path d="M14 2v2" /> <path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" /> <path d="M6 2v2" />',
  'cake-slice': '<path d="M16 13H3" /> <path d="M16 17H3" /> <path d="m7.2 7.9-3.388 2.5A2 2 0 0 0 3 12.01V20a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-8.654c0-2-2.44-6.026-6.44-8.026a1 1 0 0 0-1.082.057L10.4 5.6" /> <circle cx="9" cy="7" r="2" />',
  'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /> <path d="M16 3.128a4 4 0 0 1 0 7.744" /> <path d="M22 21v-2a4 4 0 0 0-3-3.87" /> <circle cx="9" cy="7" r="4" />',
  'hand-heart': '<path d="M11 14h2a2 2 0 0 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16" /> <path d="m14.45 13.39 5.05-4.694C20.196 8 21 6.85 21 5.75a2.75 2.75 0 0 0-4.797-1.837.276.276 0 0 1-.406 0A2.75 2.75 0 0 0 11 5.75c0 1.2.802 2.248 1.5 2.946L16 11.95" /> <path d="m2 15 6 6" /> <path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a1 1 0 0 0-2.75-2.91" />',
  'party-popper': '<path d="M5.8 11.3 2 22l10.7-3.79" /> <path d="M4 3h.01" /> <path d="M22 8h.01" /> <path d="M15 2h.01" /> <path d="M22 20h.01" /> <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" /> <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17" /> <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7" /> <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" />',
  'baby': '<path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" /> <path d="M15 12h.01" /> <path d="M19.38 6.813A9 9 0 0 1 20.8 10.2a2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" /> <path d="M9 12h.01" />',
  'toy-brick': '<rect width="18" height="12" x="3" y="8" rx="1" /> <path d="M10 8V5c0-.6-.4-1-1-1H6a1 1 0 0 0-1 1v3" /> <path d="M19 8V5c0-.6-.4-1-1-1h-3a1 1 0 0 0-1 1v3" />',
  'rocking-chair': '<path d="m15 13 3.708 7.416" /> <path d="M3 19a15 15 0 0 0 18 0" /> <path d="m3 2 3.21 9.633A2 2 0 0 0 8.109 13H18" /> <path d="m9 13-3.708 7.416" />',
  'graduation-cap': '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" /> <path d="M22 10v6" /> <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />',
  'palette': '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" /> <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /> <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /> <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /> <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />',
  'book-open': '<path d="M12 5v16" /> <path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z" />',
  'paw-print': '<circle cx="11" cy="4" r="2" /> <circle cx="18" cy="8" r="2" /> <circle cx="20" cy="16" r="2" /> <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />',
  'dog': '<path d="M11.25 16.25h1.5L12 17z" /> <path d="M16 14v.5" /> <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 0 0-.493-3.309" /> <path d="M8 14v.5" /> <path d="M8.5 8.5c-.384 1.05-1.083 2.028-2.344 2.5-1.931.722-3.576-.297-3.656-1-.113-.994 1.177-6.53 4-7 1.923-.321 3.651.845 3.651 2.235A7.497 7.497 0 0 1 14 5.277c0-1.39 1.844-2.598 3.767-2.277 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5" />',
  'cat': '<path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z" /> <path d="M8 14v.5" /> <path d="M16 14v.5" /> <path d="M11.25 16.25h1.5L12 17l-.75-.75Z" />',
  'hammer': '<path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" /> <path d="m18 15 4-4" /> <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />',
  'wrench': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z" />',
  'paint-roller': '<rect width="16" height="6" x="2" y="2" rx="2" /> <path d="M10 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /> <rect width="4" height="6" x="8" y="16" rx="1" />',
};

/**
 * Several glyphs per category, so six community posts in a row are not six
 * tinted copies of one picture. Colour alone was not enough separation.
 */
const SETS: Record<string, readonly string[]> = {
  sport: ['volleyball', 'dumbbell', 'bike'],
  music: ['music', 'guitar', 'mic-vocal'],
  market: ['store', 'shopping-basket', 'carrot'],
  yardsale: ['tag', 'package', 'sofa'],
  food: ['utensils', 'coffee', 'cake-slice'],
  community: ['users', 'hand-heart', 'party-popper'],
  kids: ['baby', 'toy-brick', 'rocking-chair'],
  class: ['graduation-cap', 'palette', 'book-open'],
  petcare: ['paw-print', 'dog', 'cat'],
  handyman: ['hammer', 'wrench', 'paint-roller'],
  _fallback: ['users'],
};

/**
 * FNV-1a. Small, dependency-free, and well spread for short strings — which
 * matters, because a poor hash clusters ids onto the same scheme and the
 * variation disappears.
 */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Which family of covers a post draws from. */
function categoryOf(post: Post): string {
  if (post.kind === 'event') return (post as EventPost).category;
  if (post.kind === 'request') {
    return (post as RequestPost).serviceType === 'petcare' ? 'petcare' : 'handyman';
  }
  const trades = (post as OfferPost).trades ?? [];
  return trades.includes('petcare') ? 'petcare' : 'handyman';
}

/**
 * A faint arc field behind the glyph. Two covers sharing a glyph and a scheme
 * still differ here, which is the difference between "a set" and "a bug".
 */
function pattern(h: number, ink: string): string {
  const kind = h % 3;
  const o = 'opacity=".14"';
  if (kind === 0) {
    return `<g ${o} fill="none" stroke="${ink}" stroke-width="10">
      <circle cx="${18 + (h % 40)}" cy="128" r="70"/><circle cx="${18 + (h % 40)}" cy="128" r="104"/></g>`;
  }
  if (kind === 1) {
    return `<g ${o} fill="${ink}">
      <circle cx="196" cy="26" r="46"/><circle cx="30" cy="120" r="30"/></g>`;
  }
  return `<g ${o} fill="none" stroke="${ink}" stroke-width="12">
    <path d="M-10 ${104 + (h % 20)}L120 ${-16 + (h % 20)}"/><path d="M60 ${150 + (h % 20)}L224 ${-4 + (h % 20)}"/></g>`;
}

/**
 * The cover for a post, as an <img> src.
 *
 * encodeURIComponent rather than base64: smaller for text, and legible in
 * devtools when something looks wrong.
 */
export function coverFor(post: Post): string {
  const cat = categoryOf(post);
  const h = hash(post.id + ':' + cat);
  const scheme = SCHEMES[h % SCHEMES.length]!;
  const [from, to, ink] = scheme;

  const names = SETS[cat] ?? SETS._fallback!;
  const glyph = G[names[(h >> 4) % names.length]!] ?? G['users']!;

  const angle = 100 + ((h >> 7) % 6) * 24;
  const scale = 4.2;
  const nudge = (((h >> 11) % 3) - 1) * 10;
  const x = (224 - 24 * scale) / 2 + nudge;
  const y = (140 - 24 * scale) / 2;
  const id = 'c' + h.toString(36);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 224 140" preserveAspectRatio="xMidYMid slice" role="img">` +
    `<defs><linearGradient id="${id}" gradientTransform="rotate(${angle})">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
    `<rect width="224" height="140" fill="url(#${id})"/>` +
    pattern(h, ink) +
    `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${ink}"` +
    ` stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" opacity=".95">${glyph}</g>` +
    `</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, ' '))}`;
}

/** The photo if there is one, otherwise the drawn cover. Never nothing. */
export function imageFor(post: Post): string {
  return post.imageUrl || coverFor(post);
}
