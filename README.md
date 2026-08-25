# troubleshooting-task-data

Recruitment interview console: a synthetic observability dashboard for incident triage exercises.

**Candidate-facing site (public):** https://marchtom.github.io/troubleshooting-task-data/

## For maintainers and agents

Dual remotes (Box GHE + github.com), PR vs direct-push rules, and GitHub Pages deploy steps are documented in:

- [`AGENTS.md`](AGENTS.md)
- [`.cursor/skills/recruitment-task-ops/SKILL.md`](.cursor/skills/recruitment-task-ops/SKILL.md)

## Local development

This is a React + Vite app. No environment variables or `.env` file are required.

```bash
npm install
npm run dev
```

Vite serves the app at **http://localhost:5173/** (default). Open that URL in a browser.

Other scripts:

| Command | What it does |
|---------|----------------|
| `npm test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run build` | Typecheck and build static files into `dist/` |
| `npm run preview` | Serve the production `dist/` locally |
| `npm run lint` | Typecheck only (`tsc -b`) |

Scenario and dashboard content live under `src/` (views, `src/data/`, etc.).
