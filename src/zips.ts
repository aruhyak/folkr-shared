/**
 * Offline zip → coordinates.
 *
 * Phase 1 ships a small table rather than calling a geocoder: it resolves
 * instantly, works offline, needs no key, and can't rate-limit. Nominatim
 * would cover every zip but caps at one request a second and forbids heavy
 * use — the same fragility that made CARTO's tiles fail.
 *
 * Phase 2 replaces `lookupZip` with a BFF call to a real geocoder. The
 * signature stays, so nothing above it changes.
 *
 * Coordinates are approximate centroids — good enough to centre a map and
 * run a radius query, which is all they're used for.
 */

export interface ZipPlace {
  zip: string;
  label: string;
  lat: number;
  lng: number;
}

/** The trial areas: Chester County PA, plus Austin from the earlier sample data. */
export const ZIPS: readonly ZipPlace[] = [
  { zip: '78701', label: 'Downtown Austin',    lat: 30.2711, lng: -97.7437 },
  { zip: '78702', label: 'East Austin',        lat: 30.2626, lng: -97.7141 },
  { zip: '78703', label: 'Tarrytown',          lat: 30.2915, lng: -97.7663 },
  { zip: '78704', label: 'Bouldin Creek',      lat: 30.2453, lng: -97.7664 },
  { zip: '78705', label: 'North Campus',       lat: 30.2953, lng: -97.7383 },
  { zip: '78721', label: 'Govalle',            lat: 30.2686, lng: -97.6866 },
  { zip: '78722', label: 'Cherrywood',         lat: 30.2884, lng: -97.7147 },
  { zip: '78723', label: 'Windsor Park',       lat: 30.3068, lng: -97.6866 },
  { zip: '78724', label: 'Colony Park',        lat: 30.2905, lng: -97.6141 },
  { zip: '78727', label: 'North Austin',       lat: 30.4275, lng: -97.7126 },
  { zip: '78731', label: 'Northwest Hills',    lat: 30.3403, lng: -97.7657 },
  { zip: '78735', label: 'Barton Creek',       lat: 30.2536, lng: -97.8523 },
  { zip: '78741', label: 'Riverside',          lat: 30.2278, lng: -97.7146 },
  { zip: '78745', label: 'South Austin',       lat: 30.2071, lng: -97.7936 },
  { zip: '78746', label: 'West Lake Hills',    lat: 30.2905, lng: -97.8062 },
  { zip: '78748', label: 'Southpark Meadows',  lat: 30.1680, lng: -97.8203 },
  { zip: '78749', label: 'Circle C',           lat: 30.2118, lng: -97.8546 },
  { zip: '78751', label: 'Hyde Park',          lat: 30.3079, lng: -97.7235 },
  { zip: '78752', label: 'Highland',           lat: 30.3334, lng: -97.7016 },
  { zip: '78756', label: 'Rosedale',           lat: 30.3208, lng: -97.7396 },
  { zip: '78757', label: 'Crestview',          lat: 30.3499, lng: -97.7318 },
  { zip: '78758', label: 'North Lamar',        lat: 30.3855, lng: -97.7076 },
  { zip: '78759', label: 'Great Hills',        lat: 30.4046, lng: -97.7550 },
  { zip: '78660', label: 'Pflugerville',       lat: 30.4494, lng: -97.6200 },
  { zip: '78664', label: 'Round Rock',         lat: 30.5083, lng: -97.6570 },
  { zip: '78681', label: 'Round Rock West',    lat: 30.5299, lng: -97.7181 },
  { zip: '78613', label: 'Cedar Park',         lat: 30.5052, lng: -97.8203 },
  { zip: '78641', label: 'Leander',            lat: 30.5788, lng: -97.8531 },
  { zip: '78610', label: 'Buda',               lat: 30.0855, lng: -97.8412 },
  { zip: '78640', label: 'Kyle',               lat: 29.9891, lng: -97.8772 },
  { zip: '78666', label: 'San Marcos',         lat: 29.8833, lng: -97.9414 },
  { zip: '78620', label: 'Dripping Springs',   lat: 30.1902, lng: -98.0867 },
  { zip: '78669', label: 'Spicewood',          lat: 30.4746, lng: -98.0400 },
  { zip: '78734', label: 'Lakeway',            lat: 30.3721, lng: -97.9772 },
  { zip: '78652', label: 'Manchaca',           lat: 30.1355, lng: -97.8331 },

  /* Chester County, PA */
  { zip: '19335', label: 'Downingtown',        lat: 40.0161, lng: -75.7183 },
  { zip: '19372', label: 'Thorndale',          lat: 39.9984, lng: -75.7590 },
  { zip: '19341', label: 'Exton',              lat: 40.0468, lng: -75.6432 },
  { zip: '19343', label: 'Glenmoore',          lat: 40.0846, lng: -75.7711 },
  { zip: '19425', label: 'Chester Springs',    lat: 40.0978, lng: -75.6398 },
  { zip: '19320', label: 'Coatesville',        lat: 39.9843, lng: -75.8253 },
  { zip: '19355', label: 'Malvern',            lat: 40.0468, lng: -75.5310 },
  { zip: '19380', label: 'West Chester',       lat: 39.9845, lng: -75.5962 },
  { zip: '19382', label: 'West Chester South', lat: 39.9441, lng: -75.5882 },
  { zip: '19460', label: 'Phoenixville',       lat: 40.1267, lng: -75.5272 },
  { zip: '19301', label: 'Paoli',              lat: 40.0426, lng: -75.4827 },
  { zip: '19312', label: 'Berwyn',             lat: 40.0412, lng: -75.4475 },
  { zip: '19087', label: 'Wayne',              lat: 40.0612, lng: -75.3999 },
  { zip: '19365', label: 'Parkesburg',         lat: 39.9654, lng: -75.9260 },
];

const BY_ZIP = new Map(ZIPS.map((z) => [z.zip, z]));

/** Digits only, so "78704-1234" and " 78704 " both work. */
export function normaliseZip(input: string): string {
  return input.replace(/[^\d]/g, '').slice(0, 5);
}

export function isValidZipFormat(input: string): boolean {
  return normaliseZip(input).length === 5;
}

/**
 * Local table first, then the network.
 *
 * The table answers instantly and offline for the trial area. Anything else
 * falls back to Zippopotam.us — free, keyless, and covers every US zip, which
 * matters because "not in the trial area" is a baffling message when you just
 * typed your own zip code.
 *
 * Phase 2 replaces the fallback with a BFF call so the lookup is cached
 * server-side and we aren't leaning on a free public service.
 */
export async function lookupZip(input: string): Promise<ZipPlace | null> {
  const zip = normaliseZip(input);
  if (zip.length !== 5) return null;

  const local = BY_ZIP.get(zip);
  if (local) return local;

  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;                    // 404 = not a real US zip
    const data = (await res.json()) as {
      'post code': string;
      places: { 'place name': string; state?: string; latitude: string; longitude: string }[];
    };
    const place = data.places?.[0];
    if (!place) return null;

    const lat = Number(place.latitude);
    const lng = Number(place.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
      zip: data['post code'] ?? zip,
      label: place.state ? `${place['place name']}, ${place.state}` : place['place name'],
      lat,
      lng,
    };
  } catch {
    // Offline or timed out. Null reads as "couldn't find it", which is honest
    // — the caller shouldn't have to distinguish the two.
    return null;
  }
}

/** Nearest known place to a coordinate — used to label a GPS fix. */
/** Kilometres between two points, for deciding whether a guess is plausible. */
function kmBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * What is this place called?
 *
 * ── WHY NOT JUST nearestPlace ─────────────────────────────────────────────
 * The local table holds 51 towns, all within one county. Asking it to name a
 * point in Texas returns a Pennsylvania town — confidently, with no error.
 * Somebody sharing their location would see the map centre correctly on their
 * street and the header claim they were four states away, which reads as a
 * broken app rather than a missing feature.
 *
 * So: ask OpenStreetMap's reverse geocoder, which knows everywhere. Fall back
 * to the local table ONLY when the answer it gives is close enough to be
 * plausible, and otherwise say nothing rather than something wrong.
 *
 * Nominatim's policy allows light use and asks for no more than one request a
 * second. This runs when somebody taps "use my location", which is not a
 * volume problem. At real scale it needs a paid geocoder or a self-hosted
 * instance — the same note that applies to the map tiles.
 */
export async function placeNameFor(lat: number, lng: number): Promise<string> {
  try {
    // BigDataCloud's client endpoint: no key, CORS-open, and meant for exactly
    // this. Nominatim was the obvious first choice and is the wrong one — it
    // returns 403 without an identifying User-Agent, and its policy explicitly
    // discourages application traffic on the public instance.
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client`
      + `?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (res.ok) {
      const d = (await res.json()) as Record<string, string>;
      /* locality before city, deliberately.
         For a point in Downingtown, `city` comes back as "Philadelphia" — the
         metro area, forty minutes away and not where anybody would say they
         live. `locality` is the township or neighbourhood, which is what a
         person means by where they are. */
      const name = d.locality || d.city || d.principalSubdivision;
      if (name) return name;
    }
  } catch {
    /* offline, blocked, or too slow — fall through */
  }

  // The local table, but only where its answer could be true. Forty kilometres
  // is about the distance at which a town name stops describing where somebody
  // is.
  const near = nearestPlace(lat, lng);
  if (kmBetween(lat, lng, near.lat, near.lng) <= 40) return near.label;

  // Better to say nothing than to name the wrong town.
  return 'Your area';
}

export function nearestPlace(lat: number, lng: number): ZipPlace {
  let best = ZIPS[0]!;
  let bestD = Number.POSITIVE_INFINITY;
  for (const z of ZIPS) {
    const d = (z.lat - lat) ** 2 + (z.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = z;
    }
  }
  return best;
}
