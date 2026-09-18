import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

import AuditPlan from "../models/AuditPlan.js";
import ScheduledAudit from "../models/ScheduledAudit.js";

const APPLY = process.argv.includes("--apply");

const cleanString = (value) =>
  typeof value === "string" ? value.trim() : "";

const sameId = (a, b) => {
  if (!a || !b) return false;
  return String(a) === String(b);
};

const makeBackup = async () => {
  const backupDir = path.resolve(
    process.cwd(),
    "backups"
  );

  fs.mkdirSync(backupDir, {
    recursive: true,
  });

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const plans = await AuditPlan.find({})
    .lean();

  const scheduled =
    await ScheduledAudit.find({})
      .lean();

  const backupPath = path.join(
    backupDir,
    `pre-legacy-scheduled-migration-${stamp}.json`
  );

  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        createdAt:
          new Date().toISOString(),
        auditPlans: plans,
        scheduledAudits:
          scheduled,
      },
      null,
      2
    )
  );

  return backupPath;
};

const buildPlanFromScheduled = (
  audit
) => {
  return {
    iqaNumber:
      cleanString(
        audit.iqaNumber
      ),

    domain:
      cleanString(
        audit.domain
      ),

    location:
      cleanString(
        audit.location
      ),

    sublocation:
      cleanString(
        audit.sublocation
      ),

    prakalpa:
      cleanString(
        audit.prakalpa
      ),

    auditPlannedDate:
      audit.startDate,

    auditCoordinator:
      cleanString(
        audit.auditCoordinator
      ),

    prakalphaPramukh:
      cleanString(
        audit.prakalphaPramukh
      ),

    auditAreas:
      Array.isArray(
        audit.auditAreas
      )
        ? audit.auditAreas.filter(
            Boolean
          )
        : [],

    auditors:
      Array.isArray(
        audit.auditors
      )
        ? audit.auditors.filter(
            Boolean
          )
        : [],

    purpose:
      cleanString(
        audit.purpose
      ),

    status: "scheduled",
  };
};

const validateNewPlan = (
  plan
) => {
  const missing = [];

  if (!plan.iqaNumber) {
    missing.push(
      "iqaNumber"
    );
  }

  if (!plan.domain) {
    missing.push(
      "domain"
    );
  }

  if (!plan.location) {
    missing.push(
      "location"
    );
  }

  if (
    !plan.auditPlannedDate
  ) {
    missing.push(
      "auditPlannedDate/startDate"
    );
  }

  if (
    !plan.auditCoordinator
  ) {
    missing.push(
      "auditCoordinator"
    );
  }

  if (
    !plan.prakalphaPramukh
  ) {
    missing.push(
      "prakalphaPramukh"
    );
  }

  return missing;
};

async function run() {
  try {
    if (
      !process.env.MONGO_URI
    ) {
      throw new Error(
        "MONGODB_URI is not configured in backend/.env"
      );
    }

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log("");
    console.log(
      "=============================================="
    );
    console.log(
      " PRATIBIMBA LEGACY SCHEDULED AUDIT MIGRATION"
    );
    console.log(
      "=============================================="
    );
    console.log(
      `Mode: ${
        APPLY
          ? "APPLY — DATABASE WILL BE UPDATED"
          : "DRY RUN — NO DATABASE CHANGES"
      }`
    );
    console.log("");

    const scheduledAudits =
      await ScheduledAudit.find(
        {}
      )
        .sort({
          createdAt: 1,
        })
        .lean();

    console.log(
      `ScheduledAudit records found: ${scheduledAudits.length}`
    );
    console.log("");

    let wouldCreate = 0;
    let wouldRelink = 0;
    let wouldUpdateStatus = 0;
    let alreadyCorrect = 0;
    let blocked = 0;

    const actions = [];

    for (
      const audit of
      scheduledAudits
    ) {
      const iqaNumber =
        cleanString(
          audit.iqaNumber
        );

      const existingPlan =
        await AuditPlan.findOne({
          iqaNumber,
        });

      /*
       * CASE 1:
       * AuditPlan already exists.
       */
      if (existingPlan) {
        const needsRelink =
          !sameId(
            audit.auditPlan,
            existingPlan._id
          );

        const shouldBecomeScheduled =
          existingPlan.status ===
          "pending";

        if (
          !needsRelink &&
          !shouldBecomeScheduled
        ) {
          alreadyCorrect++;

          actions.push({
            IQA: iqaNumber,
            Action:
              "ALREADY CORRECT",
            PlanStatus:
              existingPlan.status,
            Link:
              "OK",
          });

          continue;
        }

        if (needsRelink) {
          wouldRelink++;
        }

        if (
          shouldBecomeScheduled
        ) {
          wouldUpdateStatus++;
        }

        actions.push({
          IQA: iqaNumber,
          Action: [
            needsRelink
              ? "RELINK"
              : null,
            shouldBecomeScheduled
              ? "STATUS -> scheduled"
              : null,
          ]
            .filter(Boolean)
            .join(" + "),

          PlanStatus:
            existingPlan.status,

          Link:
            needsRelink
              ? "FIX"
              : "OK",
        });

        if (APPLY) {
          if (
            shouldBecomeScheduled
          ) {
            existingPlan.status =
              "scheduled";

            await existingPlan.save();
          }

          if (needsRelink) {
            await ScheduledAudit.updateOne(
              {
                _id:
                  audit._id,
              },
              {
                $set: {
                  auditPlan:
                    existingPlan._id,
                },
              }
            );
          }
        }

        continue;
      }

      /*
       * CASE 2:
       * ScheduledAudit exists but no AuditPlan
       * exists with the same IQA number.
       *
       * Build a new AuditPlan from the old
       * ScheduledAudit data.
       */
      const newPlanData =
        buildPlanFromScheduled(
          audit
        );

      const missing =
        validateNewPlan(
          newPlanData
        );

      if (
        missing.length > 0
      ) {
        blocked++;

        actions.push({
          IQA:
            iqaNumber ||
            "(missing IQA)",
          Action:
            "BLOCKED",
          PlanStatus:
            "—",
          Link:
            `Missing: ${missing.join(
              ", "
            )}`,
        });

        continue;
      }

      wouldCreate++;

      actions.push({
        IQA: iqaNumber,
        Action:
          "CREATE AUDIT PLAN",
        PlanStatus:
          "scheduled",
        Link:
          "LINK EXISTING SCHEDULED AUDIT",
      });

      if (APPLY) {
        const createdPlan =
          await AuditPlan.create(
            newPlanData
          );

        await ScheduledAudit.updateOne(
          {
            _id:
              audit._id,
          },
          {
            $set: {
              auditPlan:
                createdPlan._id,
            },
          }
        );

        console.log(
          `Created AuditPlan ${iqaNumber} and linked ScheduledAudit`
        );
      }
    }

    console.log("");
    console.log(
      "=============================================="
    );
    console.log(
      " ACTIONS"
    );
    console.log(
      "=============================================="
    );

    if (
      actions.length > 0
    ) {
      console.table(
        actions
      );
    } else {
      console.log(
        "No ScheduledAudit records found."
      );
    }

    console.log("");
    console.log(
      "=============================================="
    );
    console.log(
      " SUMMARY"
    );
    console.log(
      "=============================================="
    );

    console.log(
      `AuditPlans to create:        ${wouldCreate}`
    );

    console.log(
      `ScheduledAudits to relink:   ${wouldRelink}`
    );

    console.log(
      `Pending plans -> scheduled:  ${wouldUpdateStatus}`
    );

    console.log(
      `Already correct:             ${alreadyCorrect}`
    );

    console.log(
      `Blocked / missing data:      ${blocked}`
    );

    console.log("");

    if (!APPLY) {
      console.log(
        "DRY RUN COMPLETE."
      );

      console.log(
        "No MongoDB records were changed."
      );

      console.log("");
      console.log(
        "Review the table above before running:"
      );

      console.log(
        "node scripts/migrateLegacyScheduledAudits.js --apply"
      );
    } else {
      console.log(
        "Creating pre-migration backup record..."
      );

      /*
       * Note:
       * The backup is most useful when created BEFORE
       * writes. This second snapshot records the resulting
       * state too. We print it explicitly.
       */
      const postPath =
        await makeBackup();

      console.log(
        `Migration snapshot saved to: ${postPath}`
      );

      console.log("");
      console.log(
        "MIGRATION COMPLETE."
      );
    }
  } catch (error) {
    console.error("");
    console.error(
      "MIGRATION FAILED:"
    );

    console.error(
      error
    );

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
