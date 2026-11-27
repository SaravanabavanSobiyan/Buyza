import mongoose from 'mongoose';

const emailJobSchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    template: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    replyTo: String,
    status: { type: String, enum: ['pending', 'processing', 'sent', 'failed'], default: 'pending' },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    lockedAt: Date,
    lastError: String,
    sentAt: Date,
  },
  { timestamps: true }
);

emailJobSchema.index({ status: 1, nextAttemptAt: 1 });
emailJobSchema.index({ sentAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export default mongoose.model('EmailJob', emailJobSchema);
