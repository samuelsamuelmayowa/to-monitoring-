# Authentication setup

Monitoring uses the existing T.O. Analytics accounts in `to-backendapi-v1`.
Email/password uses `/api/login` and `/api/sighup` (the backend's existing spelling).
Google uses the same Firebase project as Analytics and sends its ID token to
`/api/google`. Backend HttpOnly cookies are the website session; no website
session tokens are stored in localStorage. `/api/session` verifies the session
after sign-in and on reload. Writes send the backend-issued CSRF token.

## Local development

Start the backend on port 8000, then run `npm run dev` in this project.
Open `http://localhost:5173`. Vite proxies `/api` to the backend. If necessary,
set `LOCAL_API_URL` in `.env.local` to a different backend URL. Use a local
backend with development cookie settings for HTTP localhost.
Port 5173 is strict because it is already in the backend's trusted origins.
Stop another app using that port before starting Monitoring.

## Production

`vercel.json` forwards `/api` to the same Render backend configured by Analytics
and sends client routes to index.html. Confirm this backend URL when deploying.
Add the exact Monitoring origin (including https) to the backend's comma-separated
`FRONTEND_ORIGINS` environment variable, preserving existing entries.
Add the Monitoring hostname to Firebase Authentication > Settings > Authorized
domains in project `to-backend-50da6`. Google must be enabled as a sign-in provider.
Deploy the backend login fix alongside this frontend.
Other hosting platforms need equivalent same-origin API and SPA routing rules.

## Verification

Run `npm run build`, `npm run lint`, and `node --test tests/authApi.test.js`.
With the backend running, verify password login, signup with a new account,
Google sign-in, refresh on `/workspace`, logout, and unauthenticated workspace
redirects. Signup creates an account only when submitted. No test here creates,
deletes, or modifies real user records.

The workspace is an authenticated entry page. Monitoring project storage and
telemetry integrations are separate work; future data endpoints must enforce
authorization in the backend.
