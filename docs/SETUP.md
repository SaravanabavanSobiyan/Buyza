# Local setup

## Requirements

- Node.js 22 (see `.nvmrc`) and npm.
- MongoDB configured as a replica set. Local order transactions will not work
  against a standalone MongoDB server.

## API

```powershell
Set-Location .\server
Copy-Item .env.example .env
```

Edit `server/.env` with a local replica-set `MONGO_URI` and two different
random JWT secrets, each at least 32 characters. Keep this file untracked.
Then run:

```powershell
npm ci
npm run seed
npm run dev
```

The seed command requires `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at
least 12 characters. It has no default admin credentials.

## Client

In another PowerShell window:

```powershell
Set-Location .\client
Copy-Item .env.example .env
npm ci
npm run dev
```

Set `VITE_API_URL` if the API is not available at the Vite `/api` proxy. All
`VITE_` values are public and are included in the built JavaScript.

## Checks

From `server`:

```powershell
npm run lint
npm run test:ci
```

From `client`:

```powershell
npm run lint
npm test
npm run build
```

The server test command starts one in-memory MongoDB replica set and isolates
each suite in its own database.
