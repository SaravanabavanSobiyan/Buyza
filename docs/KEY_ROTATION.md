# Secrets and key rotation

Store server credentials in the secret manager for each environment. Do not
commit real values, put secrets in `VITE_` variables, or paste them into issues
or chat. Development, staging, and production must use separate credentials.

| Variable                                      | Secret? | Rotate when                                       | Effect and steps                                                                                                                                                  |
| --------------------------------------------- | ------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JWT_ACCESS_SECRET`                           | Yes     | Exposure or planned security rotation             | Replace with a new random value of at least 32 characters and redeploy. Existing access tokens stop working immediately.                                          |
| `JWT_REFRESH_SECRET`                          | Yes     | Exposure or planned security rotation             | Replace independently and redeploy. Existing refresh sessions become invalid; customers must sign in again.                                                       |
| `MONGO_URI` credentials                       | Yes     | Exposure, staff change, or database policy change | Create a least-privilege database user for the shop database, update the hosting secret, deploy, verify health and read/write behavior, then revoke the old user. |
| `SMTP_PASS`                                   | Yes     | Provider rotation or suspected abuse              | Create a replacement SMTP/API credential, update the secret manager, send test messages, then revoke the old credential.                                          |
| `CLOUDINARY_API_SECRET`                       | Yes     | Exposure or provider rotation                     | Generate a replacement, update the server secret, verify uploads and deletes, then revoke the old key.                                                            |
| `RECAPTCHA_SECRET`                            | Yes     | Exposure or site-key replacement                  | Rotate with the provider, update the server secret and the matching public site key, then verify the form.                                                        |
| `GOOGLE_CLIENT_SECRET`, `FACEBOOK_APP_SECRET` | Yes     | Exposure or OAuth app change                      | Rotate at the provider, update the server secret, and test the full OAuth callback.                                                                               |
| `VITE_RECAPTCHA_SITE_KEY`, `VITE_SENTRY_DSN`  | No      | Provider/project change                           | These are public browser configuration; update the client build when changed. Never place the corresponding private key in the client.                            |

## Rotation procedure

1. Generate a unique credential in the provider and store it directly in the
   matching environment's secret manager.
2. Deploy to staging first. Verify login, database access, uploads, email, or
   OAuth as applicable.
3. Update production, deploy, and verify `/health` plus the affected feature.
4. Revoke the old credential only after the new one is confirmed working.
5. Record the date, owner, affected environments, and verification result in
   the organization's private operations log.

Rotate immediately after suspected exposure. For planned rotation, set an
interval with the provider and business owner; do not rotate a production key
without coordinating the required redeploy. Database users should have only
read/write access to the shop database, not cluster-administration privileges.

## Repository history

Treat any real credential ever committed as compromised, even if later deleted:
rotate it at the provider and invalidate affected sessions. The public `main`
branch was initialized as a clean root snapshot; review any local-only branches
before publishing them. Enable GitHub secret scanning and push protection in
repository security settings, and run a history-aware scanner before publishing
future branches.
