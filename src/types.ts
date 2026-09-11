/**
 * The four kinds of post, as designed in architecture.html.
 *
 * These are NOT four categories on one form — they differ in time shape,
 * how people respond, and whether money moves. A single `posts` table with
 * a `kind` discriminator keeps the feed to one indexed geo query.
 */

export type PostKind = 'event' | 'request' | 'offer';

export type AuthorKind = 'individual' | 'business';

export interface Author {
  id: string;
  displayName: string;
  avatarUrl?: string;
  kind: AuthorKind;
  /** Business verified badge — set by admin only, never client-settable. */
  verified: boolean;
  /** Government ID checked via Stripe Identity / Persona. Documents are never stored. */
  idVerified: boolean;
  /**
   * A code was texted to their number and typed back.
   *
   * Separate from idVerified on purpose: they answer different questions. ID
   * says the name is real; this says there is a number that reaches them. The
   * server sets it — see /me/phone/confirm — and never the client, or it is
   * just a checkbox anyone can tick about themselves.
   */
  phoneVerified?: boolean;
}

export interface BasePost {
  /**
   * Seeded content, not something a neighbour wrote.
   *
   * A trial feed is mostly invented posts, and on a map they look exactly like
   * real activity — which quietly misleads the person judging whether the
   * neighbourhood is alive. Marked so it can say what it is.
   *
   * PHASE 3 deletes the seed and this flag with it.
   */
  demo?: boolean;
  id: string;
  kind: PostKind;
  title: string;
  description: string;
  lat: number;
  lng: number;
  neighbourhood: string;
  imageUrl?: string;
  author: Author;
  createdAt: string;
  status: 'published' | 'draft' | 'flagged' | 'closed';
}

/* ── events ─────────────────────────────────────────────────────────────── */

export type EventCategory =
  | 'music' | 'sport' | 'market' | 'yardsale' | 'food' | 'community' | 'kids' | 'class';

export interface EventPost extends BasePost {
  kind: 'event';
  /** A single occurrence. Recurring events expand into many of these. */
  startsAt: string;
  endsAt?: string;
  venueName?: string;
  category: EventCategory;
  /** iCal RRULE — business events repeat, community ones rarely do. */
  rrule?: string;
  ticketUrl?: string;
  price?: number;
  rsvpCount: number;
}

/* ── requests ───────────────────────────────────────────────────────────── */

export type ServiceType = 'petcare' | 'handyman' | 'other';

export type ClaimState = 'open' | 'claimed' | 'done';

export interface RequestPost extends BasePost {
  kind: 'request';
  serviceType: ServiceType;
  /** A date RANGE, not a start time — this is what separates it from an event. */
  neededFrom: string;
  neededTo: string;
  budget?: number;
  /** Exactly one person claims a request. Not an RSVP. */
  claimState: ClaimState;
  claimedBy?: string;
  /**
   * The poster's number, shown ONLY to whoever they choose.
   *
   * A field rather than something typed into the description, because a
   * number in the body is visible to everyone the moment it is posted and
   * cannot be taken back. As a field it can be withheld, and phase 2 can stop
   * returning it from the API entirely.
   *
   * See canSeeContact() in replies.ts for the rule, and the note there about
   * why it is not yet enforcement.
   */
  contactPhone?: string;
  /**
   * Someone entering your home while you're away is a different risk from
   * turning up to a pickup game. This flag gates ID verification.
   */
  requiresHomeAccess: boolean;
}

/* ── offers ─────────────────────────────────────────────────────────────── */

export type Trade =
  | 'lawn' | 'cleaning' | 'gutters' | 'hauling' | 'painting' | 'handyman'
  | 'petcare'
  | 'electrical' | 'plumbing' | 'hvac' | 'gas';

/** Trades that belong on the Pets tab rather than Handyman. */
export const PET_TRADES: readonly Trade[] = ['petcare'] as const;

export function isPetTrade(trades: readonly Trade[]): boolean {
  return trades.some((t) => PET_TRADES.includes(t));
}

/**
 * Electrical, plumbing, HVAC and gas require a trade licence in nearly every
 * US state, regardless of job size — there is no small-job exemption.
 * Listings in these trades are GATED, not merely warned about (see SB 378).
 */
export const LICENCE_REQUIRED_TRADES: readonly Trade[] = [
  'electrical', 'plumbing', 'hvac', 'gas',
] as const;

export function requiresLicence(trades: readonly Trade[]): boolean {
  return trades.some((t) => LICENCE_REQUIRED_TRADES.includes(t));
}

export interface Licence {
  number: string;
  /** Two-letter state code — licences are issued per state. */
  state: string;
  verified: boolean;
  verifiedAt?: string;
}

export interface OfferPost extends BasePost {
  kind: 'offer';
  trades: Trade[];
  rate?: number;
  rateUnit?: 'hour' | 'job' | 'visit';
  /** Free text for now: "weekends", "evenings after 5". */
  availability: string;
  /** Required when any trade is licence-gated. Absent otherwise. */
  licence?: Licence;
}

export type Post = EventPost | RequestPost | OfferPost;

/* ── feed ───────────────────────────────────────────────────────────────── */

export interface FeedItem {
  post: Post;
  /** Kilometres from the viewer, computed by the nearby query. */
  distanceKm: number;
}

export interface FeedQuery {
  lat: number;
  lng: number;
  radiusKm: number;
  kinds?: PostKind[];
  from?: string;
  /** Include posts that finished within the grace window, rendered greyed. */
  includeEnded?: boolean;
}

/* ── type guards ────────────────────────────────────────────────────────── */

export const isEvent = (p: Post): p is EventPost => p.kind === 'event';
export const isRequest = (p: Post): p is RequestPost => p.kind === 'request';
export const isOffer = (p: Post): p is OfferPost => p.kind === 'offer';

/**
 * A listing is publishable only if every licence-gated trade it claims has a
 * verified licence. Enforced again in the BFF — this is the client-side mirror.
 */
export function offerIsPublishable(offer: OfferPost): boolean {
  if (!requiresLicence(offer.trades)) return true;
  return offer.licence?.verified === true;
}

/**
 * How long a finished post lingers before it disappears.
 *
 * A day is deliberate: long enough that someone who missed it can still see it
 * happened and who ran it, short enough that the feed doesn't silt up with
 * last week's events. Ended posts render greyed rather than vanishing mid-day,
 * which would look like a bug to whoever posted it.
 */
export const GRACE_HOURS = 24;

export type Lifecycle = 'live' | 'ended' | 'expired';

/** When does this post stop being on? */
/**
 * The UNTIL of an iCal RRULE, in local time.
 *
 * A multi-day event is one occurrence plus a recurrence, not one long block —
 * a three-day yard sale is 8am–5pm on each of three days, not a 57-hour event.
 * So `endsAt` is the end of the FIRST day, and the last day lives in the rule.
 *
 * Local, not UTC, even when the value carries a trailing Z: these are
 * neighbourhood events written and read in one place, and shifting a 5pm
 * finish by the UTC offset would end them on the wrong day.
 */
export function untilOf(rrule: string | undefined): number | null {
  if (!rrule) return null;
  const m = /UNTIL=(\d{8})(?:T(\d{6}))?/.exec(rrule);
  if (!m) return null;
  // noUncheckedIndexedAccess types every match group as possibly undefined,
  // including group 1, which the regex guarantees when m is non-null.
  const d = m[1] ?? '';
  const t = m[2] ?? '235959';
  if (d.length !== 8) return null;
  const n = (str: string, a: number, b: number) => Number(str.slice(a, b));
  return new Date(
    n(d, 0, 4), n(d, 4, 6) - 1, n(d, 6, 8),
    n(t, 0, 2), n(t, 2, 4), n(t, 4, 6),
  ).getTime();
}

export function endsAtOf(post: Post): number | null {
  if (post.kind === 'event') {
    // A recurring event is over when the recurrence is, not when its first
    // occurrence is. Rules without an UNTIL (a weekly run club, say) fall
    // through and are governed by their single occurrence as before.
    return untilOf(post.rrule) ?? new Date(post.endsAt ?? post.startsAt).getTime();
  }
  if (post.kind === 'request') {
    return new Date(post.neededTo).getTime();
  }
  return null;                        // offers are standing until withdrawn
}

/**
 * live    — still on, shows normally
 * ended   — finished within the grace window, shows greyed
 * expired — past the grace window, removed everywhere
 */
export function lifecycle(post: Post, now: Date = new Date()): Lifecycle {
  if (post.status === 'closed') return 'expired';
  const end = endsAtOf(post);
  if (end === null) return 'live';
  const t = now.getTime();
  if (t <= end) return 'live';
  if (t <= end + GRACE_HOURS * 3_600_000) return 'ended';
  return 'expired';
}

/**
 * Has this post finished?
 *
 * Each kind ends differently, which is exactly why the rule lives here rather
 * than being re-derived in each fragment:
 *   event    — its start time has passed
 *   request  — the window closed, or someone completed it
 *   offer    — standing listings only end when withdrawn
 */
export function isPast(post: Post, now: Date = new Date()): boolean {
  if (post.status === 'closed') return true;
  if (post.kind === 'event') return new Date(post.startsAt).getTime() < now.getTime();
  if (post.kind === 'request') {
    return post.claimState === 'done' || new Date(post.neededTo).getTime() < now.getTime();
  }
  return false;
}
