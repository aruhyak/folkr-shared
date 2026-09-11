# @folkr/shared

Types, geo helpers and mock data shared by every Local Events fragment.

**Everything else depends on this repo.** Nothing else builds until it has a tag.

## What's in it

| File | Contents |
|---|---|
| `types.ts` | The four post kinds as a discriminated union, plus the licence rule |
| `geo.ts` | Haversine distance and the date/distance formatters |
| `mock.ts` | 16 sample posts and a `nearby()` stand-in for the PostGIS query |

## The four kinds

Posts are one table with a `kind` discriminator, so the feed stays a single
indexed geo query:

```ts
type Post = EventPost | RequestPost | OfferPost
```

They differ in shape, not just category:

| Kind | Time shape | Response | Money |
|---|---|---|---|
| `event` | `startsAt`, may repeat via `rrule` | RSVP — many people | no |
| `request` | `neededFrom` → `neededTo` range | claimed by exactly one | yes |
| `offer` | standing availability | contact / book | yes |

## The licence rule

Electrical, plumbing, HVAC and gas require a trade licence in nearly every US
state, regardless of job size. That is encoded here rather than left to the UI:

```ts
LICENCE_REQUIRED_TRADES        // ['electrical','plumbing','hvac','gas']
requiresLicence(trades)        // does this listing need one?
offerIsPublishable(offer)      // false unless the licence is verified
```

The BFF enforces this again server-side — this is the client-side mirror, not
the guard.

## Using it from another repo

Installed by git tag, not from a registry:

```json
"dependencies": {
  "@folkr/shared": "github:aruhyak/localevents-shared#v0.1.0"
}
```

The `prepare` script builds `dist/` automatically on install, so consumers need
no extra step.

## Releasing a change

Consumers pin a tag, so a change is invisible until you cut a new one:

```bash
npm version patch      # or minor / major
git push --follow-tags
```

Then in each consuming repo, bump the tag in `package.json` and reinstall.

## Local development

```bash
npm install
npm run build
npm run typecheck
```

## Phase note

`mock.ts` exists so phase 1 runs with no backend. In phase 2 the fragments call
the BFF instead and `nearby()` is replaced by `ST_DWithin` on a GiST index —
the types and formatters stay.

## Licence

**Publicly visible, but not open source.** Copyright © 2026 Aruhya Kambampati,
all rights reserved — see [LICENSE](LICENSE).

This repo is public only so the project's build tooling can resolve it as a
dependency without credentials. That is a practical decision, not a grant of
rights to use the code.
