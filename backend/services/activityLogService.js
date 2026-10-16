import ActivityLog from "../models/ActivityLog.js";
import { administrativeLogValues } from "../utils/administrativeLogValues.js";

export const recordActivity = async ({ actor, target, action, oldValue, newValue, session }) => {
  await ActivityLog.create([{
    actor: { userId: actor._id, name: actor.name, email: actor.email, role: actor.role },
    target,
    action,
    oldValue: administrativeLogValues(oldValue),
    newValue: administrativeLogValues(newValue),
  }], { session });
};

export const userActivityTarget = (user) => ({
  userId: user._id, name: user.name, email: user.email,
});
