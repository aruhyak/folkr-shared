/**
 * Distance maths for the mock feed.
 *
 * In phase 2 this is replaced by PostGIS `ST_DWithin` on a GiST index, which
 * filters by radius BEFORE sorting — so distance is never computed across the
 * whole table. This file exists only so phase 1 runs with no backend.
 */

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function haversineKm(
  aLat: number, aLng: number,
  bLat: number, bLng: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export const KM_PER_MILE = 1.609344;

export const milesToKm = (mi: number): number => mi * KM_PER_MILE;
export const kmToMiles = (km: number): number => km / KM_PER_MILE;

/** Radius choices offered in the feed. Miles, because the audience is US. */
export const RADIUS_MILES = [5, 10, 15, 20, 50] as const;
export type RadiusMiles = (typeof RADIUS_MILES)[number];

export type DistanceUnit = 'mi' | 'km';

/**
 * Distances are stored in km (PostGIS works in metres) but shown in miles,
 * since the audience is US. Under a mile it reads in feet, rounded to 50 —
 * false precision like "0.34 mi" is worse than "1,800 ft" for judging whether
 * something is walkable.
 */
export function formatDistance(km: number, unit: DistanceUnit = 'mi'): string {
  if (unit === 'km') {
    if (km < 1) return `${Math.round((km * 1000) / 50) * 50} m`;
    return `${km.toFixed(1)} km`;
  }
  const mi = kmToMiles(km);
  if (mi < 0.2) {
    const ft = Math.round((mi * 5280) / 50) * 50;
    return `${ft} ft`;
  }
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}

/** "in 2 hours", "tomorrow", "Sat 14 Mar" — relative where it helps, absolute where it doesn't. */
export function formatWhen(iso: string, now = new Date()): string {
  const then = new Date(iso);
  const diffMs = then.getTime() - now.getTime();
  const diffH = diffMs / 3_600_000;

  if (diffMs < 0) return 'ended';
  if (diffH < 1) return `in ${Math.max(1, Math.round(diffMs / 60_000))} min`;
  if (diffH < 8) return `in ${Math.round(diffH)} h`;

  const sameDay = then.toDateString() === now.toDateString();
  if (sameDay) return `today ${timeOf(then)}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (then.toDateString() === tomorrow.toDateString()) return `tomorrow ${timeOf(then)}`;

  if (diffH < 24 * 7) {
    return `${then.toLocaleDateString('en-US', { weekday: 'short' })} ${timeOf(then)}`;
  }
  return then.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

/**
 * A wall clock, for a moment that is not a post.
 *
 * formatWhen() describes a POST's lifecycle and answers "ended" for anything
 * in the past — which is right on a listing and nonsense on a chat message,
 * where it stamped every bubble with "ended" instead of a time.
 */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function timeOf(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(':00', '')
    .toLowerCase()
    .replace(' ', '');
}

/** "Aug 15 – 22" for a request's date range. */
export function formatRange(fromIso: string, toIso: string): string {
  const f = new Date(fromIso);
  const t = new Date(toIso);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (f.toDateString() === t.toDateString()) return fmt(f);
  // The month may only be dropped from the end when both dates share it AND
  // the same year. Aug 31 to Sep 28 was rendering as "Aug 31 – 28", which reads
  // as a range that ends before it starts.
  const sameMonth =
    f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear();
  return sameMonth
    ? `${fmt(f)} – ${t.toLocaleDateString('en-US', { day: 'numeric' })}`
    : `${fmt(f)} – ${fmt(t)}`;
}

/**
 * How a repeating, multi-day event reads on a card.
 *
 * "ended · repeats" is what you get from describing such an event by its first
 * occurrence — technically true of day one, and wrong about the event, which
 * is still on. What matters is the hours it keeps and the day it stops.
 */
export function formatDailyRun(startsIso: string, endsIso: string | undefined, until: number): string {
  const t = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: d.getMinutes() ? '2-digit' : undefined, hour12: true })
      .replace(' ', '\u2009');
  const from = new Date(startsIso);
  const hours = endsIso ? `${t(from)}–${t(new Date(endsIso))}` : t(from);
  const last = new Date(until).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${hours} daily · to ${last}`;
}

const WEEKDAY: Record<string, string> = {
  SU: 'Sunday', MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday',
  TH: 'Thursday', FR: 'Friday', SA: 'Saturday',
};

/**
 * How a weekly listing reads: "Tuesdays · 7:30 PM".
 *
 * A quiz night that happens every Tuesday is not usefully described by the
 * date of its next occurrence — "Sun 12:38am · repeats" was both wrong and
 * meaningless. The day it recurs on is the whole point, and it comes from the
 * rule rather than from any one occurrence.
 *
 * Returns null when the rule is not a weekly one with days, so callers can
 * fall through to their normal formatting.
 */
export function formatWeekly(rrule: string | undefined, startsIso: string): string | null {
  if (!rrule || !/FREQ=WEEKLY/.test(rrule)) return null;
  const m = /BYDAY=([A-Z,]+)/.exec(rrule);
  if (!m || !m[1]) return null;
  const days = m[1].split(',').map((d) => WEEKDAY[d]).filter(Boolean);
  if (!days.length) return null;

  const d = new Date(startsIso);
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: d.getMinutes() ? '2-digit' : undefined,
    hour12: true,
  });
  // "Tuesdays", or "Mondays & Thursdays" for a rule with two days.
  const label = days.length === 1
    ? `${days[0]}s`
    : days.map((x) => `${x}s`).join(' & ');
  return `${label} · ${time}`;
}
