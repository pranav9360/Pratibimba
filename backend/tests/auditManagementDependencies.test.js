import test from "node:test";
import assert from "node:assert/strict";
import User from "../models/User.js";
import AuditPlan from "../models/AuditPlan.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import Report from "../models/Report.js";
import Prakalpa from "../models/Prakalpa.js";
import Location from "../models/Location.js";
import { getAuditPersonDirectory, getUsers } from "../services/userService.js";
import { createAuditPlan, scheduleAuditPlan } from "../services/auditPlanService.js";

test("Admin can select a Coordinator and Auditor from the minimal directory, plan and schedule without user-management access", async () => {
  const originals = { userFind: User.find, userOne: User.findOne, planFind: AuditPlan.find,
    planCreate: AuditPlan.create, planId: AuditPlan.findById, planOne: AuditPlan.findOne,
    scheduledFind: ScheduledAudit.find, scheduledOne: ScheduledAudit.findOne, scheduledSave: ScheduledAudit.prototype.save,
    reportFind: Report.find, prakalpaOne: Prakalpa.findOne, locationFind: Location.find };
  const admin = { _id: "admin", role: "admin", active: true };
  const coordinator = { _id: "coordinator", name: "Selected Coordinator", role: "audit_coordinator" };
  const auditor = { _id: "auditor", name: "Selected Auditor", role: "auditor" };
  let plan, scheduled;
  try {
    User.find = filter => {
      if (filter.role === "prakalpa_manager") return { select() { return this; }, lean: async () => [{ _id: "manager", name: "Manager Pramukh", email: "manager@example.test", prakalpa: "Test Prakalpa", assignedPrakalpas: ["Test Prakalpa"] }] };
      assert.deepEqual(filter, { active: true, role: { $in: ["auditor", "audit_coordinator"] } });
      return { select(fields) { assert.equal(fields, "_id name role"); return this; }, sort() { return this; },
        lean: async () => [coordinator, auditor] };
    };
    const people = await getAuditPersonDirectory(admin);
    const selectedCoordinator = people.find(person => person.role === "audit_coordinator");
    const selectedAuditor = people.find(person => person.role === "auditor");
    // Admin now has full user directory management access; audit-person DTO remains scoped.
    AuditPlan.find = ScheduledAudit.find = Report.find = () => ({ lean: async () => [] });
    Prakalpa.findOne = async () => ({ name: "Test Prakalpa", active: true, auditAreas: ["Finance"], prakalpaPramukh: "Pramukh" });
    Location.find = async () => [{ name: "Office", sublocations: ["Room"], active: true }];
    AuditPlan.create = async data => { plan = { ...data, _id: "plan", save: async () => {} }; return plan; };
    AuditPlan.findById = async () => plan;
    const created = await createAuditPlan({ prakalpa: "Test Prakalpa", location: "Office", sublocation: "Room",
      auditAreas: ["Finance"], auditCoordinator: selectedCoordinator.name, auditPlannedDate: "2026-12-01" }, admin);
    assert.equal(created.auditCoordinator, coordinator.name);
    assert.equal(created.prakalphaPramukh, "Manager Pramukh"); assert.equal(created.status, "pending");
    AuditPlan.findOne = async filter => { assert.equal(filter._id, "plan"); return plan; };
    User.findOne = filter => {
      assert.deepEqual(filter, { name: auditor.name, role: "auditor", active: true });
      return { select: async () => ({ ...auditor, active: true }) };
    };
    ScheduledAudit.findOne = async () => null;
    ScheduledAudit.prototype.save = async function () { scheduled = this.toObject(); };
    const result = await scheduleAuditPlan("plan", { auditors: [selectedAuditor.name], leadAuditor: selectedAuditor.name,
      startDate: "2026-12-01", endDate: "2026-12-02", auditCoordinator: "Attempted ownership override" }, admin);
    assert.equal(result.status, "scheduled");
    assert.equal(scheduled.auditCoordinator, coordinator.name, "scheduling preserves the planning assignment");
    assert.deepEqual(scheduled.auditors, [auditor.name]); assert.equal(scheduled.leadAuditor, auditor.name);
    assert.equal(scheduled.prakalpa, "Test Prakalpa"); assert.equal(scheduled.location, "Office");
  } finally {
    User.find = originals.userFind; User.findOne = originals.userOne;
    AuditPlan.find = originals.planFind; AuditPlan.create = originals.planCreate;
    AuditPlan.findById = originals.planId; AuditPlan.findOne = originals.planOne;
    ScheduledAudit.find = originals.scheduledFind; ScheduledAudit.findOne = originals.scheduledOne;
    ScheduledAudit.prototype.save = originals.scheduledSave; Report.find = originals.reportFind;
    Prakalpa.findOne = originals.prakalpaOne; Location.find = originals.locationFind;
  }
});
