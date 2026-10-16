import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import BootstrapLock from "../models/BootstrapLock.js";
import {
  acquireBootstrapLock,
  releaseBootstrapLock,
} from "../services/bootstrapLockService.js";

const originalFindOneAndUpdate = BootstrapLock.findOneAndUpdate;
const originalDeleteOne = BootstrapLock.deleteOne;

afterEach(() => {
  BootstrapLock.findOneAndUpdate = originalFindOneAndUpdate;
  BootstrapLock.deleteOne = originalDeleteOne;
});

test("bootstrap lock uses the string identifier queried by the service", () => {
  assert.equal(BootstrapLock.schema.path("_id").instance, "String");
});

test("bootstrap lock acquisition creates an expiring uniquely owned lock", async () => {
  let query;
  let update;
  let options;
  BootstrapLock.findOneAndUpdate = async (nextQuery, nextUpdate, nextOptions) => {
    query = nextQuery;
    update = nextUpdate;
    options = nextOptions;
    return { owner: nextUpdate.$set.owner };
  };

  const owner = await acquireBootstrapLock();

  assert.equal(query._id, "initial-superadmin-provisioning");
  assert.ok(query.expiresAt.$lte instanceof Date);
  assert.equal(update.$set.owner, owner);
  assert.ok(update.$set.expiresAt instanceof Date);
  assert.ok(update.$set.expiresAt > query.expiresAt.$lte);
  assert.equal(options.upsert, true);
  assert.equal(options.new, true);
});

test("bootstrap lock rejects a concurrent active bootstrap", async () => {
  BootstrapLock.findOneAndUpdate = async () => {
    const duplicate = new Error("duplicate lock identifier");
    duplicate.code = 11000;
    throw duplicate;
  };

  await assert.rejects(
    acquireBootstrapLock(),
    /already in progress/
  );
});

test("bootstrap lock release is scoped to its owner", async () => {
  let query;
  BootstrapLock.deleteOne = async (nextQuery) => {
    query = nextQuery;
  };

  await releaseBootstrapLock("lock-owner");

  assert.deepEqual(query, {
    _id: "initial-superadmin-provisioning",
    owner: "lock-owner",
  });
});
