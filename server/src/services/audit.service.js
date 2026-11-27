import AuditLog from "../models/AuditLog.js";

export const audit = async (
  req,
  { action, entityType, entityId, summary, meta = {} }
) => {
  try {
    await AuditLog.create({
      actor: req.user?._id,
      actorRole: req.user?.role || "system",
      action,
      entityType,
      entityId: String(entityId),
      summary,
      meta,
      ip: req.ip,
    });
  } catch (error) {
    console.error("[audit] failed to write log entry:", error.message);
  }
};

const COLOMBO_OFFSET = "+05:30";

export const listAuditLogs = async ({
  page,
  limit,
  action,
  entityType,
  actor,
  from,
  to,
}) => {
  const filter = {};
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;
  if (actor) filter.actor = actor;
  if (from || to) {
    filter.createdAt = {};
    if (from) {
      filter.createdAt.$gte = new Date(
        `${from}T00:00:00.000${COLOMBO_OFFSET}`
      );
    }
    if (to) {
      filter.createdAt.$lte = new Date(
        `${to}T23:59:59.999${COLOMBO_OFFSET}`
      );
    }
  }

  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "actor", select: "name email role" })
      .lean(),
  ]);

  return {
    logs,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

export const listAuditActions = () => AuditLog.distinct("action");
