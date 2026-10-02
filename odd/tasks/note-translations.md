# Note translations (translationOf) and the unused cover field

## Objective and authorization
Finding from the docs work (2026-10-01): the note schema accepts `translationOf` and `cover` but nothing reads them. The user asked to fix the findings. Local commits on `feat/note-translations`, push to `develop`; the release to `main` is a separate request. The third finding (no LICENSE) is a legal choice and stays a question for the user.

## Problem and why
- `translationOf` is documented as "reserved". Notes are always rendered without `hreflang` alternates, and the language switch on a note goes to the other language's home even when the same note exists in that language. Search engines cannot link the translations and readers lose their place.
- `cover` is never displayed (the share card is generated from the title). A schema field that does nothing is a trap.

## Decisions
- `translationOf` becomes real. A translation group is the connected set of notes linked by `translationOf` (declared on either side, so one side is enough; three or more languages work), at most one note per language. For a note in a group:
  - `<link rel="alternate" hreflang>` for every language in the group plus `x-default` (the default-locale version), each pointing at that language's note URL (the slugs differ per language);
  - the navbar language switch and the language hint go to the translation instead of the other home;
  - a note without a translation keeps today's behavior (no alternates, switch to the other home).
- Bad data fails the build with a message that names the notes: a target that does not exist (an unpublished draft), a note that translates itself, a translation in the same language, or two notes of the same language in one group.
- `cover` is removed from the schema (nothing uses it; no note defines it). It can come back with a real use.
- The role line in English on the Spanish site is intentional (BRAND defines one positioning line used everywhere); it was mislabeled as a finding.
- Strict TDD: Vitest for the pure group/alternates logic, Playwright (fixture notes `smoke-es` and `smoke-en` already translate each other) for head tags, switch and hint. RDD off (disabled/unmanaged). Route: inline.

## Tasks
- [x] T1 — Pure `translationsOf` (groups, symmetry, validation) and `translationAlternates`, tests first.
- [x] T2 — Wire `Seo` alternates, the navbar switch and the language hint through `BaseLayout` from `NotePage`; e2e.
- [x] T3 — Remove `cover` from the schema; update NOTES guides (ES/EN), DESIGN and the generated tables.
- [x] T4 — Full verification and commit.

## Acceptance criteria
- A note and its translation emit reciprocal `hreflang` alternates and `x-default`; the switch and the hint land on the translation; a note with no translation behaves as before.
- Invalid `translationOf` data fails the build naming the notes.
- `cover` is gone from the schema and the docs; docs tables regenerated and in sync.
- All suites green.

## Progress and evidence
Exploration done: only the two fixture notes use `translationOf`; nothing uses `cover`.

All tasks done and verified 2026-10-01: unit 469, typecheck, lint, depcruise, docs check, e2e 339, white-label, build, JS budget. Merged to develop and released to main on user request. Next step: LICENSE choice (user decision), refresh social caches, close issue #51.

Engram mirror: `odd/note-translations/tasks`.
