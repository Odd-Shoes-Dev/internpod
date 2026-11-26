# InternPod — Blue Ox Jobs

A platform that matches interns with startups as "pods". Startups browse intern profiles and select candidates; interns sign up and manage their profiles. Admins oversee all listings and selections.

**Target regions:** EU · US · Gulf

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / JS (no framework) |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | PostgreSQL via [Neon](https://neon.tech) |
| Auth | [Clerk](https://clerk.com) (Google OAuth + email verification code, no password) |
| Deployment | Vercel |

---

## Project Structure

```
/                        — Landing page (index.html)
/admin/                  — Admin dashboard
/interns/                — Public intern listings (for startups to browse)
/hiring/                 — Hiring page
/profile/                — Intern/startup profile management
/sso-callback/           — Completes the Google OAuth redirect (Clerk handleRedirectCallback)
/api/                    — Vercel serverless API routes
  auth/sync              — POST: syncs Clerk user to database, assigns role
  profile/               — GET: returns current user's profile + role data
  interns/               — GET all interns, GET/PUT individual intern
  startup-profile/       — GET/POST/PUT startup company profile
  pod-selections/        — GET/POST/DELETE intern selections by startups
  admin/                 — Admin-only CRUD for interns, startups, selections
  _lib/auth.js           — Clerk token verification middleware
  _lib/db.js             — Neon PostgreSQL connection pool
/neon/                   — Database setup SQL files (run once)
/public/auth-widget.js   — Shared sign-in/sign-up modal (Google + email code), used by every page
/public/config.js        — Runtime config (generated, not committed)
```

---

## User Roles

| Role | Can do |
|---|---|
| **intern** | Sign up, claim their seeded profile, edit their profile |
| **startup** | Browse interns, select up to a pod of interns |
| **admin** | View and manage all interns, startups, and pod selections |

Role is assigned at `/api/auth/sync` on first sign-in and stored in the `profiles` table.

---

## Database Tables

| Table | Purpose |
|---|---|
| `profiles` | One row per user — stores role (intern/startup/admin) |
| `interns` | Intern profiles (skills, location, availability, links) |
| `startup_profiles` | Company info, team size, roles needed |
| `pod_selections` | Which startup selected which interns (one intern per pod) |

---

## Setting Up Locally

### 1. Prerequisites
- Node.js 18+
- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
- A [Clerk](https://clerk.com) account with a test application
- A [Neon](https://neon.tech) database

### 2. Clone and install

```bash
git clone https://github.com/Odd-Shoes-Dev/internpod.git
cd internpod
npm install
```

### 3. Set up the database

In the Neon SQL editor, run these files **in order**:

```
neon/01_schema.sql   — creates all tables
neon/02_seed.sql     — inserts the initial intern records
neon/03_rls.sql      — optional: Row Level Security (skip if using API-level auth)
```

### 4. Configure environment variables

Create a `.env.local` file in the project root:

```env
# Clerk — test credentials from https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
CLERK_FRONTEND_API_URL=https://your-instance.clerk.accounts.dev

# Neon — connection string from https://console.neon.tech
NEON_DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

> **Important:** Use test credentials (`pk_test_` / `sk_test_`) locally. Never use live credentials during development — the frontend and backend must use keys from the same Clerk environment or tokens will be rejected with 401.

### 5. Run locally

```bash
vercel dev
```

The app will be available at `http://localhost:3000`.

> `npm run dev` does not work — this project is a Vercel app and requires the Vercel CLI dev server to run the serverless API functions.

---

## Testing the App

### Auth flow

1. Open `http://localhost:3000`
2. Click **Login** — the shared sign-in widget (`public/auth-widget.js`) opens on top of the current page
3. Choose **Continue with Google** (redirects to Google, then back via `/sso-callback`) or enter an email address to receive a one-time verification code — the same code step handles both signing in to an existing account and creating a new one, since passwords are disabled
4. On first sign-in, the app calls `POST /api/auth/sync` with `{ role, email }` to register the user
5. Role is stored in `profiles` table

### As an intern

- Sign in and choose role `intern`
- If your email matches a seeded intern row, it will be auto-claimed
- Otherwise a new empty intern row is created
- Visit `/profile/` to edit your profile

### As a startup

- Sign in and choose role `startup`
- Visit `/profile/` to create your company profile
- Visit `/interns/` to browse and select interns
- Selections are saved via `POST /api/pod-selections/`

### As an admin

- Sign in with an account that has `role = 'admin'` in the `profiles` table
- Set this manually in the database: `UPDATE profiles SET role = 'admin' WHERE id = 'your_clerk_user_id';`
- Visit `/admin/` to manage all interns, startups, and selections

### Testing API endpoints directly

All API routes require a Bearer token from Clerk. Get one in the browser console after signing in:

```js
const token = await window.Clerk.session.getToken()
console.log(token)
```

Then use it with any API tool (e.g. Postman, curl):

**bash / Git Bash / WSL:**
```bash
curl http://localhost:3000/api/interns \
  -H "Authorization: Bearer <token>"
```

**PowerShell (Windows):**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/interns" `
  -Headers @{ Authorization = "Bearer <token>" }
```

---

## Deployment (Vercel)

1. Push to the `dev` branch
2. In Vercel project settings → **Environment Variables**, add:
   - `CLERK_SECRET_KEY` (use `sk_live_` for production)
   - `NEON_DATABASE_URL` (production database)
3. The frontend HTML files currently have the production Clerk publishable key (`pk_live_`) hardcoded — this will be replaced with dynamic config in a future update

---

## Known Issues

- The 5 frontend HTML pages (`index.html`, `admin/`, `interns/`, `profile/`, `hiring/`) have the **production Clerk publishable key hardcoded**. Locally, this causes a token mismatch (frontend authenticates against live Clerk, backend verifies against test Clerk). Workaround: temporarily swap the key in the HTML files when testing locally, or run against production credentials.
- `public/config.js` still contains leftover Supabase credentials from a previous migration — these are unused and safe to ignore.
