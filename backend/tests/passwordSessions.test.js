import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Role from "../models/Role.js";
import ActivityLog from "../models/ActivityLog.js";
import PasswordResetOtp from "../models/PasswordResetOtp.js";
import Guard from "../models/SuperAdminMutationGuard.js";
import authenticate from "../middleware/authMiddleware.js";
import { updateUser } from "../services/userService.js";
import { changeOwnPassword } from "../services/accountPasswordService.js";
import { resetPassword, login, forgotPassword } from "../services/authService.js";
import { generateToken } from "../utils/jwt.js";
import { isPasswordSessionCurrent, markPasswordChanged } from "../utils/passwordSessions.js";

const original = { userById: User.findById, userOne: User.findOne, roleOne: Role.findOne,
  log: ActivityLog.create, otp: PasswordResetOtp.findOne, deleteOtp: PasswordResetOtp.deleteMany, createOtp: PasswordResetOtp.create,
  session: mongoose.startSession, guard: Guard.updateOne,
  secret: process.env.JWT_SECRET, expiry: process.env.JWT_EXPIRES_IN };
const oldPassword = "TestOldPassword123";
const newPassword = "TestNewPassword456";
let user, actor, events, otpRecord, consumed;
const query = value => ({ session() { return this; }, select() { return this; },
  then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
beforeEach(async () => {
  // Fixtures exist only in the test process; no environment file or server is changed.
  process.env.JWT_SECRET = "fixture-only-password-session-secret";
  process.env.JWT_EXPIRES_IN = "1h";
  user = { _id: "user", name: "Test User", email: "user@example.test", role: "admin", active: true,
    password: await bcrypt.hash(oldPassword, 4), passwordChangedAt: null,
    async save(options) { assert.ok(options.session); this.password = await bcrypt.hash(this.password, 4); },
    toObject() { const { save, toObject, ...data } = this; return data; } };
  actor = { _id: "actor", name: "Test Superadmin", email: "actor@example.test", role: "super_admin", active: true };
  events = []; consumed = false;
  otpRecord = { verified: true, expiresAt: new Date(Date.now() + 60000) };
  User.findById = id => query(id === "actor" ? actor : user);
  User.findOne = () => query(user);
  Role.findOne = () => query({ name: "admin", active: true });
  ActivityLog.create = async (entries, options) => { assert.ok(options.session); events.push(...entries); };
  PasswordResetOtp.findOne = () => query(consumed ? null : otpRecord);
  PasswordResetOtp.deleteMany = async (_filter, options) => { assert.ok(options.session); consumed = true; };
  Guard.updateOne = async (_filter, _update, options) => { if (!options?.upsert) assert.ok(options.session); return { matchedCount: 1 }; };
  mongoose.startSession = async () => ({ withTransaction: async f => f(), endSession: async () => {} });
});
afterEach(() => {
  User.findById = original.userById; User.findOne = original.userOne; Role.findOne = original.roleOne;
  ActivityLog.create = original.log; PasswordResetOtp.findOne = original.otp; PasswordResetOtp.deleteMany = original.deleteOtp;
  PasswordResetOtp.create = original.createOtp;
  mongoose.startSession = original.session; Guard.updateOne = original.guard;
  for (const [key, value] of [["JWT_SECRET", original.secret], ["JWT_EXPIRES_IN", original.expiry]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
const authError = token => new Promise(resolve => authenticate(
  { headers: { authorization: `Bearer ${token}` } }, {}, error => resolve(error ?? null)
));

for (const mode of ["administrative", "self-service", "reset"]) {
  test(`${mode} password change invalidates old JWTs and new login works immediately`, async () => {
    const oldToken = generateToken(user._id);
    const legacyToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    assert.equal(await authError(oldToken), null);
    if (mode === "administrative") await updateUser(user._id, { password: newPassword }, actor);
    if (mode === "self-service") await changeOwnPassword(user, { currentPassword: oldPassword, newPassword }, jwt.verify(oldToken, process.env.JWT_SECRET));
    if (mode === "reset") await resetPassword({ identifier: user.email, otp: "123456", password: newPassword });
    assert.equal((await authError(oldToken)).statusCode, 401);
    assert.equal((await authError(legacyToken)).statusCode, 401);
    await assert.rejects(login({ identifier: user.email, password: oldPassword }), { statusCode: 401 });
    const signedIn = await login({ identifier: user.email, password: newPassword });
    assert.equal(await authError(signedIn.token), null);
    assert.equal(Object.hasOwn(signedIn.user, "password"), false);
    assert.equal(events.length, 1); assert.equal(events[0].newValue.passwordChanged, true);
    const serialized = JSON.stringify(events);
    for (const secret of [newPassword, oldPassword, user.password, oldToken, "123456"]) assert.equal(serialized.includes(secret), false);
  });
}

test("legacy JWTs retain compatibility for unchanged users and fail closed without iat after a change", () => {
  assert.equal(isPasswordSessionCurrent(user, {}), true);
  markPasswordChanged(user);
  assert.equal(isPasswordSessionCurrent(user, {}), false);
  assert.equal(isPasswordSessionCurrent(user, { iat: Math.floor(user.passwordChangedAt.getTime() / 1000) }), false);
});

test("same-millisecond password changes advance the session version without affecting other accounts", () => {
  const future = Date.now() + 1000;
  user.passwordChangedAt = new Date(future);
  markPasswordChanged(user); assert.equal(user.passwordChangedAt.getTime(), future + 1);
  const token = generateToken(user._id, user.passwordChangedAt);
  assert.equal(isPasswordSessionCurrent(user, jwt.verify(token, process.env.JWT_SECRET)), true);
  assert.equal(isPasswordSessionCurrent({ passwordChangedAt: null }, { passwordVersion: 0 }), true);
});

test("blank administrative password preserves existing sessions", async () => {
  const token = generateToken(user._id);
  user.save = async () => {};
  await updateUser(user._id, { password: "" }, actor);
  assert.equal(user.passwordChangedAt, null); assert.equal(await authError(token), null);
});

test("inactive or newly password-revoked self-service actors are rejected after guard acquisition", async () => {
  const token = generateToken(user._id);
  const claims = jwt.verify(token, process.env.JWT_SECRET);
  const requestActor = { ...user };
  user.active = false;
  await assert.rejects(changeOwnPassword(requestActor, { currentPassword: oldPassword, newPassword }, claims), { statusCode: 403 });
  user.active = true; markPasswordChanged(user);
  await assert.rejects(changeOwnPassword(requestActor, { currentPassword: oldPassword, newPassword }, claims), { statusCode: 401 });
  assert.equal(events.length, 0);
});

test("expired, unverified and consumed reset grants cannot change a password", async () => {
  const request = { identifier: user.email, otp: "123456", password: newPassword };
  otpRecord.expiresAt = new Date(0);
  await assert.rejects(resetPassword(request), { statusCode: 400 });
  PasswordResetOtp.findOne = () => query(null);
  await assert.rejects(resetPassword(request), { statusCode: 400 });
  assert.equal(events.length, 0); assert.equal(user.passwordChangedAt, null);
});

test("reset grant is consumed transactionally and cannot be reused", async () => {
  const request = { identifier: user.email, otp: "123456", password: newPassword };
  await resetPassword(request); assert.equal(consumed, true);
  await assert.rejects(resetPassword(request), { statusCode: 400 });
  assert.equal(events.length, 1);
});

test("self-service password and audit failure roll back together", async () => {
  const before = { password: user.password, passwordChangedAt: user.passwordChangedAt };
  mongoose.startSession = async () => ({ withTransaction: async f => {
    try { await f(); } catch (error) { Object.assign(user, before); throw error; }
  }, endSession: async () => {} });
  ActivityLog.create = async () => { throw new Error("Audit unavailable"); };
  await assert.rejects(changeOwnPassword(user, { currentPassword: oldPassword, newPassword }, { passwordVersion: 0 }), /Audit unavailable/);
  assert.equal(user.passwordChangedAt, null); assert.equal(user.password, before.password);
});

test("reset issuance delivers only to the registered email and never returns its credential", async () => {
  let stored, delivered;
  PasswordResetOtp.deleteMany = async () => {};
  PasswordResetOtp.create = async data => { stored = data; };
  const response = await forgotPassword({ identifier: user.email }, async payload => { delivered = payload; });
  assert.equal(delivered.to, user.email); assert.match(stored.otp, /^\d{6}$/);
  assert.ok(delivered.text.includes(stored.otp));
  assert.deepEqual(response, {});
  assert.equal(JSON.stringify(response).includes(stored.otp), false);
  User.findOne = () => query(null);
  assert.deepEqual(await forgotPassword({ identifier: "missing@example.test" }, async () => assert.fail("Must not send for missing accounts")), response);
});

test("failed reset delivery revokes the issued credential", async () => {
  let stored, removal;
  PasswordResetOtp.create = async data => { stored = data; };
  PasswordResetOtp.deleteMany = async criteria => { removal = criteria; };
  await assert.rejects(forgotPassword({ identifier: user.email }, async () => { throw new Error("Mailer unavailable"); }), /Mailer unavailable/);
  assert.deepEqual(removal, { identifier: user.email, otp: stored.otp });
});

test("repeated successful logins do not revoke existing sessions or require session-count writes", async () => {
  let writes = 0; user.save = async () => { writes++; };
  const first = await login({ identifier: user.email, password: oldPassword });
  const second = await login({ identifier: user.email, password: oldPassword });
  assert.equal(await authError(first.token), null);
  assert.equal(await authError(second.token), null);
  assert.equal(writes, 0); assert.equal(user.passwordChangedAt, null);
});

for (const value of ["student123", "hello2026", "Password123", "secure@123"]) {
 test(`eight-character-compatible policy works for own change, management update and single-use reset: ${value}`, async () => {
   await changeOwnPassword(user, {currentPassword: oldPassword, newPassword: value}, {});
   assert.ok(await bcrypt.compare(value,user.password));
   await updateUser("user",{password:value},actor);assert.ok(await bcrypt.compare(value,user.password));
   await resetPassword({identifier:user.email,otp:"123456",password:value});assert.ok(await bcrypt.compare(value,user.password));
   await assert.rejects(resetPassword({identifier:user.email,otp:"123456",password:value}),{statusCode:400});
 });
}
for(const value of ["abcdefg","12345678","abcdefgh","abc123"]){
 test(`all password services reject ${value} without setting a password`,async()=>{
  const before=user.password;
  await assert.rejects(changeOwnPassword(user,{currentPassword:oldPassword,newPassword:value},{}),{statusCode:400});
  await assert.rejects(updateUser("user",{password:value},actor),{statusCode:400});
  await assert.rejects(resetPassword({identifier:user.email,otp:"123456",password:value}),{statusCode:400});
  assert.equal(user.password,before);assert.equal(consumed,false);assert.equal(events.length,0);
 });
}
test("legacy low-complexity stored password still authenticates",async()=>{
 user.password=await bcrypt.hash("legacy",4);assert.ok((await login({identifier:user.email,password:"legacy"})).token);
});
