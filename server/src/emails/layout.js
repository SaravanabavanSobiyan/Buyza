import { escapeHtml as e } from '../utils/escapeHtml.js';

const BRAND = '#4f46e5';

export const storeName = () => process.env.STORE_NAME || 'My Store';
export const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
export const money = (n) => `Rs. ${Number(n || 0).toFixed(2)}`;

export const paragraph = (html) => `<p style="margin:0 0 16px;line-height:1.5;">${html}</p>`;

export const section = (title, html) =>
  `<h3 style="margin:20px 0 6px;font-size:14px;color:#374151;">${e(title)}</h3><p style="margin:0;line-height:1.5;">${html}</p>`;

export const button = (url, label) =>
  `<p style="margin:24px 0;"><a href="${e(url)}" style="background:${BRAND};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block;">${e(label)}</a></p>`;

export const toText = (html) =>
  String(html ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h1|h2|h3|table)>/gi, '\n')
    .replace(/<\/?t[dh]>/gi, '  ')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const layout = ({ title, bodyHtml, preheader = '' }) => `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:${BRAND};padding:20px 28px;color:#ffffff;font-size:20px;font-weight:700;">${e(storeName())}</td></tr>
<tr><td style="padding:28px;font-size:15px;">${bodyHtml}</td></tr>
<tr><td style="padding:16px 28px;background:#f9fafb;color:#6b7280;font-size:12px;">This email was sent by ${e(storeName())}. If you didn't expect it, you can ignore it.</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
