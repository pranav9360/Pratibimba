import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import Report from "../models/Report.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import { getReports, updateReport, sendReportToPrakalpa } from "../services/reportService.js";
import routes from "../routes/reportRoutes.js";

const original = { reportFind: Report.find, reportById: Report.findById, auditById: ScheduledAudit.findById };
let report, filter;
beforeEach(() => {
  report = { _id: "report", scheduledAudit: "audit", findings: "Original", severity: "non_conformance",
    status: "open", workflowStatus: "coordinator_generated", actionTaken: "Protected action", save: async () => {} };
  Report.find = f => { filter = f; return { sort: async () => [report] }; };
  Report.findById = async () => report;
  ScheduledAudit.findById = async () => ({ _id: "audit", auditCoordinator: "Assigned Coordinator" });
});
afterEach(() => { Report.find = original.reportFind; Report.findById = original.reportById; ScheduledAudit.findById = original.auditById; });

for (const role of ["admin", "super_admin"]) {
  test(`${role} retains global report visibility without Coordinator impersonation`, async () => {
    assert.equal((await getReports({ role }))[0], report); assert.deepEqual(filter, {});
    // Editing/closure policy is expressly deferred, rather than silently relaxing ownership.
    await assert.rejects(updateReport("report", { findings: "Changed" }, { role, name: "Administrator" }), { statusCode: 403 });
    await assert.rejects(sendReportToPrakalpa("report", { role, name: "Assigned Coordinator" }), { statusCode: 403 });
    assert.equal(report.findings, "Original");
  });
}

test("assigned Coordinator retains description editing without changing corrective action or lifecycle", async () => {
  await updateReport("report", { findings: "Edited", severity: "open_for_improvement", actionTaken: "Attack", status: "closed", workflowStatus: "verified_closed" }, { role: "audit_coordinator", name: "Assigned Coordinator" });
  assert.equal(report.findings, "Edited"); assert.equal(report.actionTaken, "Protected action");
  assert.equal(report.status, "open"); assert.equal(report.workflowStatus, "coordinator_generated");
  assert.equal(report.workflowHistory.length, 1); assert.equal(report.mailSent, false);
});

test("unassigned Coordinators and operational roles cannot edit another report", async () => {
  for (const actor of [{ role: "audit_coordinator", name: "Other" }, { role: "auditor", name: "Assigned Coordinator" }, { role: "prakalpa_manager", name: "Assigned Coordinator" }]) {
    await assert.rejects(updateReport("report", { findings: "Attack" }, actor), { statusCode: 403 });
  }
});

test("closed and submitted-action reports retain lifecycle barriers", async () => {
  for (const workflowStatus of ["verified_closed", "action_submitted"]) {
    report.workflowStatus = workflowStatus;
    await assert.rejects(updateReport("report", { findings: "Attack" }, { role: "audit_coordinator", name: "Assigned Coordinator" }), { statusCode: 409 });
  }
});

test("formal closure and Manager action endpoints preserve separation of duties", () => {
  for (const [path, actors] of [["/:id/verify-close", ["admin", "super_admin", "auditor", "prakalpa_manager"]],
    ["/:id/submit-action", ["admin", "super_admin", "auditor", "audit_coordinator"]]]) {
    const gate = routes.stack.find(layer => layer.route?.path === path).route.stack[1].handle;
    for (const role of actors) {
      let error; gate({ user: { role } }, {}, e => { error = e; });
      assert.equal(error.statusCode, 403);
    }
  }
});
