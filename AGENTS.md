## Agent tooling

- pi (el Gentleman) + gentle-ai handle concise replies and token-saving command compaction; prefer them over the legacy Caveman and RTK tooling.
- Caveman (wired in `.claude/settings.json`) and RTK (wired in `.codex/hooks.json`) are legacy: they only activate under Claude Code and Codex, and are not used here. They are kept for potential future use. RTK output filters live in `.rtk/filters.toml` if ever needed.
- Keep technical details, safety boundaries, and user-facing documentation in clear standard prose.

## Repository knowledge (primary driver: pi / el Gentleman)

- Read `CLAUDE.md` for the canonical repository knowledge: commands, architecture, release workflow, touch-scoped verification, changelog rules and safety constraints. It stays under that name so Claude Code keeps working if we return to it — treat it as shared repo docs, not Claude-only.
- The `CLAUDE.md` delegation note (Tier 1/2 via OpenCode + herdr + OmniRoute) describes the previous toolchain. Work here is now driven from pi (el Gentleman) with gentle-ai: delegate via pi subagents, not herdr/OpenCode. Repo conventions (branches, Conventional Commits, verification, changelog, no AI attribution) still apply unchanged.
- Prior agent tooling (`.claude/`, `.codex/`, `.impeccable/`, `RTK.md`) is kept for potential future use; do not delete it.
- **Production deploys:** `main` is production and a push to it auto-runs CI and deploys on green gates. Never push to `main` or otherwise trigger a production deploy without asking the owner first and getting an explicit yes — even if they earlier said to update branches. `develop` push stays free (no CI attached).
