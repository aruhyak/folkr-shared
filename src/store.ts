/**
 * Posts created on this device.
 *
 * Phase 1 has no backend, so a post you write has to live somewhere or it
 * disappears the moment the sheet closes — which is what was happening: the
 * shell logged the new post to the console and dropped it. Nothing you wrote
 * ever appeared in the feed, and an uploaded photo had nowhere to go.
 *
 * localStorage rather than memory so a post survives a reload. That matters
 * during the trial: a friend posts something, closes the tab, comes back, and
 * expects it to still be there.
 *
 * Phase 3 replaces this wholesale with the BFF — `addLocalPost` becomes a POST
 * and `localPosts` becomes a GET. The photo stops being a data URL and becomes
 * an S3 key. Callers do not change.
 */

import type { Post } from './types.js';

const KEY = 'folkr.posts';

/**
 * A photo is a data URL here, so posts are far larger than typical stored
 * values and localStorage's ~5MB ceiling is reachable. Oldest posts are
 * dropped first when it fills.
 */
const MAX_POSTS = 40;

function storage(): Storage | null {
  try {
    // Absent in SSR and blocked entirely in Safari private mode, where merely
    // touching it throws rather than returning null.
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Posts written on this device, newest first. Never throws. */
export function localPosts(): Post[] {
  const s = storage();
  if (!s) return [];
  try {
    const raw = s.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Post[]) : [];
  } catch {
    // Corrupt or half-written JSON — better an empty feed than a crashed one.
    return [];
  }
}

function write(posts: Post[]): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(KEY, JSON.stringify(posts));
    return true;
  } catch {
    return false;
  }
}

/**
 * Save a post, newest first.
 *
 * On a quota error the photo is dropped before the post is: a post without its
 * picture is still useful, a lost post is not. If it still will not fit, the
 * oldest posts are shed until it does.
 */
export function addLocalPost(post: Post): void {
  let posts = [post, ...localPosts().filter((p) => p.id !== post.id)].slice(0, MAX_POSTS);
  if (write(posts)) return;

  posts = [{ ...post, imageUrl: undefined }, ...posts.slice(1)];
  if (write(posts)) return;

  while (posts.length > 1) {
    posts = posts.slice(0, -1);
    if (write(posts)) return;
  }
}

export function removeLocalPost(id: string): void {
  write(localPosts().filter((p) => p.id !== id));
}

/**
 * Everything the feed should consider: seeded posts plus this device's own.
 *
 * Local entries OVERRIDE seeded ones with the same id, rather than sitting
 * alongside them. That makes the store an override layer, which is what lets a
 * seeded post be claimed or edited at all — the seed is a constant and cannot
 * be mutated in place. Without the dedupe the post would simply appear twice.
 *
 * It is also the shape phase 2 wants: the server is the truth, and this
 * becomes a local cache of changes not yet pushed.
 */
export function allPosts(seed: readonly Post[]): Post[] {
  const local = localPosts();
  const overridden = new Set(local.map((p) => p.id));
  return [...local, ...seed.filter((p) => !overridden.has(p.id))];
}

/**
 * Record a change to a post, seeded or not.
 *
 * Upsert by id — addLocalPost already replaces a same-id entry, so claiming a
 * seeded post writes an overriding copy rather than editing the constant.
 */
export function updateLocalPost(post: Post): void {
  addLocalPost(post);
}
