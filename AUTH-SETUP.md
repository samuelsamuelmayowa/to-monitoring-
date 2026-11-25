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

### Account database unavailable

The backend loads `to-backendapi-v1/.env` regardless of the launch directory.
Set `DATABASE_URL` to the MongoDB account database connection string, then restart
the backend. A `users.findOne()` buffering timeout means the database did not
connect; changing your password will not resolve it. For `mongodb+srv` URLs,
your network must resolve the cluster's DNS SRV records and reach MongoDB.
Check VPN/firewall/DNS settings and the Atlas project's IP access list when
connections fail. Authentication waits briefly for the database and returns
HTTP 503 with `Retry-After: 5` while it is unavailable; later requests retry
failed connections. Never put the database URL in frontend environment variables.

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
