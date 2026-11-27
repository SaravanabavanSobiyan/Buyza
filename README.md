# MERN E-commerce

- `/server` Node + Express + MongoDB (Mongoose)
- `/client` React + Vite + Tailwind + Redux Toolkit + React Query

## Run locally (Windows PowerShell)

Run the server commands from the `server` directory. PowerShell versions before 7
do not support `&&`, so run each command separately:

```powershell
Set-Location .\server
Copy-Item .env.example .env       # replace local placeholders with private values
npm ci
npm run seed
npm run dev
```

If the catalog is already seeded and you only need to add or refresh delivery
methods, run `npm run seed:shipping` instead. This command does not reset catalog
or account data.

In a second PowerShell window, run the client commands from the `client` directory:

```powershell
Set-Location .\client
Copy-Item .env.example .env
npm ci
npm run dev
```

On PowerShell 7 or newer, `&&` is supported, but the commands must still be run
from their respective directories.
Server: http://localhost:5000/api/health | Client: http://localhost:5173

### Local MongoDB transactions (Windows)

Order placement and cancellation use MongoDB transactions. For a local
MongoDB Windows service, configure its `mongod.cfg` with:

```yaml
replication:
  replSetName: rs0
```

Restart the MongoDB service from an Administrator PowerShell, then initialize
the single-node replica set once with `mongosh`:

```powershell
Restart-Service MongoDB
mongosh "mongodb://127.0.0.1:27017/admin" --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
```

For a local database, set `MONGO_URI` in `server/.env` to
`mongodb://127.0.0.1:27017/mern_ecommerce?replicaSet=rs0`. MongoDB Atlas
connections already use replica sets and can keep their provided connection
string.

## Product image uploads

In development, product images are stored under `server/uploads` and served by
the API, so adding products works without a third-party image service. This
directory is ignored by Git.

For production, configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET` in the server environment. Production uploads require
Cloudinary because local server files may not persist across deployments.

## Money representation

Product prices are stored as integer minor currency units, not floating-point decimals.
For example, `12900` represents 12,900 minor units (such as cents or paise, depending
on the store currency). Keep this convention for cart totals, orders, and payments.

## Checkout quote API

`POST /api/checkout/quote` returns a stateless quote with live cart prices, stock
problems, active Sri Lankan shipping options, delivery date estimates, and totals.
Guests send `email`, `address`, and `items` (`productId`, `variantSku`, `quantity`).
Authenticated customers use their saved cart and send either an inline `address`
or their owned `addressId`; they may also select a `shippingMethodId`.

Seeded shipping prices and the Standard free-shipping threshold are stored in
`server/scripts/seed.js` and can be safely refreshed with
`server/scripts/seed-shipping-methods.js`. Amounts use the same integer minor-unit
representation as product and cart prices. A quote is not persisted and must not
be reused to place an order.

`POST /api/orders` places an order using the selected shipping method and
Cash on Delivery (`paymentMethod: "cod"`). Guests submit `email`, `address`,
and `items`; signed-in customers use their saved cart and may submit an owned
`addressId`. Send an `Idempotency-Key` header to make retries safe. The endpoint
re-prices inside a MongoDB transaction, reserves current stock, snapshots order
details, and clears the signed-in cart. MongoDB must run as a replica set to
support transactions, including during local development.

Buy now requests set `buyNow: true` and submit exactly one item. This quotes and
places an order for only that item without adding it to, or clearing, the
customer's existing cart.

Before running the seed script, set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD`
of at least 12 characters in your local server environment. The seed script
refuses to run without them and has no default admin credentials.

## Branching

`main` (production) <- `develop` (integration) <- `feature/*`

## Architecture

- `client/src/pages` contains route-level pages; `client/src/components` contains
  shared storefront and admin UI.
- `client/src/api` contains HTTP clients; `client/src/store` contains Redux state.
- `server/src/routes` defines API endpoints, `controllers` handles HTTP, and
  `services` contains business logic.
- `server/src/models` contains Mongoose models; `validators` contains Zod input
  schemas; `jobs` starts background workers.
- Orders and cancellations use MongoDB transactions, so local MongoDB must run
  as a replica set. The test suite uses an in-memory replica set.

## Environment configuration

Copy the example files and keep real values out of Git:

| Variable                                               | Where            | Purpose                                                          |
| ------------------------------------------------------ | ---------------- | ---------------------------------------------------------------- |
| `PORT`                                                 | Server           | HTTP port (defaults to the configured app port)                  |
| `MONGO_URI`                                            | Server           | MongoDB replica-set connection string                            |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`              | Server           | Separate random secrets, at least 32 characters each             |
| `JWT_ACCESS_EXPIRES`                                   | Server           | Access-token lifetime                                            |
| `CLIENT_URL`, `ALLOWED_ORIGINS`                        | Server           | Frontend URL and exact comma-separated CORS origins              |
| `TRUST_PROXY_HOPS`                                     | Server           | Number of trusted reverse-proxy hops; set for the selected host  |
| `ENABLE_HSTS`                                          | Server           | Turn on only after production HTTPS is verified                  |
| `API_URL`, `SITE_URL`, `ALLOW_INDEXING`                | Server           | Public API/canonical site URLs and server-side indexing behavior |
| `SMTP_*`, `EMAIL_FROM`                                 | Server           | Transactional email provider settings                            |
| `STORE_NAME`                                           | Server           | Store name used in messages                                      |
| `CLOUDINARY_*`                                         | Server           | Production image storage credentials                             |
| `RECAPTCHA_SECRET`                                     | Server           | Private reCAPTCHA verification key                               |
| `GOOGLE_*`, `FACEBOOK_*`                               | Server           | Optional OAuth credentials                                       |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`                        | Server seed only | Initial admin; no default credential is provided                 |
| `VITE_API_URL`, `VITE_SITE_URL`, `VITE_ALLOW_INDEXING` | Client           | Public API/canonical site URLs and client indexing behavior      |
| `VITE_RECAPTCHA_SITE_KEY`                              | Client           | Public reCAPTCHA site key (not a secret)                         |
| `VITE_SENTRY_DSN`                                      | Client           | Optional public Sentry DSN                                       |

Production startup requires a MongoDB URI, strong JWT secrets, an HTTPS site URL,
an explicit origin allowlist, and `TRUST_PROXY_HOPS`. Configure production values
in the hosting provider's secret manager, not in `.env` files.

## Scripts

| Package | Command                 | Purpose                                               |
| ------- | ----------------------- | ----------------------------------------------------- |
| Server  | `npm run dev`           | Start the API with Nodemon                            |
| Server  | `npm start`             | Start the production API                              |
| Server  | `npm run lint`          | Lint server code                                      |
| Server  | `npm test`              | Run server tests                                      |
| Server  | `npm run test:ci`       | Run serial server tests with coverage thresholds      |
| Server  | `npm run test:watch`    | Run Jest in watch mode                                |
| Server  | `npm run seed`          | Seed catalog and require an explicit admin credential |
| Server  | `npm run seed:shipping` | Add or refresh shipping methods                       |
| Client  | `npm run dev`           | Start Vite development server                         |
| Client  | `npm run build`         | Create the production client bundle                   |
| Client  | `npm run preview`       | Preview the production bundle locally                 |
| Client  | `npm test`              | Run Vitest                                            |
| Client  | `npm run lint`          | Lint client code                                      |

## Project guides

- [Local setup](docs/SETUP.md)
- [OpenAPI reference](docs/openapi.yaml)
- [Admin guide](docs/ADMIN_GUIDE.md)
- [Key rotation](docs/KEY_ROTATION.md)
- [Deployment and operations runbook](docs/RUNBOOK.md)
- [Staging UAT checklist](docs/UAT_CHECKLIST.md)

Hosting, domain, email-provider, and production database choices are not yet
configured. Do not treat this repository as live until staging UAT, backup
restore, owner approval, and the go-live checklist are complete.
