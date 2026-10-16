import test from "node:test";
import assert from "node:assert/strict";

import ScheduledAudit from "../models/ScheduledAudit.js";
import {
  getScheduledAudits,
  getScheduledAuditById,
  updateScheduledAudit,
} from "../services/scheduledAuditService.js";

const audits = [
  {
    _id: "ordinary-audit",
    auditors: ["Auditor One", "Shared Auditor"],
    leadAuditor: "Lead One",
    auditCoordinator: "Coordinator One",
  },
  {
    _id: "lead-only-audit",
    auditors: ["Auditor Two"],
    leadAuditor: "Lead One",
    auditCoordinator: "Coordinator Two",
  },
  {
    _id: "other-lead-audit",
    auditors: ["Auditor Three"],
    leadAuditor: "Lead Two",
    auditCoordinator: "Coordinator One",
  },
];

const matchesFilter = (audit, filter) =>
  Object.entries(filter).every(([key, value]) => {
    if (key === "$or") {
      return value.some((condition) =>
        matchesFilter(audit, condition)
      );
    }

    if (key === "auditors") {
      return audit.auditors.includes(value);
    }

    return audit[key] === value;
  });

const withMockedAuditQueries = async (callback) => {
  const originalFind = ScheduledAudit.find;
  const originalFindOne = ScheduledAudit.findOne;

  ScheduledAudit.find = (filter) => ({
    sort: async () => audits.filter((audit) => matchesFilter(audit, filter)),
  });
  ScheduledAudit.findOne = async (filter) =>
    audits.find((audit) => matchesFilter(audit, filter)) || null;

  try {
    await callback();
  } finally {
    ScheduledAudit.find = originalFind;
    ScheduledAudit.findOne = originalFindOne;
  }
};

test("ordinary Auditor can see an audit assigned through auditors", async () => {
  await withMockedAuditQueries(async () => {
    const user = { name: "Auditor One", role: "auditor" };

    const list = await getScheduledAudits({}, user);
    const detail = await getScheduledAuditById(
      "ordinary-audit",
      user
    );

    assert.deepEqual(list.map((audit) => audit._id), [
      "ordinary-audit",
    ]);
    assert.equal(detail._id, "ordinary-audit");
  });
});

test("Lead Auditor can see an audit without ordinary team assignment", async () => {
  await withMockedAuditQueries(async () => {
    const user = { name: "Lead One", role: "auditor" };

    const list = await getScheduledAudits({}, user);
    const detail = await getScheduledAuditById(
      "lead-only-audit",
      user
    );

    assert.deepEqual(
      list.map((audit) => audit._id).sort(),
      ["lead-only-audit", "ordinary-audit"]
    );
    assert.equal(detail._id, "lead-only-audit");
    assert.equal(
      audits
        .find((audit) => audit._id === detail._id)
        .auditors.includes(user.name),
      false
    );
  });
});

test("unassigned Auditor cannot see unrelated audits", async () => {
  await withMockedAuditQueries(async () => {
    const user = { name: "Unassigned Auditor", role: "auditor" };

    assert.deepEqual(await getScheduledAudits({}, user), []);
    await assert.rejects(
      getScheduledAuditById("ordinary-audit", user),
      { statusCode: 404 }
    );
  });
});

test("Lead Auditor cannot see another Lead Auditor's audit unless also assigned", async () => {
  await withMockedAuditQueries(async () => {
    const otherLead = { name: "Lead Two", role: "auditor" };

    assert.deepEqual(
      (await getScheduledAudits({}, otherLead)).map(
        (audit) => audit._id
      ),
      ["other-lead-audit"]
    );
    await assert.rejects(
      getScheduledAuditById("lead-only-audit", otherLead),
      { statusCode: 404 }
    );

    const dualAssigned = {
      name: "Shared Auditor",
      role: "auditor",
    };
    assert.deepEqual(
      (await getScheduledAudits({}, dualAssigned)).map(
        (audit) => audit._id
      ),
      ["ordinary-audit"]
    );
  });
});

test("Coordinator and Prakalpa Manager visibility remain unchanged", async () => {
  await withMockedAuditQueries(async () => {
    const coordinator = {
      name: "Coordinator One",
      role: "audit_coordinator",
    };
    const coordinatorAudits = await getScheduledAudits(
      {},
      coordinator
    );
    assert.deepEqual(
      coordinatorAudits.map((audit) => audit._id).sort(),
      ["ordinary-audit", "other-lead-audit"]
    );

    const manager = {
      name: "Project Manager",
      role: "prakalpa_manager",
    };
    assert.deepEqual(await getScheduledAudits({}, manager), []);
    await assert.rejects(
      getScheduledAuditById("ordinary-audit", manager),
      { statusCode: 404 }
    );
  });
});

test("Lead Auditor read visibility does not grant Scheduled Audit editing", async () => {
  await assert.rejects(
    updateScheduledAudit(
      "lead-only-audit",
      {},
      { name: "Lead One", role: "auditor" }
    ),
    {
      statusCode: 403,
      message: "You are not authorized to manage this scheduled audit.",
    }
  );
});

test("Superadmin inherits Admin scheduled-audit management without coordinator identity", async () => {
  await withMockedAuditQueries(async () => {
    await assert.rejects(
      updateScheduledAudit(
        "ordinary-audit",
        { workflowMode: "legacy" },
        { name: "Superadmin", role: "super_admin" }
      ),
      {
        statusCode: 400,
        message: "Scheduled Audit workflow mode cannot be changed through this endpoint.",
      }
    );
  });
});
