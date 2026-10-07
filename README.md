# AI Interview Platform (Production-Ready MERN + Gemini AI)

A full-stack MERN (MongoDB, Express.js, React.js, Node.js) application integrated with **Google Gemini 2.5 Flash**. It combines a general-purpose AI technical assistant with a full **AI mock interview system** — resume + job description in, personalized questions, live evaluation, and a final performance report out — plus the security, testing, and deployment scaffolding expected of a production deliverable.

---

## 1. Feature Overview

### Core platform
- Cookie-based authentication (register/login/me) with bcrypt password hashing, short-lived access tokens, and rotating/revocable refresh tokens (see §11)
- **Forgot / reset password** flow (time-limited, hashed reset tokens; emails are sent via SMTP if configured, or logged via the server logger for local/demo use)
- Profile management (update name/email, change password with current-password verification)
- Global Express error handling with structured, centralized logging

### AI Assistant + History
- Prompt-based AI assistant across categories (Interview Prep, Code Review, Technical Q&A, Career Advice, System Design)
- Responses render as **Markdown** (headings, lists, tables, code blocks) instead of raw text
- Persisted, searchable, filterable prompt history

### AI Mock Interview System
- Generate a personalized interview (5/10/15 questions, Technical/HR/Mixed, Easy/Medium/Hard) from a resume + job description
- **Resume upload**: paste text, or upload a PDF / DOCX / TXT file — the server extracts the text for you
- Chat-style mock interview with **voice input** (Web Speech API — click the mic and speak your answer) alongside typing
- Per-answer AI evaluation (score, what went well, what was missing, how to improve, sample answer) with adaptive follow-up questions
- Final AI-generated performance report: overall/technical/communication/relevance scores, strengths, weaknesses, missing concepts, recommended topics, and a personalized improvement plan
- Interview history is paginated (`?page`, `?limit`, capped at 50/page) rather than returned in full every time

### Production hardening
- **Security**: Helmet security headers, rate limiting (tighter limits on auth, password reset, and AI-backed endpoints), server-side input validation (`express-validator`) on every route, a NoSQL-injection sanitizer, an explicit CORS origin allowlist, and httpOnly/secure/SameSite auth cookies (no tokens in `localStorage`)
- **Resilience**: Gemini API calls are timeout-bounded and retried with exponential backoff on transient failures; Mongo connection attempts fail fast instead of hanging
- **Observability**: structured JSON logging (pino), a liveness probe (`/healthz`) and a readiness probe (`/readyz`) that checks the DB connection
- **Operability**: graceful shutdown on `SIGTERM`/`SIGINT` (drains in-flight requests before closing the DB connection), fail-fast startup validation of required env vars
- **Testing**: Jest + Supertest on the backend (auth, interviews, AI, resume parsing), Vitest + React Testing Library on the frontend
- **Deployment**: Dockerfiles for both services, an nginx-served frontend, `docker-compose.yml` wiring Mongo + API + client together (with healthchecks and required, non-defaulted secrets), and a GitHub Actions CI pipeline

---

## 2. Technologies Used
- **Frontend**: React 19, Vite, React Router 7, Axios, `react-markdown` + `remark-gfm`, Lucide icons, Vitest, React Testing Library
- **Backend**: Node.js, Express 5, Mongoose, JWT (short-lived access tokens), rotating opaque refresh tokens, bcryptjs, Helmet, express-rate-limit, express-validator, cookie-parser, compression, pino/pino-http, multer, pdf-parse, mammoth, nodemailer, Jest, Supertest
- **Database**: MongoDB
- **AI Integration**: `@google/genai` (Gemini 2.5 Flash)
- **Infra**: Docker, docker-compose, nginx, GitHub Actions

---

## 3. Architecture

```text
┌─────────────────────────┐         HTTP/REST         ┌─────────────────────────┐
│     React + Vite        │  ◄─────────────────────►  │     Node + Express      │
│     Frontend UI         │   Authorization: Bearer   │       Backend API       │
│  (nginx in production)  │                           │  helmet / rate-limit /  │
└─────────────────────────┘                           │  validation middleware  │
                                                        └────────────┬────────────┘
                                                                     │
                                             ┌───────────────────────┴───────────────────────┐
                                             │                                               │
                                             ▼                                               ▼
                                 ┌───────────────────────┐                       ┌───────────────────────┐
                                 │  Google Gemini API    │                       │   MongoDB Database    │
                                 │  (AI Generation)      │                       │  (Users & Interviews) │
                                 └───────────────────────┘                       └───────────────────────┘
```

---

## 4. Folder Structure

```text
ai-interview-platform/
├── docker-compose.yml              # Orchestrates mongo + server + client
├── .github/workflows/ci.yml        # Lint / test / build on push & PR
├── .env.example
├── README.md
│
├── server/                         # Node.js + Express backend
│   ├── config/                     # DB connection (fail-fast timeout)
│   ├── controllers/                # auth, user, ai, history, interview, resume
│   ├── middleware/                 # auth, rateLimiter, validators, sanitizeRequest,
│   │                                # uploadResume, errorHandler
│   ├── models/                     # User, RefreshToken, AIHistory, Interview
│   ├── routes/
│   ├── services/                   # Gemini AI integration (timeout + retry/backoff)
│   ├── utils/                      # tokenUtils, logger, validateEnv, sendEmail
│   ├── tests/                      # Jest + Supertest suite
│   ├── Dockerfile
│   └── package.json
│
└── client/                         # React + Vite frontend
    ├── src/
    │   ├── components/             # Navbar, Sidebar, MarkdownRenderer,
    │   │                            # VoiceInputButton, modals, etc.
    │   ├── context/                # AuthContext (cookie-based session)
    │   ├── pages/                  # Home, Login, Register, Forgot/Reset Password,
    │   │                            # Dashboard, AI Assistant, History, Profile,
    │   │                            # Interview Prep / Detail / Mock / Report, 404
    │   ├── services/                # Axios API clients (withCredentials + auto-refresh)
    │   └── test/                    # Vitest setup
    ├── Dockerfile
    ├── nginx.conf
    └── package.json
```

---

## 5. Prerequisites
- Node.js v18+ and npm v9+ (or Docker, see §9)
- MongoDB (local or Atlas)
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/)

---

## 6. Local Installation

```bash
cd ai-interview-platform

# Backend
cd server && npm install && cd ..

# Frontend
cd client && npm install && cd ..
```

Copy `server/.env.example` to `server/.env` and fill in your values (see §7).

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Frontend: `http://localhost:5173` · Backend: `http://localhost:5000`

---

## 7. Environment Variables (`server/.env`)

```env
# --- Core ---
MONGODB_URI=mongodb://localhost:27017/ai_mern_app
# Must be a long, random, secret string in production (32+ chars) —
# the server refuses to start in production with a shorter one.
# Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=your_super_secret_jwt_key_here
GEMINI_API_KEY=your_google_gemini_api_key_here
PORT=5000
NODE_ENV=development

# --- Auth token lifetimes ---
ACCESS_TOKEN_TTL=15m   # short-lived JWT stored in an httpOnly cookie

# --- Gemini call resilience ---
GEMINI_TIMEOUT_MS=20000
GEMINI_MAX_RETRIES=2

# --- Mongo connection resilience ---
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000

# --- CORS ---
# Comma-separated list of origins allowed to call this API
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# --- Used to build links inside emails (e.g. password reset) ---
CLIENT_URL=http://localhost:5173

# --- Optional — if left blank, password-reset emails are logged
# instead of sent, so the flow still works without SMTP. ---
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="AI Interview Platform <no-reply@example.com>"

# --- Logging ---
LOG_LEVEL=info

# --- Docker Compose only ---
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=change_this_to_a_long_random_value
```

---

## 8. Running Tests

```bash
# Backend (Jest + Supertest, no live DB required — models are mocked)
# Covers: auth (register/login/refresh/logout/logout-all/reset-password),
# interviews (create/answer/follow-up/complete/delete/stats/pagination),
# the AI assistant endpoint, and resume parsing (txt/docx, size/type limits).
cd server && npm test

# Frontend (Vitest + React Testing Library)
# Covers: AuthContext session lifecycle, Markdown rendering, voice input,
# score-formatting utilities.
cd client && npm test
```

---

## 9. Running with Docker

```bash
# From the repo root
export JWT_SECRET=some_long_random_secret_at_least_32_chars
export GEMINI_API_KEY=your_google_gemini_api_key_here
export MONGO_ROOT_USER=admin
export MONGO_ROOT_PASSWORD=some_other_long_random_secret
docker compose up --build
```

This starts three containers, each with a healthcheck:
- `mongo` — MongoDB 7, authenticated (root user/pass required), data persisted in a named volume
- `server` — the API on port `5000`, healthcheck against `/healthz`
- `client` — the built frontend served by nginx on port `8080`, which proxies `/api/*` to `server`

`docker compose up` will refuse to start if `JWT_SECRET`, `GEMINI_API_KEY`, `MONGO_ROOT_USER`, or `MONGO_ROOT_PASSWORD` aren't set — there are no insecure defaults.

Visit `http://localhost:8080`.

CI runs the same install → lint → test → build steps on every push/PR via `.github/workflows/ci.yml`.

---

## 10. REST API Reference

### Health (unauthenticated)
- `GET /healthz` — liveness probe (process is up)
- `GET /readyz` — readiness probe (process up **and** DB reachable)

### Auth (`/api/auth`)
- `POST /register` — `{ name, email, password }` → sets httpOnly auth cookies
- `POST /login` — `{ email, password }` → sets httpOnly auth cookies
- `POST /refresh` — rotates the refresh token cookie for a new access+refresh pair
- `POST /logout` — ends the current session only
- `POST /logout-all` — ends every session for this account (protected)
- `GET /me` — current user (protected)
- `POST /forgot-password` — `{ email }` → sends/logs a reset link
- `PUT /reset-password/:token` — `{ password }` → also revokes all existing sessions

### Users (`/api/users`)
- `GET /profile` (protected)
- `PUT /profile` — `{ name?, email?, currentPassword?, newPassword? }` (protected)

### AI Assistant (`/api/ai`)
- `POST /generate` — `{ prompt, category }` (protected, rate-limited)

### History (`/api/history`)
- `GET /` — query params `category`, `search` (protected)
- `DELETE /:id` (protected)
- `DELETE /` — clear all (protected)

### Interviews (`/api/interviews`) — all protected
- `POST /parse-resume` — multipart file upload (`resume` field, PDF/DOCX/TXT) → extracted text
- `POST /` — `{ resumeText, jobDescription, targetRole?, interviewType?, difficulty?, questionCount? }`
- `GET /` — list sessions, paginated (`?page`, `?limit`, max 50/page)
- `GET /stats` — dashboard aggregates
- `GET /:id`
- `POST /:id/answer` — `{ answer }`
- `POST /:id/complete` — generates the final report
- `DELETE /:id`

---

## 11. Authentication Flow

Auth tokens live entirely in **httpOnly cookies** — JavaScript on the page (and therefore any XSS payload) can never read them, unlike a token stored in `localStorage`.

1. On register/login, the server issues two cookies:
   - `accessToken` — a short-lived JWT (`ACCESS_TOKEN_TTL`, default 15 minutes), scoped to `/`.
   - `refreshToken` — a long-lived (30-day), opaque, single-use random string, scoped only to `/api/auth/refresh`. Its SHA-256 hash — never the raw value — is stored server-side in the `RefreshToken` collection, which is what makes it revocable.
2. The client (`client/src/services/api.js`) sends every request with `withCredentials: true`; the browser attaches the cookies automatically. There is no token in JS to attach manually.
3. When an `accessToken` expires, the next request gets a `401`. An Axios response interceptor catches this, calls `POST /api/auth/refresh` once, and — if that succeeds — retries the original request transparently. The user never sees this happen.
4. `POST /api/auth/refresh` **rotates** the refresh token: the old one is marked revoked and a brand-new one is issued. If an already-revoked (i.e. reused/stolen) refresh token is presented, the refresh is rejected outright.
5. `AuthContext` establishes session state on load with a single `GET /api/auth/me` call (which benefits from the same silent-refresh behavior above).
6. `POST /api/auth/logout` revokes just the current device's refresh token. `POST /api/auth/logout-all` bumps the user's `tokenVersion`, which instantly invalidates **every** outstanding access token (even ones that haven't expired yet) and revokes all refresh tokens — a full "log out everywhere."
7. A password reset does the same `tokenVersion` bump + full refresh-token revocation automatically, so a compromised password can't leave old sessions alive.
8. Forgotten passwords use a separate, short-lived (15-minute), single-use, hashed reset token — never the JWT.

---

## 12. Common Errors and Solutions
- **Server refuses to start / exits immediately in production**: check the startup log for a "Refusing to start" message — this means `MONGODB_URI` or `JWT_SECRET` is missing, or `JWT_SECRET` is under 32 characters. This is intentional fail-fast behavior, not a bug.
- **MongoDB connection failure**: check `MONGODB_URI` credentials/IP allowlist (Atlas). The server will fail fast (`MONGO_SERVER_SELECTION_TIMEOUT_MS`, default 5s) rather than hanging.
- **Gemini API error / empty response**: verify `GEMINI_API_KEY` is valid and has quota. Transient failures are retried automatically (`GEMINI_MAX_RETRIES`) before surfacing an error.
- **401 Unauthorized right after logging in on a different origin**: in production, auth cookies require HTTPS (`secure: true`) and `sameSite: none` for cross-origin setups — make sure the client is served over HTTPS and `ALLOWED_ORIGINS` matches exactly.
- **401 after being logged in for a while**: the access token (15 min) expired and the automatic refresh failed — usually because the refresh token (30 days) also expired, or a "log out everywhere" was triggered elsewhere. Log in again.
- **CORS blocked**: add your frontend origin to `ALLOWED_ORIGINS` in `server/.env`.
- **"No text extracted" on resume upload**: the file is likely a scanned/image-only PDF with no selectable text — paste the resume text instead.
- **Voice input button doesn't appear**: the Web Speech API is currently Chrome/Edge only; the button simply doesn't render in unsupported browsers (Firefox/Safari) and typing still works.

---

## 13. Possible Future Improvements
- Multi-turn conversational chat threads for the AI Assistant
- PDF export of interview reports
- Admin dashboard / usage analytics
- Per-user AI usage quotas/cost tracking beyond the hourly rate limiter
- Email verification on registration
