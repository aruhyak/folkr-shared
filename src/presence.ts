/**
 * Is somebody around?
 *
 * Derived from when they were last seen rather than stored as a status,
 * because a status is wrong the moment it is written: "online" becomes "away"
 * while the response is still in flight. The timestamp is a fact; the label
 * is a reading of it, and it has to be taken fresh.
 *
 * The thresholds live here so both sides agree. The server stamping
 * last_seen_at and the client drawing a green dot must mean the same thing by
 * "online", or the dot and the text underneath it will contradict each other.
 */

/** Still in the app — it polls every few seconds while open. */
const ONLINE_MS = 2 * 60_000;
/** Was here recently. Their phone may be in a pocket. */
const AWAY_MS = 15 * 60_000;

export type Presence = 'online' | 'away' | 'offline';

export function presenceOf(lastSeenAt?: string): Presence {
  if (!lastSeenAt) return 'offline';
  const ago = Date.now() - new Date(lastSeenAt).getTime();
  if (!Number.isFinite(ago) || ago < 0) return 'offline';
  if (ago < ONLINE_MS) return 'online';
  if (ago < AWAY_MS) return 'away';
  return 'offline';
}

/**
 * How long ago, in words.
 *
 * Deliberately vague past an hour. "Last seen 3 minutes ago" is useful for
 * deciding whether to wait for a reply; "last seen at 2:47am on Tuesday" is
 * surveillance, and this app puts neighbours in touch with strangers.
 */
export function lastSeenLabel(lastSeenAt?: string): string {
  if (!lastSeenAt) return '';
  const ago = Date.now() - new Date(lastSeenAt).getTime();
  if (!Number.isFinite(ago) || ago < 0) return '';

  const mins = Math.floor(ago / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return 'a while ago';
}
