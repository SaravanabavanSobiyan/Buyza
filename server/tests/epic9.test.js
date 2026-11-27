import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import ContactMessage from '../src/models/ContactMessage.js';
import EmailJob from '../src/models/EmailJob.js';
import { __setTransport, enqueueEmail, processDueJobs, sendPasswordResetEmail, sendWelcomeEmail } from '../src/services/email.service.js';
import { renderEmail } from '../src/emails/templates.js';

import { startDb, stopDb } from './helpers.js';

const contactBody = {
  name: 'Test Customer',
  email: 'customer@example.com',
  subject: 'Order question',
  message: 'I have a question about my recent order.',
};

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await Promise.all([ContactMessage.deleteMany(), EmailJob.deleteMany()]);
  process.env.ADMIN_EMAIL = 'admin@example.com';
  process.env.RECAPTCHA_SECRET = '';
  __setTransport(null);
});

describe('contact form', () => {
  test('honeypot returns success without saving or queueing', async () => {
    const response = await request(app).post('/api/contact').send({ website: 'bot filled this' });

    expect(response.status).toBe(200);
    expect(await ContactMessage.countDocuments()).toBe(0);
    expect(await EmailJob.countDocuments()).toBe(0);
  });

  test('saves valid messages and queues the admin reply and customer confirmation', async () => {
    const unsafeSubject = 'Order question\r\nBcc: victim@example.com';
    const response = await request(app)
      .post('/api/contact')
      .set('X-Forwarded-For', '203.0.113.11')
      .send({ ...contactBody, subject: unsafeSubject });

    expect(response.status).toBe(202);
    expect(await ContactMessage.findOne().lean()).toMatchObject({
      ...contactBody,
      subject: 'Order question Bcc: victim@example.com',
      ip: '203.0.113.11',
      status: 'new',
    });
    const jobs = await EmailJob.find().sort({ to: 1 }).lean();
    expect(jobs).toHaveLength(2);
    expect(jobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ to: 'admin@example.com', template: 'contactReceived', replyTo: contactBody.email }),
        expect.objectContaining({ to: contactBody.email, template: 'contactAutoReply' }),
      ])
    );
  });

  test('rejects failed reCAPTCHA verification', async () => {
    process.env.RECAPTCHA_SECRET = 'test-secret';
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => ({ success: false }),
    });

    try {
      const response = await request(app)
        .post('/api/contact')
        .send({ ...contactBody, captchaToken: 'invalid-token' });

      expect(response.status).toBe(400);
      expect(await ContactMessage.countDocuments()).toBe(0);
    } finally {
      fetch.mockRestore();
    }
  });

  test('limits contact submissions to five per IP per hour', async () => {
    const responses = [];
    for (let i = 0; i < 6; i += 1) {
      responses.push(
        await request(app)
          .post('/api/contact')
          .set('X-Forwarded-For', '203.0.113.12')
          .send(contactBody)
      );
    }

    expect(responses.slice(0, 5).every((response) => response.status === 202)).toBe(true);
    expect(responses[5].status).toBe(429);
    expect(await ContactMessage.countDocuments()).toBe(5);
  });
});

describe('email outbox', () => {
  test('escapes dynamic values in auth email templates and queues auth emails', async () => {
    const { html } = renderEmail('welcome', { name: '<script>alert(1)</script>' });
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    const contact = renderEmail('contactReceived', {
      name: 'Customer',
      email: 'customer@example.com',
      subject: 'A question',
      message: '<b>hi</b>',
    });
    expect(contact.html).toContain('&lt;b&gt;hi&lt;/b&gt;');

    await sendWelcomeEmail({ email: 'welcome@example.com', name: 'Customer' });
    await sendPasswordResetEmail(
      { email: 'reset@example.com', name: 'Customer' },
      'https://store.example/reset?token=abc'
    );
    const jobs = await EmailJob.find().sort({ template: 1 }).lean();
    expect(jobs.map((job) => job.template)).toEqual([
      'passwordReset',
      'welcome',
    ]);
  });

  test('retries failed deliveries and records all three attempts after success', async () => {
    let calls = 0;
    __setTransport({
      async sendMail() {
        calls += 1;
        if (calls < 3) throw new Error('SMTP unavailable');
        return { messageId: 'test-message' };
      },
    });
    const job = await enqueueEmail({
      to: 'customer@example.com',
      template: 'welcome',
      data: { name: 'Customer' },
    });

    await processDueJobs();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await EmailJob.updateOne({ _id: job._id }, { $set: { nextAttemptAt: new Date() } });
      await processDueJobs();
    }

    const sent = await EmailJob.findById(job._id).lean();
    expect(sent).toMatchObject({ status: 'sent', attempts: 3, lastError: null });
  });

  test('marks a job failed after four delivery failures', async () => {
    __setTransport({
      async sendMail() {
        throw new Error('SMTP unavailable');
      },
    });
    const job = await enqueueEmail({
      to: 'customer@example.com',
      template: 'welcome',
      data: { name: 'Customer' },
    });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await EmailJob.updateOne({ _id: job._id }, { $set: { nextAttemptAt: new Date() } });
      await processDueJobs();
    }

    const failed = await EmailJob.findById(job._id).lean();
    expect(failed).toMatchObject({ status: 'failed', attempts: 4 });
    expect(failed.lastError).toContain('SMTP unavailable');
  });

  test('atomically claims a job so concurrent workers send it only once', async () => {
    let calls = 0;
    __setTransport({
      async sendMail() {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { messageId: 'test-message' };
      },
    });
    await enqueueEmail({
      to: 'customer@example.com',
      template: 'welcome',
      data: { name: 'Customer' },
    });

    await Promise.all([processDueJobs(), processDueJobs()]);
    expect(calls).toBe(1);
  });
});
