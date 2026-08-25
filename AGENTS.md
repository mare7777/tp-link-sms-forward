# AGENTS.md

## Cursor Cloud specific instructions

This is a Node.js (ESM) project: a programmatic SMS bridge for TP-Link Archer/MR600 LTE
routers. There is no build step and no compiled output. Standard developer commands live in
`README.md` and `docs/operations.md`; prefer those instead of duplicating them here.

### Dependencies & lockfiles (non-obvious)
- The documented developer install is `npm install` (see `README.md` / `docs/operations.md`).
  Dependencies are refreshed automatically by the startup update script, so you normally do not
  need to run it by hand.
- The committed `yarn.lock` is a **Yarn Berry (v4)** lockfile that is used **only by the Docker
  build** (`Dockerfile`). Running `npm install` locally rewrites/normalizes that `yarn.lock` into
  npm's format and also creates a `package-lock.json`. **Do not commit either change** — the
  startup update script already restores `yarn.lock` and deletes `package-lock.json` so the tree
  stays clean. If you see `yarn.lock` modified or an untracked `package-lock.json`, that is the npm
  side effect; discard it.
- Installing with Yarn Berry locally is impractical: `.yarnrc.yml` contains an
  `approvedGitRepositories` setting that strict Yarn 4 rejects, and no yarn version is pinned
  (`package.json` has no `packageManager` field, and there is no `.yarn/releases`). Stick with npm
  for local development.

### Running the services
- The four entry points are listed in the `README.md` feature table: `api-bridge.mjs` (REST API),
  `sms-cat.mjs` (poller/forwarder), `smtp-gateway.mjs` (SMTP→SMS), and `sms-send.mjs` (CLI).
- Configuration comes from a gitignored `config.json` (create with
  `cp config.example.json config.json` and fill in the passwords) **or** from `CONFIG__*`
  environment variables (see `docs/configuration.md` and `docker-compose.yml`). Both `password`
  and at least one `api_users` entry are required or the process exits at startup.
- **Only `api-bridge` runs meaningfully without a physical router.** It starts, serves the
  unauthenticated `/healthz` health check and the Swagger UI at `/`, and performs Basic Auth,
  rate limiting, and request validation *before* contacting the router. `sms-cat`,
  `smtp-gateway`, and `sms-send.mjs` will fail or hang trying to reach the router URL
  (default `http://192.168.1.1`) unless a real or mock router is reachable.
- Quick end-to-end smoke test once `api-bridge` is running:
  `curl -s http://127.0.0.1:3000/healthz` (expect `"ok":true`), and an authenticated
  `POST /api/v1/sms/outbox` with an invalid `to` returns a `400` validation error, proving the
  full auth → validation path without a router.

### Checks / tests
- Lint and format checks are npm scripts (`npm run lint`, `npm run format:check`) — see
  `package.json`. Lint currently reports 2 pre-existing warnings (0 errors); `format:check`
  reports pre-existing style diffs. Neither is caused by environment setup.
- There is no unit/integration test framework. `node test-setup.mjs` is an environment/config
  checker (its console output is in Traditional Chinese), not a test suite.

### Known quirk
- The Swagger UI SMS/Monitoring sections render empty because the `@swagger` JSDoc blocks in
  `src/controllers/*.mjs` use a `path:` key that `swagger-jsdoc` does not parse into operations.
  This is pre-existing and cosmetic — the endpoints themselves work (verify with `curl`).
