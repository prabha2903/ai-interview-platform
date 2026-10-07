# Production-Readiness Changes

This is your original project with the gaps from the earlier review fixed. Run `npm install` in both `server/` and `client/` after unzipping — `node_modules` was excluded from this archive.

## 1. Auth token security
- **New:** `server/models/RefreshToken.js` — opaque, hashed, revocable refresh tokens (not JWTs, so a DB leak can't be used to log in as anyone).
- **New:** `server/utils/tokenUtils.js` — issues short-lived (15 min) access JWTs + rotating refresh tokens; cookie helpers.
- **Changed:** `User` model gained a `tokenVersion` field for instant "log out everywhere."
- **Changed:** `authController.js`, `middleware/auth.js`, `routes/authRoutes.js` — auth now lives in `httpOnly`/`Secure`/`SameSite` cookies, not the JSON body. Added `POST /api/auth/refresh`, `/logout`, `/logout-all`.
- **Changed (client):** `api.js`, `authService.js`, `AuthContext.jsx` — no more `localStorage` token; axios sends cookies automatically and silently refreshes on a 401.

## 2. Docker/infra hardening
- `docker-compose.yml` — Mongo now requires `MONGO_ROOT_USER`/`MONGO_ROOT_PASSWORD` (compose refuses to start without them), healthchecks on all 3 services, proper startup ordering.
- Removed the insecure `JWT_SECRET` fallback.

## 3. Operational readiness
- **New:** `server/utils/logger.js` (pino) — structured JSON logs in production, pretty-printed in dev.
- **New:** `server/utils/validateEnv.js` — fails fast at boot if `MONGODB_URI`/`JWT_SECRET` are missing, or `JWT_SECRET` is too short in production.
- `server.js` — added `/healthz` (liveness) and `/readyz` (readiness, checks DB) endpoints, graceful shutdown on `SIGTERM`/`SIGINT`, `compression`, `cookie-parser`.
- `errorHandler.js` now logs every error centrally with request context.

## 4. AI service robustness
- `geminiService.js` — every Gemini call (SDK + REST fallback) now has a hard timeout (`GEMINI_TIMEOUT_MS`, default 20s) and retries transient failures with exponential backoff (`GEMINI_MAX_RETRIES`, default 2).

## 5. Test coverage
- **New:** `server/tests/interviewController.test.js` (20 tests) — creation, ownership checks, answer/follow-up flow, completion, deletion, stats.
- **New:** `server/tests/aiController.test.js` (5 tests) — validation, success path, upstream-failure handling.
- **New:** `server/tests/resumeController.test.js` (7 tests) — PDF/DOCX/TXT parsing, unsupported types, oversized files, truncation.
- **New:** `client/src/context/AuthContext.test.jsx` (7 tests) — session bootstrap, login/register/logout/logout-everywhere, error handling.
- **Rewrote:** `server/tests/authRoutes.test.js` to match the new cookie/refresh-token flow.
- All 56 server tests and 21 client tests pass (`npm test` in each folder).

## 6. Misc
- `GET /api/interviews` is now paginated (`?page`, `?limit`, capped at 50) instead of returning the full history every time.

## New environment variables (see `.env.example`)
```
ACCESS_TOKEN_TTL=15m
GEMINI_TIMEOUT_MS=20000
GEMINI_MAX_RETRIES=2
LOG_LEVEL=info
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=<generate a long random value>
```

## Not covered in this pass
- The client's interview-history page (`interviewService.js`/UI) doesn't yet consume the new pagination params — the API supports it, the frontend still fetches page 1 implicitly.
- No CI pipeline (e.g. GitHub Actions) wired up to run these tests automatically on push.
- No error-tracking service (Sentry etc.) integrated — logs go to stdout only.
