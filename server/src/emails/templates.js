import { escapeHtml as e } from '../utils/escapeHtml.js';
import { layout, button, paragraph, section, money, clientUrl, toText } from './layout.js';

const dateFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

const etaText = (min, max) => {
  if (min == null && max == null) return '';
  const lo = min ?? max;
  const hi = max ?? min;
  if (typeof lo === 'number' && typeof hi === 'number') {
    return lo === hi ? `${lo} business days` : `${lo}-${hi} business days`;
  }
  const a = new Date(lo);
  const b = new Date(hi);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '';
  const A = dateFmt.format(a);
  const B = dateFmt.format(b);
  return A === B ? A : `${A} - ${B}`;
};

const oneLine = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim();

const itemsTable = (items = []) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 16px;">${items
  .map(
    (i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">${e(i.name)}${
      i.variantSku ? `<br><span style="color:#6b7280;font-size:12px;">${e(i.variantSku)}</span>` : ''
    }<br><span style="color:#6b7280;font-size:12px;">Qty ${e(i.quantity)}</span></td><td align="right" style="padding:8px 0;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${e(money(i.lineTotal))}</td></tr>`
  )
  .join('')}</table>`;

const row = (label, value, bold = false) =>
  `<tr><td style="padding:3px 0;${bold ? 'font-weight:700;' : ''}">${e(label)}</td><td align="right" style="padding:3px 0;${bold ? 'font-weight:700;' : ''}">${e(value)}</td></tr>`;

const totalsTable = (d) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0;">
  ${row('Subtotal', money(d.subtotal))}
  ${d.discount ? row('Discount', `-${money(d.discount)}`) : ''}
  ${row('Shipping', money(d.shipping))}
  ${row('Total', money(d.total), true)}
</table>`;

const addressBlock = (a = {}) =>
  `${e(a.fullName)}<br>${e(a.line1)}${a.line2 ? `, ${e(a.line2)}` : ''}<br>${e(a.city)}, ${e(a.province)} ${e(a.postalCode)}<br>${e(a.phone)}`;

const paymentLine = (d) => {
  if (d.cancelledBy) {
    return d.paymentStatus === 'refund_pending'
      ? 'Payment: refund pending.'
      : 'Payment: cash on delivery was not collected.';
  }
  return d.paymentMethod === 'cod'
    ? `Cash on delivery: please have ${money(d.total)} ready when your order arrives.`
    : 'Paid by card.';
};

const viewOrderButton = (d) =>
  d.isGuest ? '' : button(`${clientUrl()}/orders/${encodeURIComponent(d.orderNumber)}`, 'View your order');

const orderSummary = (d) =>
  paragraph(`<strong>Order ${e(d.orderNumber)}</strong>`) +
  itemsTable(d.items) +
  totalsTable(d) +
  section(
    'Delivery address',
    addressBlock(d.address) +
      (etaText(d.etaMin, d.etaMax)
        ? `<br><br>Estimated delivery: ${e(etaText(d.etaMin, d.etaMax))}`
        : '')
  ) +
  section('Payment', e(paymentLine(d)));

const build = (subject, title, bodyHtml, preheader) => {
  const html = layout({ title, bodyHtml, preheader });
  return { subject: oneLine(subject), html, text: toText(html) };
};

export const templates = {
  welcome: (d) =>
    build(
      'Welcome to our store',
      'Welcome',
      paragraph(`Hi ${e(d.name)},`) +
        paragraph('Thanks for creating an account. Happy shopping!'),
      'Thanks for creating an account'
    ),

  passwordReset: (d) =>
    build(
      'Reset your password',
      'Reset your password',
      paragraph(`Hi ${e(d.name)},`) +
        paragraph('Reset your password using the link below. It is valid for 15 minutes.') +
        paragraph(button(d.link, 'Reset password')) +
        paragraph("If you didn't ask for this, you can ignore this email."),
      'Your password reset link is ready'
    ),

  orderConfirmation: (d) =>
    build(
      `Order ${d.orderNumber} confirmed`,
      'Order confirmed',
      paragraph(`Hi ${e(d.address?.fullName)},`) +
        paragraph("Thank you for your order. We've received it and will let you know when it ships.") +
        orderSummary(d) +
        viewOrderButton(d),
      `Your order ${d.orderNumber} is confirmed`
    ),

  orderShipped: (d) =>
    build(
      `Your order ${d.orderNumber} is on its way`,
      'Order shipped',
      paragraph(`Hi ${e(d.address?.fullName)},`) +
        paragraph('Good news: your order has been shipped.') +
        orderSummary(d) +
        viewOrderButton(d),
      `Order ${d.orderNumber} has shipped`
    ),

  orderDelivered: (d) =>
    build(
      `Your order ${d.orderNumber} was delivered`,
      'Order delivered',
      paragraph(`Hi ${e(d.address?.fullName)},`) +
        paragraph('Your order has been delivered. We hope you enjoy it!') +
        orderSummary(d) +
        paragraph('Tell other shoppers what you think by leaving a review on the products you bought.') +
        viewOrderButton(d),
      `Order ${d.orderNumber} was delivered`
    ),

  orderCancelled: (d) =>
    build(
      `Your order ${d.orderNumber} was cancelled`,
      'Order cancelled',
      paragraph(`Hi ${e(d.address?.fullName)},`) +
        paragraph(`Your order <strong>${e(d.orderNumber)}</strong> has been cancelled.`) +
        paragraph(
          d.cancelledBy === 'store'
            ? 'This order was cancelled by the store.'
            : `Reason: ${e(d.reasonLabel || 'Not given')}`
        ) +
        orderSummary(d) +
        (d.paymentStatus === 'refund_pending' ? paragraph('Your refund is being processed.') : '') +
        paragraph('If you have questions, just reply to this email or contact us.') +
        viewOrderButton(d),
      `Order ${d.orderNumber} was cancelled`
    ),

  contactReceived: (d) =>
    build(
      `[Contact] ${oneLine(d.subject)}`,
      'New contact message',
      paragraph(`<strong>From:</strong> ${e(d.name)} (${e(d.email)})`) +
        paragraph(`<strong>Subject:</strong> ${e(d.subject)}`) +
        `<div style="white-space:pre-line;line-height:1.5;border-left:3px solid #e5e7eb;padding-left:12px;">${e(d.message)}</div>`,
      `New message from ${d.name}`
    ),

  contactAutoReply: (d) =>
    build(
      'We received your message',
      'Thanks for contacting us',
      paragraph(`Hi ${e(d.name)},`) +
        paragraph("Thanks for getting in touch. We've received your message and will reply within 1 to 2 business days.") +
        paragraph('<strong>Your message:</strong>') +
        `<div style="white-space:pre-line;line-height:1.5;border-left:3px solid #e5e7eb;padding-left:12px;">${e(d.message)}</div>`,
      "We've received your message"
    ),
};

export const renderEmail = (template, data) => {
  const render = templates[template];
  if (!render) throw new Error(`Unknown email template: ${template}`);
  return render(data);
};
