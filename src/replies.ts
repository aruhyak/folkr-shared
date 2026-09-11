/**
 * Conversations about a help request.
 *
 * The flow this supports:
 *   1. someone posts "can anyone watch the dog next week"
 *   2. a neighbour offers to help — that offer opens a conversation
 *   3. the two of them go back and forth in it
 *   4. the poster picks ONE person
 *   5. only that person can see the poster's phone number
 *
 * ── SHAPE ─────────────────────────────────────────────────────────────────
 * A thread is identified by (postId, helperId), not by an id of its own. That
 * is not a shortcut — it encodes the rule. There is exactly one conversation
 * between a poster and each person who offers, and it is impossible to create
 * a second by accident, because the key is the pair itself.
 *
 * The poster is never part of the key. They are a participant in every thread
 * on their own post, which falls out of the post's author rather than needing
 * to be stored.
 *
 * Exactly one person is eventually chosen. That is what separates a request
 * from an event: an event wants a crowd, a request wants one person with your
 * house key, and "first to reply wins" is the wrong shape for that.
 *
 * ── A LIMIT WORTH BEING HONEST ABOUT ──────────────────────────────────────
 * Phase 1 runs entirely in the browser. Messages are stored on the device that
 * wrote them, so a reply does not reach the other person, and `canSeeContact`
 * is a UI rule rather than enforcement — anyone opening devtools can read the
 * lot. Both live here rather than inside a component so that phase 2 can move
 * them behind the BFF unchanged: the API stops returning what is not yours,
 * and every caller keeps working.
 */

import type { Post, RequestPost } from './types.js';

const KEY = 'folkr.replies';

export interface Message {
  id: string;
  postId: string;
  /**
   * The helper's id — which thread this belongs to, NOT who wrote it.
   * The poster's own messages carry the helper's id here too.
   */
  helperId: string;
  authorId: string;
  displayName: string;
  message: string;
  createdAt: string;
  /**
   * Was the writer ID-verified when they wrote this?
   *
   * Recorded on the message rather than looked up, because there is no user
   * directory in phase 1 — the only place a person's verified state appears is
   * on posts they authored, and someone who has only ever replied has authored
   * none. Storing it also makes it a fact about the moment: a message written
   * before verification does not retroactively become verified.
   */
  idVerified?: boolean;

  /** Likewise for the phone badge, captured when the message was written. */
  phoneVerified?: boolean;
}

/** Kept as an alias: this was called Reply before threads existed. */
export type Reply = Message;

export interface Thread {
  postId: string;
  helperId: string;
  helperName: string;
  /** Was the helper ID-verified when they opened the conversation? */
  helperVerified: boolean;
  /** And had they confirmed a phone number? */
  helperPhoneVerified: boolean;
  messages: Message[];
  last: Message;
  /** Anything here the viewer has not written and has not seen. */
  unreadFor: (viewerId: string, since: number) => boolean;
}

function storage(): Storage | null {
  try {
    // Blocked outright in Safari private mode — touching it throws.
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readAll(): Message[] {
  const s = storage();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s.getItem(KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    // Entries written before threads existed have no helperId; the author of
    // that first message IS the helper, so it can be recovered rather than
    // dropping someone's offer.
    return (parsed as Message[]).map((m) => ({
      ...m,
      helperId: m.helperId ?? m.authorId,
    }));
  } catch {
    return [];
  }
}

function writeAll(messages: Message[]): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(KEY, JSON.stringify(messages));
    return true;
  } catch {
    return false;
  }
}

/** Every message in one conversation, oldest first. */
export function messagesIn(postId: string, helperId: string): Message[] {
  return readAll()
    .filter((m) => m.postId === postId && m.helperId === helperId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

function toThread(postId: string, helperId: string, messages: Message[]): Thread | null {
  if (messages.length === 0) return null;
  const first = messages[0]!;
  const last = messages[messages.length - 1]!;
  return {
    postId,
    helperId,
    // The helper's name comes from the message that opened the thread — the
    // poster's replies carry the poster's name, not theirs.
    helperName: first.displayName,
    helperVerified: first.idVerified === true,
    helperPhoneVerified: first.phoneVerified === true,
    messages,
    last,
    unreadFor: (viewerId, since) =>
      messages.some((m) => m.authorId !== viewerId && Date.parse(m.createdAt) > since),
  };
}

/** Every conversation on a post — one per person who offered. */
export function threadsOn(postId: string): Thread[] {
  const all = readAll().filter((m) => m.postId === postId);
  const byHelper = new Map<string, Message[]>();
  for (const m of all) {
    const list = byHelper.get(m.helperId) ?? [];
    list.push(m);
    byHelper.set(m.helperId, list);
  }
  return [...byHelper.entries()]
    .map(([helperId, msgs]) =>
      toThread(postId, helperId, msgs.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))))
    .filter((t): t is Thread => t !== null)
    .sort((a, b) => Date.parse(a.messages[0]!.createdAt) - Date.parse(b.messages[0]!.createdAt));
}

/** The viewer's own conversation on a post, if they have one. */
export function threadFor(postId: string, helperId: string): Thread | null {
  return toThread(postId, helperId, messagesIn(postId, helperId));
}

/** How many people have offered. The count is public; the content is not. */
export function replyCount(postId: string): number {
  return threadsOn(postId).length;
}

/** Kept for callers that only want the opening offer of each thread. */
export function repliesFor(postId: string): Message[] {
  return threadsOn(postId).map((t) => t.messages[0]!);
}

export function hasReplied(postId: string, userId: string): boolean {
  return messagesIn(postId, userId).length > 0;
}

/**
 * Add a message to a conversation, opening it if this is the first.
 *
 * `helperId` is the thread, `authorId` is who is speaking. For an offer they
 * are the same person; for the poster's reply they differ, which is the whole
 * point of keeping them as separate fields.
 */
export function sendMessage(input: {
  postId: string;
  helperId: string;
  authorId: string;
  displayName: string;
  message: string;
  idVerified?: boolean;
  phoneVerified?: boolean;
}): Message | null {
  const text = input.message.trim();
  if (!text) return null;
  const all = readAll();
  const msg: Message = {
    // Sequence within the thread, so two messages in the same millisecond
    // cannot collide on an id.
    id: `m-${input.postId}-${input.helperId}-${messagesIn(input.postId, input.helperId).length}`,
    postId: input.postId,
    helperId: input.helperId,
    authorId: input.authorId,
    displayName: input.displayName,
    message: text,
    createdAt: new Date().toISOString(),
    idVerified: input.idVerified,
    phoneVerified: input.phoneVerified,
  };
  return writeAll([...all, msg]) ? msg : null;
}

/** Offering to help — the message that opens a thread. One per person. */
export function addReply(
  input: Omit<Message, 'id' | 'createdAt' | 'helperId'> & { createdAt?: string },
): Message | null {
  if (hasReplied(input.postId, input.authorId)) return null;
  return sendMessage({ ...input, helperId: input.authorId });
}

export function removeThread(postId: string, helperId: string): void {
  writeAll(readAll().filter((m) => !(m.postId === postId && m.helperId === helperId)));
}

/**
 * May this viewer see the poster's phone number?
 *
 * Your own number is always visible to you — otherwise you cannot check what
 * you published. Everyone else must have been chosen: offering is not enough,
 * or the gate would be decoration.
 *
 * NOT enforcement in phase 1. See the note at the top of this file.
 */
export function canSeeContact(post: Post, viewerId: string): boolean {
  if (post.kind !== 'request') return false;
  const r = post as RequestPost;
  if (!r.contactPhone) return false;
  if (r.author.id === viewerId) return true;
  return r.claimState !== 'open' && r.claimedBy === viewerId;
}

/**
 * What a viewer should be told about the number, when they cannot see it.
 * Silence reads as "there is no number"; this reads as "not yet".
 */
export function contactHint(post: Post, viewerId: string): string | null {
  if (post.kind !== 'request') return null;
  const r = post as RequestPost;
  if (!r.contactPhone || canSeeContact(post, viewerId)) return null;
  if (r.claimState === 'open') {
    return 'Offer to help — if they pick you, you’ll get their number.';
  }
  return 'They’ve chosen someone else for this one.';
}
