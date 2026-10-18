## Agent tooling

- Claude Code + gentle-ai is the primary driver; Tier 1/2 tasks are delegated to OpenCode through herdr + OmniRoute (policy in `~/.claude/CLAUDE.md`). pi (el Gentleman) and Codex can still be used.
- Caveman and RTK are intentionally not used: their hooks are removed from the global Claude Code config. Leftover files (`.codex/hooks.json`, `RTK.md`, `.rtk/filters.toml`) are kept inert; do not delete them.
- Keep technical details, safety boundaries, and user-facing documentation in clear standard prose.

## Repository knowledge

- Read `CLAUDE.md` for the canonical repository knowledge: commands, architecture, release workflow, touch-scoped verification, changelog rules and safety constraints. It stays under that name so Claude Code keeps working if we return to it — treat it as shared repo docs, not Claude-only.
- The `CLAUDE.md` delegation note (Tier 1/2 via OpenCode + herdr + OmniRoute) is current again. Repo conventions (branches, Conventional Commits, verification, changelog, no AI attribution) apply unchanged.
- Prior agent tooling (`.codex/`, `.impeccable/`, `RTK.md`) is kept for potential future use; do not delete it.
- **Production deploys:** `main` is production and a push to it auto-runs CI and deploys on green gates. Never push to `main` or otherwise trigger a production deploy without asking the owner first and getting an explicit yes — even if they earlier said to update branches. `develop` push stays free (no CI attached).
