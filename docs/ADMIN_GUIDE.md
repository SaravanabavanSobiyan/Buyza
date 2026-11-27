# Admin guide

Sign in with an account that has been assigned an admin role. Do not share
accounts. Roles are permission-scoped; staff can process orders and update
inventory, managers can also manage products and customers, and admins have
full access.

## Orders

1. Open **Orders** and select an order to review its items, shipping address,
   payment method, customer, and status history.
2. Move orders through the allowed sequence: **Pending → Processing → Shipped
   → Delivered**. The app emails the customer when an order is shipped or
   delivered.
3. Cancel only when necessary. Cancellation is available for pending,
   processing, or shipped orders, requires a reason, restores stock, and emails
   the customer.
4. For Cash on Delivery (COD), use **Mark as paid** only after cash is received.
   The action is available when the order is shipped or delivered and payment
   is still pending.
5. Use **Print invoice** or **Print packing slip** to prepare fulfillment
   documents.
6. If a previously paid order is cancelled, the order detail marks the refund
   as due. Coordinate the bank-transfer refund using the store's approved
   finance process; the app does not initiate a bank transfer.

## Catalog and inventory

- Add categories and brands before creating products that reference them.
- Product prices and stock must be whole-number minor units/counts; enter prices
  using the store's documented currency convention.
- Add accurate product details, variants/SKUs, stock levels, and product images.
  Review the storefront after saving.
- Use **Inventory** to inspect stock, alerts, and adjustment history. Record an
  accurate reason for each manual stock adjustment. Orders reserve stock and
  cancellations return it automatically.
- Deactivate an item rather than deleting it if historical order context must
  be retained.

## Customers and team

- Use customer search only for support or fulfillment needs; customer details
  are personal data and must not be copied into public notes or screenshots.
- Block an account only for an approved operational reason and record a
  specific reason. Unblock it when the restriction no longer applies.
- Use **Staff & roles** to assign the minimum role needed. Avoid changing your
  own role; the UI prevents self-role changes. Suspend access when a team
  member leaves and review the audit log.
- Never share admin credentials. Use the organization's approved password
  manager and multi-factor authentication on the hosting and email accounts.

## Screenshots and evidence

No staging credentials or deployed admin environment were provided, so this
guide does not include screenshots. Capture fresh, anonymized screenshots after
staging is available; exclude customer names, email addresses, phone numbers,
addresses, order IDs, and other personal data.
