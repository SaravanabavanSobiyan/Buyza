import { asyncHandler } from '../utils/asyncHandler.js';
import { enqueueEmail } from '../services/email.service.js';
import { verifyCaptcha } from '../utils/recaptcha.js';
import ContactMessage from '../models/ContactMessage.js';

export const contactMessage = asyncHandler(async (req, res) => {
  const { name, email, subject, message, captchaToken } = req.body;

  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || undefined;
  if (!(await verifyCaptcha(captchaToken, ip))) {
    return res.status(400).json({ success: false, message: 'Captcha verification failed' });
  }

  const storeEmail = process.env.ADMIN_EMAIL;
  if (!storeEmail) {
    return res.status(503).json({ success: false, message: 'Contact service is not configured' });
  }

  await ContactMessage.create({ name, email, subject, message, ip });
  const payload = { name, email, subject, message };

  await Promise.all([
    enqueueEmail({ to: storeEmail, template: 'contactReceived', data: payload, replyTo: email }),
    enqueueEmail({ to: email, template: 'contactAutoReply', data: payload }),
  ]);

  res.status(202).json({ success: true, message: 'Message sent' });
});
