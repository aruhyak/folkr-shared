/**
 * What is waiting for you.
 *
 * Derived, never stored. A notice is a fact about the data — "someone replied
 * to your post", "they chose you" — so it is computed from posts and replies
 * rather than written into a separate table that can drift out of step with
 * them. Delete a post and its notices vanish with it, which is the correct
 * behaviour and needs no cleanup code.
 *
 * The only stored state is a single timestamp: when you last looked. Anything
 * newer than that is unread. That is a far smaller thing to keep correct than
 * a read/unread flag per item, and it cannot get stuck.
 *
 * Phase 2 replaces the derivation with a query and the timestamp with a column
 * on the user row. The shape callers see does not change.
 */

import type { Post, RequestPost } from './types.js';
import { threadsOn } from './replies.js';

const SEEN_KEY = 'folkr.seen';

export type NoticeKind = 'reply' | 'chosen' | 'passed';

export interface Notice {
  id: string;
  kind: NoticeKind;
  postId: string;
  postTitle: string;
  /** Who did the thing — the replier, or the poster who chose. */
  actorName: string;
  /** What they said, when there is something to say. */
  message?: string;
  at: string;
  unread: boolean;
  /** Which conversation this belongs to, so tapping opens the right one. */
  helperId: string;
  /** Was the person who wrote this ID-verified at the time? */
  verified: boolean;
  /** And had they confirmed a phone number? Separate claim, separate badge. */
  phoneVerified: boolean;
  /**
   * The last word was yours — nobody has answered yet.
   *
   * Distinct from unread, which is about whether YOU have seen something. This
   * is about whether THEY have.
   */
  awaitingReply?: boolean;
  /**
   * Is this on a post of YOURS?
   *
   * The same 'reply' notice means two different things depending on which side
   * you are on: on your own post someone offered to help, on someone else's
   * the poster wrote back to you. Without this the second case read as
   * "Tomás offered to help" on a post Tomás had written himself.
   */
  onYourPost: boolean;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** When this person last opened their messages. 0 means never. */
export function lastSeen(): number {
  const s = storage();
  if (!s) return 0;
  const raw = Number(s.getItem(SEEN_KEY) ?? 0);
  return Number.isFinite(raw) ? raw : 0;
}

export function markAllSeen(): void {
  try {
    storage()?.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    /* a lost read-marker only means a badge lingers — never worth throwing */
  }
}

/**
 * Everything waiting for this person, newest first.
 *
 * Three kinds, and they are deliberately different:
 *   reply   — someone offered to help with YOUR post
 *   chosen  — a poster picked YOU
 *   passed  — a poster picked someone else, and you should stop waiting
 *
 * The third exists because silence is the worst outcome for whoever offered.
 * Being told no is a small disappointment; never hearing back is what stops
 * people replying to the next one.
 */
export function noticesFor(viewerId: string, posts: readonly Post[]): Notice[] {
  if (!viewerId) return [];
  const seen = lastSeen();
  const out: Notice[] = [];

  for (const post of posts) {
    // Offers carry conversations too — someone asking a plumber about a job is
    // the same shape as someone offering to walk a dog, and skipping them here
    // meant an enquiry never reached the tradesperson's messages.
    if (post.kind !== 'request' && post.kind !== 'offer') continue;
    const isRequest = post.kind === 'request';
    const r = post as RequestPost;
    const threads = threadsOn(r.id);
    if (threads.length === 0) continue;
    const isOwner = r.author.id === viewerId;

    for (const thread of threads) {
      // Only your own conversations. On your post that is all of them; on
      // someone else's it is the one you opened.
      if (!isOwner && thread.helperId !== viewerId) continue;

      // The newest message the OTHER person wrote — your own words are never
      // news to you.
      const theirs = [...thread.messages].reverse().find((m) => m.authorId !== viewerId);

      /* A conversation you started but nobody has answered yet still belongs
         on this page.

         Only surfacing threads where the OTHER person wrote made Messages a
         list of things done TO you, so somebody who offered to help saw an
         empty page and no way back to what they had written. They had to find
         the post again to see their own message. A messages page that hides
         your own conversations is not a messages page.

         It is shown with the last message either way; only the wording and the
         unread flag differ, because your own words are never news to you. */
      const last = theirs ?? thread.last;
      if (last) {
        out.push({
          id: `msg:${thread.postId}:${thread.helperId}`,
          kind: 'reply',
          postId: r.id,
          postTitle: r.title,
          actorName: last.displayName,
          message: last.message,
          at: last.createdAt,
          // Your own message is never unread. Only somebody else's can be.
          unread: !!theirs && Date.parse(last.createdAt) > seen,
          // Whether the last word was theirs, so the page can say "you offered
          // to help" rather than pretending somebody replied.
          awaitingReply: !theirs,
          helperId: thread.helperId,
          verified: last.idVerified === true,
          phoneVerified: last.phoneVerified === true,
          onYourPost: isOwner,
        });
      }

      // Being picked, or passed over, is a separate thing from a message —
      // and only requests get claimed at all.
      if (isRequest && !isOwner && r.claimState !== 'open') {
        const chosen = r.claimedBy === viewerId;
        out.push({
          id: `${chosen ? 'chosen' : 'passed'}:${r.id}:${viewerId}`,
          kind: chosen ? 'chosen' : 'passed',
          postId: r.id,
          postTitle: r.title,
          actorName: r.author.displayName,
          at: thread.last.createdAt,
          unread: chosen && Date.parse(thread.last.createdAt) > seen,
          helperId: thread.helperId,
          verified: r.author.idVerified === true,
          phoneVerified: r.author.phoneVerified === true,
          onYourPost: false,
        });
      }
    }
  }

  return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** For the badge. Counts only what the viewer has not looked at. */
export function unreadCount(viewerId: string, posts: readonly Post[]): number {
  return noticesFor(viewerId, posts).filter((n) => n.unread).length;
}
