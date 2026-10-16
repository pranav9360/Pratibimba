import mongoose from "mongoose";
import SuperAdminMutationGuard from "../models/SuperAdminMutationGuard.js";
import AppError from "../utils/AppError.js";

const GUARD_ID = "superadmin-mutation-serialization";

const ensureGuardExists = async () => {
  try {
    await SuperAdminMutationGuard.updateOne(
      { _id: GUARD_ID },
      { $setOnInsert: { revision: 0 } },
      { upsert: true }
    );
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    const existingGuard = await SuperAdminMutationGuard.findById(GUARD_ID);
    if (!existingGuard) {
      throw error;
    }
  }
};

export const withSuperAdminMutationTransaction = async (operation) => {
  await ensureGuardExists();

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const guardWrite = await SuperAdminMutationGuard.updateOne(
        { _id: GUARD_ID },
        { $inc: { revision: 1 } },
        { session }
      );

      if (guardWrite.matchedCount !== 1) {
        throw new Error("Superadmin mutation guard is unavailable.");
      }

      result = await operation(session);
    });
    return result;
  } catch (error) {
    if (
      error?.code === 20 ||
      /transactions are not supported|replica set|mongos/i.test(error?.message ?? "")
    ) {
      throw new AppError(
        "Account changes require a transaction-capable MongoDB deployment.",
        503
      );
    }
    throw error;
  } finally {
    // Cleanup failure must not turn an already committed change into a failure.
    try { await session.endSession(); }
    catch { console.error("Account transaction session cleanup failed"); }
  }
};
