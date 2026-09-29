@RTK.md

## Agent tooling

- Use the Caveman skill for concise agent replies when available; keep technical details, safety boundaries, and user-facing documentation in clear standard prose.
- RTK is installed for this repository. Let its native hooks compact command output. Run commands normally; use `rtk proxy <command>` only when compact output is unusable.
- RTK project-specific output filters belong in `.rtk/filters.toml`. Preserve global and unrelated agent settings.
