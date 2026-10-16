import asyncHandler from "../middleware/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ActivityLog from "../models/ActivityLog.js";
import { administrativeLogValues } from "../utils/administrativeLogValues.js";

export const getActivityLogs = asyncHandler(async (_req, res) => {
  const logs = await ActivityLog.find()
    .sort({ occurredAt: -1 })
    .limit(100)
    .lean();

  res.json(new ApiResponse(200, "Activity logs fetched successfully", logs.map((log) => ({
    _id: log._id,
    occurredAt: log.occurredAt,
    action: log.action,
    actor: { userId: log.actor.userId, name: log.actor.name, email: log.actor.email, role: log.actor.role },
    target: { entityType: log.target.entityType ?? "user", userId: log.target.userId,
      roleId: log.target.roleId, name: log.target.name, email: log.target.email },
    oldValue: administrativeLogValues(log.oldValue),
    newValue: administrativeLogValues(log.newValue),
  }))));
});
