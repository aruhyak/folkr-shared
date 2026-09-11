/**
 * Posts the user has saved.
 *
 * Only ids are stored, never copies of the posts. A saved post that later gets
 * edited, ends, or is deleted should reflect that — storing a snapshot would
 * leave the Saved tab showing stale text and events that already happened.
 *
 * Phase 2 moves this to a `saves` table keyed by (userId, postId). The shape
 * here is deliberately the same, so `savedIds` becomes a GET and `toggleSave`
 * becomes a PUT/DELETE without callers changing.
 */

import type { Post } from './types.js';

const KEY = 'folkr.saves';

function storage(): Storage | null {
  try {
    // Blocked outright in Safari private mode — touching it throws.
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Ids of saved posts, most recently saved first. */
export function savedIds(): string[] {
  const s = storage();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s.getItem(KEY) ?? '[]') as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function isSaved(id: string): boolean {
  return savedIds().includes(id);
}

/** Save or unsave. Returns the state the post is now in. */
export function toggleSave(id: string): boolean {
  const s = storage();
  const ids = savedIds();
  const has = ids.includes(id);
  const next = has ? ids.filter((x) => x !== id) : [id, ...ids];
  try {
    s?.setItem(KEY, JSON.stringify(next));
  } catch {
    // Out of quota. Report the state that actually persisted, not the one we
    // wanted, so the button does not show a save that was never written.
    return has;
  }
  return !has;
}

/**
 * Saved posts, in the order they were saved.
 *
 * Ids with no matching post are skipped rather than rendered as blanks — a
 * post can be deleted after it was saved, and phase 2 makes that routine.
 */
export function savedPosts(seed: readonly Post[]): Post[] {
  const byId = new Map(seed.map((p) => [p.id, p]));
  return savedIds()
    .map((id) => byId.get(id))
    .filter((p): p is Post => p !== undefined);
}
