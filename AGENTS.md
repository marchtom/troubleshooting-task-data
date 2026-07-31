# Agent notes

This repository is the Box recruitment troubleshooting dashboard.

Before changing, pushing, opening PRs, or updating GitHub Pages, read and follow:

**[`.cursor/skills/recruitment-task-ops/SKILL.md`](.cursor/skills/recruitment-task-ops/SKILL.md)**

Summary:

- Two remotes: `origin` (Box GHE) and `public` (github.com — used for recruitment).
- No automatic mirror; publish to both when shipping.
- Live sites are static **`gh-pages`** branches built **locally** from `dist/` (not Actions).
- Without write access, push a branch and open a PR; do not expect `git push … main` to work.
- github.com write may require a personal-account collaborator invite and separate `gh` auth.
