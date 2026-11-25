# Worktrees only for a parallel PR (#19)

**A second worktree is only for a parallel PR. Agents run `worktree:cleanup --dry-run` at the start of each task, and `clean` after a merge** (Shakil, 25 Nov 2026).

- **Why:** each worktree carries its own `node_modules` and build output, and forgotten ones fill the disk.
- Both scripts come with the tooling PR, ported from CT Admin.
