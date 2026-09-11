/**
 * Pictures for the seeded listings.
 *
 * PHASE 1 ONLY — these go when real venues upload their own photos.
 *
 * Drawn SVGs rather than photographs, for the same reason the demo post is:
 * they are obviously illustrations, so nobody browsing the trial mistakes a
 * placeholder for a real event, and there are no licence questions about
 * someone else's picture of a pub.
 *
 * Inline data URIs rather than files, so a fragment carries its own artwork
 * and there is no second request to get wrong — these are ~1KB each, which is
 * smaller than the HTTP round trip would cost.
 */

/** Wraps an SVG body in a 4:3 frame and encodes it for an <img src>. */
function art(body: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img">${body}</svg>`;
  // encodeURIComponent, not base64 — smaller for text, and readable in devtools.
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, ' '))}`;
}

/* The MP213 palette, so the artwork belongs to the app rather than sitting on
   top of it: Halite #16102B, Billabong #4B2A8C, Cassiopeia #7FD8FF,
   Fennec Fox #3A3350, Picket Fence #F3F2EA, Banana King #E3FF4F. */

/** A pub quiz: warm room, low light, tables. */
export const ART_QUIZ = art(`
  <defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#16102B"/><stop offset="100%" stop-color="#4B2A8C"/>
  </linearGradient></defs>
  <rect width="800" height="600" fill="url(#a)"/>
  <circle cx="180" cy="130" r="46" fill="#E3FF4F" opacity="0.9"/>
  <circle cx="180" cy="130" r="78" fill="#E3FF4F" opacity="0.15"/>
  <circle cx="420" cy="106" r="34" fill="#E3FF4F" opacity="0.75"/>
  <circle cx="640" cy="140" r="40" fill="#E3FF4F" opacity="0.82"/>
  <rect y="392" width="800" height="208" fill="#F3F2EA" opacity="0.1"/>
  <g fill="#F3F2EA" opacity="0.9">
    <rect x="96"  y="392" width="200" height="16" rx="8"/>
    <rect x="300" y="424" width="230" height="16" rx="8"/>
    <rect x="540" y="392" width="190" height="16" rx="8"/>
  </g>
  <g fill="#7FD8FF" opacity="0.85">
    <circle cx="150" cy="352" r="30"/><circle cx="238" cy="356" r="26"/>
    <circle cx="382" cy="386" r="29"/><circle cx="470" cy="382" r="25"/>
    <circle cx="596" cy="352" r="28"/><circle cx="682" cy="356" r="24"/>
  </g>
  <rect x="352" y="452" width="120" height="86" rx="8" fill="#F3F2EA" opacity="0.95"/>
  <g stroke="#16102B" stroke-width="5" opacity="0.5">
    <path d="M372 480h80M372 500h80M372 520h52"/>
  </g>
`);

/** A farmers market: stall canopies and produce crates. */
export const ART_MARKET = art(`
  <defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#7FD8FF"/><stop offset="100%" stop-color="#F3F2EA"/>
  </linearGradient></defs>
  <rect width="800" height="600" fill="url(#b)"/>
  <circle cx="660" cy="122" r="52" fill="#E3FF4F" opacity="0.9"/>
  <path d="M0 402 L140 366 L280 396 L420 358 L560 392 L700 362 L800 388 L800 600 L0 600 Z"
        fill="#4B2A8C" opacity="0.16"/>
  <rect y="430" width="800" height="170" fill="#3A3350"/>
  <g>
    <path d="M70 300 h240 l-26 46 H96 Z" fill="#4B2A8C" opacity="0.9"/>
    <rect x="96" y="346" width="8" height="120" fill="#16102B" opacity="0.6"/>
    <rect x="276" y="346" width="8" height="120" fill="#16102B" opacity="0.6"/>
    <rect x="104" y="396" width="172" height="70" rx="6" fill="#F3F2EA" opacity="0.92"/>
    <g fill="#4B2A8C" opacity="0.8">
      <circle cx="140" cy="424" r="15"/><circle cx="176" cy="424" r="15"/>
      <circle cx="212" cy="424" r="15"/><circle cx="248" cy="424" r="15"/>
    </g>
  </g>
  <g>
    <path d="M430 288 h270 l-28 48 H458 Z" fill="#16102B" opacity="0.82"/>
    <rect x="458" y="336" width="8" height="132" fill="#16102B" opacity="0.55"/>
    <rect x="664" y="336" width="8" height="132" fill="#16102B" opacity="0.55"/>
    <rect x="466" y="392" width="200" height="76" rx="6" fill="#F3F2EA" opacity="0.92"/>
    <g fill="#E3FF4F" opacity="0.9">
      <circle cx="506" cy="422" r="16"/><circle cx="546" cy="422" r="16"/>
      <circle cx="586" cy="422" r="16"/><circle cx="626" cy="422" r="16"/>
    </g>
  </g>
`);

/** An open mic: a stage, a mic stand, a spotlight. */
export const ART_OPENMIC = art(`
  <defs><radialGradient id="c" cx="50%" cy="18%" r="76%">
    <stop offset="0%" stop-color="#4B2A8C"/><stop offset="100%" stop-color="#16102B"/>
  </radialGradient></defs>
  <rect width="800" height="600" fill="url(#c)"/>
  <path d="M400 60 L232 600 H568 Z" fill="#E3FF4F" opacity="0.16"/>
  <circle cx="400" cy="72" r="26" fill="#E3FF4F" opacity="0.9"/>
  <ellipse cx="400" cy="536" rx="230" ry="42" fill="#16102B" opacity="0.5"/>
  <rect x="392" y="286" width="9" height="228" rx="4" fill="#F3F2EA" opacity="0.92"/>
  <path d="M396 286 q0 -34 34 -34" stroke="#F3F2EA" stroke-width="9" fill="none" opacity="0.92"/>
  <rect x="418" y="228" width="30" height="52" rx="15" fill="#F3F2EA" opacity="0.96"/>
  <circle cx="433" cy="242" r="9" fill="#16102B" opacity="0.35"/>
  <g fill="#7FD8FF" opacity="0.55">
    <circle cx="126" cy="472" r="30"/><circle cx="204" cy="486" r="26"/>
    <circle cx="612" cy="480" r="28"/><circle cx="686" cy="492" r="24"/>
  </g>
`);

/** A pottery class: a wheel, a bowl, hands implied by the arc. */
export const ART_POTTERY = art(`
  <defs><linearGradient id="d" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#F3F2EA"/><stop offset="100%" stop-color="#3A3350"/>
  </linearGradient></defs>
  <rect width="800" height="600" fill="url(#d)"/>
  <circle cx="150" cy="126" r="58" fill="#E3FF4F" opacity="0.35"/>
  <rect y="452" width="800" height="148" fill="#4B2A8C" opacity="0.14"/>
  <ellipse cx="400" cy="470" rx="182" ry="42" fill="#16102B" opacity="0.16"/>
  <rect x="386" y="392" width="28" height="88" rx="10" fill="#16102B" opacity="0.5"/>
  <ellipse cx="400" cy="392" rx="150" ry="34" fill="#7FD8FF"/>
  <ellipse cx="400" cy="384" rx="150" ry="34" fill="#4B2A8C" opacity="0.85"/>
  <path d="M330 356 q70 -108 140 0 q-70 40 -140 0 Z" fill="#F3F2EA" opacity="0.96"/>
  <path d="M336 352 q64 -92 128 0" fill="none" stroke="#16102B" stroke-width="5" opacity="0.35"/>
  <g fill="#16102B" opacity="0.28">
    <circle cx="196" cy="404" r="22"/><circle cx="604" cy="404" r="22"/>
  </g>
`);
