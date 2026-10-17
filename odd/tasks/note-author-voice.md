# Note 011 author voice and editorial review

Issue: https://github.com/elvinlab/elvinlab.dev/issues/150 (Tier 3)

## Completed (2026-10-17)

- Restored the signing author as narrator throughout note 011; removed the unsupported assistant-to-author dialogue and generic closing question. Kept URL and publication date, set updatedDate.
- Corrected revertí, chronology, the scope of JavaScript claims, the local React/Preact API comparison, the budget threshold explanation and the half-budget comparison.
- Marked the 16.63 KiB / Lighthouse figures as historical and page-level, not island-only or all Turnstile traffic.
- NOTES.md and NOTES.en.md now require author-perspective, evidence, arithmetic, tone and full-text review for new and edited notes. CLAUDE.md points agents to that mandatory review. Aligned the manual verification recipe with touch-scoped checks instead of running every test for a note.
- Added changelog entry note-011-author-voice.

## Evidence

- docs/adr/0001-astro-tailwind-pnpm-monorepo.md and docs/adr/0005-preact-for-islands.md: original choice, 2026-09-30 one-button comparison (69 / 7.3 KiB gzip), tradeoffs and island-module budget fix.
- odd/tasks/contact-ui.md, C1/C3/C4: 0 vs 131-byte regression; 16.63 KiB page budget; worst-of-three contact URL Lighthouse results on 2026-09-30 (98–100, LCP 1.06–1.82 s, TBT 0, CLS .049). These were not measured anew.
- Repository history dates the initial work to late September; removed the unsupported weeks claim. 69 / 7.3 = 9.45; 16.63 / 30 = 55.43%, not less than half.

## Validation and remaining work

- Passed: documentation quality tests (16), pnpm lint (609 files), git diff --check; final note YAML parsed and validated with the real noteSchema; standalone MDX compilation with the installed Astro Satteri processor passed (description 148/160, decision fields 238/225/242 of 280).
- Full production build attempted: content sync and Vite builds passed, then Cloudflare prerender initialization failed with uv_interface_addresses (environment network-interface enumeration error). Build output checks could not run on a complete build. JS budget on an empty output is not treated as a pass. Page-weight and check:built-notes attempts failed because dist/client did not exist.
- Not re-run: types, full unit suite, dependency boundaries, white-label, browser suite, Lighthouse, cold start and generated config docs: only prose/content changed; no runtime/schema/config changes. Latest recorded full baseline remains Release 20 in odd/verification-ledger.md; these scopes were not re-verified here.
- Environment lacks mise and the exact pinned toolchain; validation used available Node 24.19.0 and pnpm 11.25.0, not pinned Node 24.21.0 / pnpm 12.6.0. Lockfile unchanged.
- Pending: full build and built-output/budget checks in an environment that can initialize Cloudflare, visual inspection of the real rendered note, explicit owner authorization for main, then release and production check. No production push in this task.
