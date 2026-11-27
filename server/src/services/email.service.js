import nodemailer from 'nodemailer';
import cron from 'node-cron';
import EmailJob from '../models/EmailJob.js';
import { renderEmail } from '../emails/templates.js';

const MAX_ATTEMPTS = 4;
const BACKOFF_MINUTES = [1, 5, 30];
const STALE_LOCK_MS = 10 * 60 * 1000;

let transportPromise = null;
let workerTask = null;

export const __setTransport = (t) => {
  transportPromise = t ? Promise.resolve(t) : null;
};

const createTransport = async () => {
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT || 587);
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }

  const account = await nodemailer.createTestAccount();
  const t = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: { user: account.user, pass: account.pass },
  });
  t.__ethereal = true;
  console.log('[email] SMTP_HOST is not set: using an Ethereal test inbox (emails are NOT delivered)');
  return t;
};

const getTransport = () => {
  if (!transportPromise) {
    transportPromise = createTransport();
    transportPromise.catch(() => {
      transportPromise = null;
    });
  }
  return transportPromise;
};

const fromAddress = () =>
  process.env.EMAIL_FROM || `"${process.env.STORE_NAME || 'My Store'}" <no-reply@localhost>`;

export const enqueueEmail = async ({ to, template, data = {}, replyTo }, { session } = {}) => {
  const [job] = await EmailJob.create([{ to, template, data, replyTo }], { session });
  return job;
};

const claimNext = () => {
  const now = new Date();
  return EmailJob.findOneAndUpdate(
    {
      $or: [
        { status: 'pending', nextAttemptAt: { $lte: now } },
        { status: 'processing', lockedAt: { $lt: new Date(now.getTime() - STALE_LOCK_MS) } },
      ],
    },
    { $set: { status: 'processing', lockedAt: now } },
    { sort: { nextAttemptAt: 1 }, new: true }
  );
};

const sendJob = async (job) => {
  try {
    const { subject, html, text } = renderEmail(job.template, job.data);
    const transport = await getTransport();
    const info = await transport.sendMail({
      from: fromAddress(),
      to: job.to,
      replyTo: job.replyTo || undefined,
      subject,
      html,
      text,
    });

    if (transport.__ethereal) console.log(`[email] preview: ${nodemailer.getTestMessageUrl(info)}`);

    await EmailJob.updateOne(
      { _id: job._id },
      { $set: { status: 'sent', sentAt: new Date(), lockedAt: null, lastError: null }, $inc: { attempts: 1 } }
    );
    return true;
  } catch (err) {
    const attempts = job.attempts + 1;
    const lastError = String(err.message || err).slice(0, 500);

    if (attempts >= MAX_ATTEMPTS) {
      await EmailJob.updateOne({ _id: job._id }, { $set: { status: 'failed', attempts, lockedAt: null, lastError } });
      console.error(`[email] giving up on "${job.template}" to ${job.to}: ${lastError}`);
    } else {
      const delayMs = BACKOFF_MINUTES[attempts - 1] * 60 * 1000;
      await EmailJob.updateOne(
        { _id: job._id },
        { $set: { status: 'pending', attempts, nextAttemptAt: new Date(Date.now() + delayMs), lockedAt: null, lastError } }
      );
    }
    return false;
  }
};

export const processDueJobs = async ({ limit = 20 } = {}) => {
  let processed = 0;
  while (processed < limit) {
    const job = await claimNext();
    if (!job) break;
    await sendJob(job);
    processed += 1;
  }
  return processed;
};

export const startEmailWorker = () => {
  if (workerTask) return workerTask;

  const tick = async () => {
    try {
      await processDueJobs();
    } catch (error) {
      console.error('[email] worker error:', error.message);
    }
  };

  tick();
  workerTask = cron.schedule('* * * * *', tick);
  console.log('[email] worker started');
  return workerTask;
};

export const sendWelcomeEmail = (user) =>
  enqueueEmail({ to: user.email, template: 'welcome', data: { name: user.name } });

export const sendPasswordResetEmail = (user, link) =>
  enqueueEmail({ to: user.email, template: 'passwordReset', data: { name: user.name, link } });
