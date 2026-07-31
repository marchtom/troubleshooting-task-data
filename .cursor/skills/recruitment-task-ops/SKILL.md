---
name: recruitment-task-ops
description: >-
  Operate and publish the Box recruitment troubleshooting dashboard (dual remotes,
  GitHub Pages via gh-pages). Use when changing this app, pushing commits, opening
  PRs, deploying Pages, syncing origin/public, or onboarding collaborators.
---

# Recruitment task ops

Interview troubleshooting dashboard (React + Vite). Candidates use the **public**
GitHub Pages site. Published changes must land on **both** remotes, and the live
site must be refreshed via the **`gh-pages`** static deploy (built locally).

## Access first (read before pushing)

Same policy on **both** remotes (Box GHE and github.com):

| Who | What works |
|-----|------------|
| Anyone (public github.com) | Clone, fork, open a PR |
| Collaborator / write access | Push branches; open PRs from a branch on the repo |
| Owner / admin | Merge PRs; push `main`; deploy `gh-pages` |

**`git push origin main` / `git push public main` only works if you already have
write access to that remote.** Non-collaborators get rejected. Default contributor
flow:

1. Push a **feature branch** (to a fork, or to the repo if you are a collaborator).
2. Open a **PR into `main`** on **each** remote you need updated (or ask an owner
   to mirror the merged change to the other remote).
3. After merge, an owner (or someone with write) redeploys **`gh-pages`** on both
   remotes (see below).

Write access to **`public`** is on the **personal github.com** account that owns
`marchtom/troubleshooting-task-data`, not Box SSO alone. You may need:

1. A **github.com collaborator invite** (private github.com account of the owner).
2. Extra **`gh` auth** for github.com next to Box GHE:

```bash
gh auth status
# Expect both hosts when maintaining both remotes:
#   git.dev.box.net  (Box)
#   github.com       (personal)

gh auth login --hostname github.com
gh api user --hostname github.com
```

GHE (`origin`) uses Box SSH/credentials for `git.dev.box.net`. `public` often uses
HTTPS + github.com credentials. One `gh auth login` does **not** cover both hosts.

## Repositories

| Remote | Host | URL | Role |
|--------|------|-----|------|
| `origin` | Box GHE | `git@git.dev.box.net:tmarchlewski/troubleshooting-task-data.git` | Internal copy / GHE Pages |
| `public` | github.com | `https://github.com/marchtom/troubleshooting-task-data.git` | **Recruitment site for candidates** (public) |

Web UIs:

- GHE: https://git.dev.box.net/tmarchlewski/troubleshooting-task-data
- GitHub: https://github.com/marchtom/troubleshooting-task-data

There is **no automatic mirror**. `git push` / `git push origin` updates only GHE.

Verify remotes:

```bash
git remote -v
```

If `public` is missing:

```bash
git remote add public https://github.com/marchtom/troubleshooting-task-data.git
```

### Publishing source (`main`) when you have write

```bash
git push origin main
git push public main
```

If you lack write on either remote, use a branch + PR instead (see Access first).

## Local app

```bash
npm install
npm test
npm run build
npm run dev
```

- Vite `base: './'` (relative assets — required for project Pages paths).
- Tests: Vitest (`npm test`).
- Scenario/content lives under `src/` (views, `src/data/`, etc.).

Local Box Artifactory in `~/.npmrc` is fine for `npm install` on a Box laptop.
It does **not** matter for Pages: the live site is a **locally built static
`dist/`** pushed to `gh-pages`. There is no GitHub Actions build in the publish
path today.

## GitHub Pages (both hosts)

Both sites use **legacy Pages** from branch **`gh-pages`** (path `/`):

| Host | Pages URL | Source |
|------|-----------|--------|
| GHE | https://git.dev.box.net/pages/tmarchlewski/troubleshooting-task-data/ | `origin/gh-pages` |
| github.com | https://marchtom.github.io/troubleshooting-task-data/ | `public/gh-pages` |

GHE Pages may require Box login. Public Pages are anonymously reachable (used in
recruitment).

### Important: `main` ≠ live site

Updating `main` (push or merge) changes source only. **Candidates see the new UI
only after you build locally and push `gh-pages` to each remote.**

### Deploy Pages (static site)

Requires write access to `gh-pages` on the target remote(s). After `main` has the
desired UI changes:

1. Clean / merged tree with the intended code.
2. Build locally:

```bash
npm test && npm run build
```

3. Publish `dist/` to `gh-pages` on **both** remotes. Histories may have
   **diverged** — do **not** force-push unless the user explicitly allows it.
   Prefer a new commit on top of each remote’s `gh-pages`:

```bash
REPO_ROOT="$(pwd)"
npm test && npm run build

deploy_gh_pages() {
  local remote="$1"
  local wt
  wt="$(mktemp -d)"
  git fetch "$remote" gh-pages
  git worktree add "$wt" "$remote/gh-pages"
  (
    cd "$wt"
    git checkout -B gh-pages
    find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
    cp -R "$REPO_ROOT/dist/." .
    touch .nojekyll
    git add -A
    git status
    git commit -m "Deploy Pages." || echo "No Pages changes"
    git push "$remote" gh-pages
  )
  git worktree remove "$wt" --force
}

deploy_gh_pages origin
deploy_gh_pages public
```

4. Verify:
   - Public: https://marchtom.github.io/troubleshooting-task-data/ (hard-refresh)
   - GHE: `gh api repos/tmarchlewski/troubleshooting-task-data/pages --hostname git.dev.box.net`

Always include `.nojekyll` on `gh-pages` so GitHub/GHE does not run Jekyll.

## Publishing checklist

- [ ] Implement change; run `npm test` (and `npm run build` before Pages deploy)
- [ ] Commit only when the user requested a commit
- [ ] Land on `main` on **both** remotes (direct push if you have write, else
      branch + PR; owners mirror/merge the other side as needed)
- [ ] If UI/content changed: local build + push `gh-pages` to **both** remotes
- [ ] Confirm public Pages URL shows the update

## Do / don’t

- **Do** treat github.com (`public`) as the candidate-facing source.
- **Do** keep GHE (`origin`) in sync when publishing.
- **Do** redeploy static `gh-pages` after UI changes (local build, no Actions).
- **Don’t** push `main`/`gh-pages` without write access — use a PR.
- **Don’t** force-push `gh-pages` or `main` without explicit user approval.
- **Don’t** commit secrets, Box npm auth tokens, or `Improvements.pdf` (gitignored).
