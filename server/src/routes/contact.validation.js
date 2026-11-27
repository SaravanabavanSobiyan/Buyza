import { z } from 'zod';

const oneLine = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ');

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100).transform(oneLine),
  email: z.string().trim().email().max(200),
  subject: z.string().trim().min(3).max(150).transform(oneLine),
  message: z.string().trim().min(10).max(2000),
  website: z.string().trim().max(200).optional().default(''),
  captchaToken: z.string().trim().max(500).optional(),
});
