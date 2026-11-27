# Deployment and operations runbook

The approved staging direction is a Render API with a Vercel frontend, using
free tiers and no custom domain. Keep browser requests same-origin by proxying
`/api` through the Vercel frontend to Render; calling the Render hostname
directly would make the refresh cookie cross-site. This setup is for staging
only: free services can sleep, and the free database tier does not provide the
production backup guarantees required for go-live. Production budget, domain,
and database tier remain unapproved. Do not enable production HSTS or indexing
until HTTPS and the live domain are verified.

## Pre-deploy

- Provision separate staging and production services and secret sets.
- Use a paid, always-on API service in a region near Sri Lanka. Confirm current
  provider pricing and outbound-IP behavior before provisioning.
- Use MongoDB Atlas Flex or M10+ for production backups. Give the API a
  least-privilege database user, TLS, and the smallest practical network
  allowlist.
- Configure `NODE_ENV=production`, `MONGO_URI`, distinct 32+ character JWT
  secrets, `SITE_URL`, `CLIENT_URL`, `ALLOWED_ORIGINS`, and the correct
  `TRUST_PROXY_HOPS`. Set `ENABLE_HSTS=true` only after HTTPS is confirmed.
- Configure Cloudinary, SMTP, OAuth, and reCAPTCHA credentials only when those
  features are enabled. Verify sender-domain SPF, DKIM, and DMARC records.
- Build the client with `VITE_API_URL`, `VITE_SITE_URL`, and
  `VITE_ALLOW_INDEXING`. VITE variables are public and require a rebuild when
  changed.

## Deploy and verify

1. Deploy the API from `server` with `npm ci` and `npm start`.
2. Configure the platform health probe to `GET /health`; it returns success only
   after a MongoDB ping succeeds and does not expose database details.
3. Deploy the client with `npm ci` and `npm run build`. Configure SPA fallback
   rewrites to `index.html`, `/sitemap.xml` and `/robots.txt` to the API, and
   security/cache headers appropriate to the selected host.
4. Verify HTTPS, CORS, cookies, login/refresh/logout, a guest COD order, email
   delivery, uploads, sitemap, robots, and the CI status.
5. Keep one API instance until hosting, database, and worker behavior have been
   validated. Graceful shutdown stops accepting requests, stops the email
   scheduler, waits for an active worker tick, and closes MongoDB.

## Rollback

1. Record the current deployment and database migration/seed state.
2. Roll the API and client back to the last known-good commit using the host's
   deployment history.
3. Do not restore an older database snapshot over live orders without owner
   approval. If data recovery is needed, restore to a temporary cluster first.
4. Verify `/health`, a read-only catalog request, and the order flow after
   rollback; notify the owner and record the incident.

## Backups and restore

- Enable Atlas automated backups on the selected paid tier.
- Schedule a weekly `mongodump` copy in storage outside Atlas with restricted
  access and retention.
- Restore a recent backup into a temporary cluster before launch and
  periodically thereafter. Compare product, user, and order counts, verify
  representative records, and record restore duration.
- Keep backup credentials separate from the API database user.

## Incident checks

- If `/health` fails, inspect API logs and Atlas connectivity/availability.
- If login fails, check environment configuration, secret changes, cookies,
  CORS origins, and proxy-hop configuration without logging secret values.
- Request handling rejects MongoDB operators, dotted keys, and prototype keys
  before route handlers; input schemas keep database filters application-owned.
  Do not enable global Mongoose `sanitizeFilter` without reworking trusted
  query operators and rerunning the full suite.
- If emails fail, check the outbox state, SMTP provider status, sender-domain
  authentication, and provider credentials.
- If uploads fail, check Cloudinary credentials, provider status, and upload
  limits.
- Rotate exposed credentials immediately and invalidate JWT sessions when
  either JWT secret is changed.

Keep the provider dashboard, deployment URLs, DNS records, secret locations,
on-call contact, and rollback commit in the private operations record.
