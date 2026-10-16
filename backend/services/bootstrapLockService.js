import { randomUUID } from "node:crypto";
import BootstrapLock from "../models/BootstrapLock.js";

const LOCK_ID = "initial-superadmin-provisioning";
const LOCK_DURATION_MS = 5 * 60 * 1000;

export const acquireBootstrapLock = async () => {
  const owner = randomUUID();
  const now = new Date();

  try {
    const lock = await BootstrapLock.findOneAndUpdate(
      { _id: LOCK_ID, expiresAt: { $lte: now } },
      {
        $set: {
          owner,
          expiresAt: new Date(now.getTime() + LOCK_DURATION_MS),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (!lock || lock.owner !== owner) {
      throw new Error("Initial Superadmin provisioning is already in progress.");
    }

    return owner;
  } catch (error) {
    if (error?.code === 11000) {
      throw new Error("Initial Superadmin provisioning is already in progress.");
    }

    throw error;
  }
};

export const releaseBootstrapLock = async (owner) => {
  await BootstrapLock.deleteOne({ _id: LOCK_ID, owner });
};
