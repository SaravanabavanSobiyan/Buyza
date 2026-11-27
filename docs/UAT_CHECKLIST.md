# Staging UAT checklist

Run this checklist on a staging deployment with production-like configuration
and test data only. Record the build/commit, browser/device, tester, date, and
result. Do not use real customer data or real payment credentials.

## Environment and access

- [ ] HTTPS certificate and canonical host are correct; HTTP redirects to HTTPS.
- [ ] `/health` reports healthy only when the database is reachable.
- [ ] CORS permits only configured storefront origins; credentialed cookies work.
- [ ] Customer, staff, manager, and admin permissions match the role matrix.
- [ ] Blocked users cannot authenticate; unblocking restores access.
- [ ] Admin routes reject unauthenticated and insufficiently privileged users.

## Storefront and checkout

- [ ] Browse category, search, filters, sorting, pagination, and product detail.
- [ ] Confirm inactive/out-of-stock products cannot be ordered.
- [ ] Add, update, and remove cart items; verify prices and stock.
- [ ] Quote a guest checkout and an authenticated checkout with a saved address.
- [ ] Exercise each configured shipping zone, free-shipping threshold, and an
      invalid province/address.
- [ ] Submit a COD order; confirm totals, stock reservation, email, and order
      history.
- [ ] Retry order submission with the same idempotency key and verify no
      duplicate order is created.
- [ ] Cancel an eligible order and confirm stock restoration and email.
- [ ] Verify reviews are limited to eligible customers and moderation works.
- [ ] Verify password reset, expired/reused reset token behavior, logout, and
      refresh-cookie behavior.

## Admin and operations

- [ ] Process an order through pending → processing → shipped → delivered.
- [ ] Confirm invalid order transitions are rejected and history is recorded.
- [ ] Mark an eligible shipped/delivered COD order as paid.
- [ ] Verify invoice and packing-slip output.
- [ ] Create/edit a product, variant, category, and brand; upload an image.
- [ ] Adjust inventory and verify alert/history updates.
- [ ] Search a customer, block/unblock the account, and inspect audit history.
- [ ] Assign and remove team roles using least privilege.
- [ ] Verify transactional email delivery and sender-domain authentication.
- [ ] Verify sitemap and robots behavior for the configured indexing policy.

## Quality and sign-off

- [ ] Test current Chrome, Firefox, Safari, and mobile viewport sizes.
- [ ] Complete keyboard-only navigation and accessibility review.
- [ ] Run Lighthouse against the deployed client and save the report; review
      performance, accessibility, best practices, and SEO.
- [ ] Confirm browser error reporting, uptime alerts, and log redaction.
- [ ] Perform a database backup restore into a temporary cluster and record the
      restore result and duration.
- [ ] Obtain product, support, finance, privacy/legal, and business-owner
      approval.
- [ ] Record all failures as tracked issues, retest fixes, and attach final
      sanitized evidence.

## Sign-off record

| Field                   | Value                                                   |
| ----------------------- | ------------------------------------------------------- |
| Staging URL             | Not provisioned                                         |
| Commit/build            | Not run                                                 |
| Tester/date             | Not run                                                 |
| UAT result              | Blocked until staging and test accounts are provisioned |
| Business owner approval | Pending                                                 |
