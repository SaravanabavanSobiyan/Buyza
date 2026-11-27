import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate.js';
import { contactSchema } from './contact.validation.js';
import { contactMessage } from '../controllers/contact.controller.js';

const router = Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many messages. Please try again later.' },
});

const ignoreHoneypot = (req, res, next) => {
  if (typeof req.body?.website === 'string' && req.body.website.trim()) {
    return res.status(200).json({ success: true, message: 'Message sent' });
  }
  next();
};

router.post('/', ignoreHoneypot, contactLimiter, validate(contactSchema), contactMessage);

export default router;
