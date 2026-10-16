import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import express from "express";
import {
  loginRateLimiter,
  forgotPasswordRateLimiter,
  verifyOtpRateLimiter,
  resetPasswordRateLimiter
} from "../middleware/authRateLimit.js";

// Exercise real middleware with simulated authentication responses; no database.
const routes = [
  ["login", loginRateLimiter, 10],
  ["forgot-password", forgotPasswordRateLimiter, 5],
  ["verify-otp", verifyOtpRateLimiter, 10],
  ["reset-password", resetPasswordRateLimiter, 5]
];
let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use(express.json());
  for (const [path, limiter] of routes) {
    app.post(`/${path}`, limiter, (req, res) => {
      res.status(req.body.status).json({ success: req.body.status === 200 });
    });
  }
  server = await new Promise(resolve => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
  for (const [, limiter] of routes) await limiter.resetKey("127.0.0.1");
});

after(async () => {
  if (server) {
    await new Promise(resolve => {
      server.close(resolve);
      server.closeAllConnections();
    });
  }
});

async function request(path, status) {
  const response = await fetch(`${baseUrl}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  return { status: response.status, body: await response.json(), headers: response.headers };
}

test("more than 15 successful logins do not exhaust the login quota", async () => {
  for (let i = 0; i < 25; i++) {
    assert.equal((await request("login", 200)).status, 200, `Successful login ${i + 1}`);
  }
});

test("mixed successful and failed logins count only unsuccessful requests", async () => {
  for (let i = 0; i < 9; i++) {
    assert.equal((await request("login", 401)).status, 401);
    for (let j = 0; j < 3; j++) assert.equal((await request("login", 200)).status, 200);
  }
  assert.equal((await request("login", 401)).status, 401);
  assert.equal((await request("login", 401)).status, 429);
});

test("ten unsuccessful attempts are allowed and subsequent requests are blocked", async () => {
  for (let i = 0; i < 10; i++) assert.equal((await request("login", 401)).status, 401);
  const blocked = await request("login", 401);
  assert.equal(blocked.status, 429);
  assert.deepEqual(blocked.body, {
    success: false,
    message: "Too many login attempts. Please try again later."
  });
  const retryAfter = Number(blocked.headers.get("retry-after"));
  assert.ok(retryAfter > 0 && retryAfter <= 15 * 60);
  assert.equal((await request("login", 200)).status, 429);
});

test("validation failures also consume the unsuccessful login quota", async () => {
  for (let i = 0; i < 10; i++) assert.equal((await request("login", 400)).status, 400);
  assert.equal((await request("login", 400)).status, 429);
});

for (const [path, , limit] of routes.slice(1)) {
  test(`${path} still counts successful requests against its existing limit`, async () => {
    for (let i = 0; i < limit; i++) assert.equal((await request(path, 200)).status, 200);
    assert.equal((await request(path, 200)).status, 429);
  });
}
