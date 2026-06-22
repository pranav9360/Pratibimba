const XLSX = require("xlsx");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const Prakalpa = require("../models/Prakalpa");
const Location = require("../models/Location");
const AuditPlan = require("../models/AuditPlan");
const Report = require("../models/Report");

const filePath = path.join(__dirname, "..", "data", "import-template.xlsx");

function readSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    console.log(`Sheet not found: ${sheetName}`);
    return [];
  }

  return XLSX.utils.sheet_to_json(sheet);
}

function generateAuditId(count) {
  const year = new Date().getFullYear();
  return `IQA${year}${String(count + 1).padStart(5, "0")}`;
}

function generateReportId(count) {
  const year = new Date().getFullYear();
  return `IQR${year}${String(count + 1).padStart(5, "0")}`;
}

async function importPrakalpas(rows) {
  for (const row of rows) {
    if (!row.name) continue;

    await Prakalpa.findOneAndUpdate(
      { name: row.name },
      {
        name: row.name,
        prakalpaPramukh: row.prakalpaPramukh || "",
        prakalpaPramukhEmail: row.prakalpaPramukhEmail || "",
        pramukhSeniorEmail: row.pramukhSeniorEmail || ""
      },
      { upsert: true, new: true }
    );
  }

  console.log(`Prakalpas imported: ${rows.length}`);
}

async function importLocations(rows) {
  for (const row of rows) {
    if (!row.prakalpaName || !row.locationName) continue;

    const prakalpa = await Prakalpa.findOne({ name: row.prakalpaName });

    if (!prakalpa) {
      console.log(`Skipped location. Prakalpa not found: ${row.prakalpaName}`);
      continue;
    }

    await Location.findOneAndUpdate(
      {
        name: row.locationName,
        prakalpaId: prakalpa._id
      },
      {
        name: row.locationName,
        prakalpaId: prakalpa._id
      },
      { upsert: true, new: true }
    );
  }

  console.log(`Locations imported: ${rows.length}`);
}

async function importAuditPlans(rows) {
  for (const row of rows) {
    if (!row.prakalpaName) continue;

    const prakalpa = await Prakalpa.findOne({ name: row.prakalpaName });

    if (!prakalpa) {
      console.log(`Skipped audit plan. Prakalpa not found: ${row.prakalpaName}`);
      continue;
    }

    let location = null;

    if (row.locationName) {
      location = await Location.findOne({
        name: row.locationName,
        prakalpaId: prakalpa._id
      });
    }

    const auditCount = await AuditPlan.countDocuments();
    const auditId = generateAuditId(auditCount);

    const auditAreas =
      typeof row.auditAreas === "string"
        ? row.auditAreas.split(",").map((area) => area.trim())
        : [];

    await AuditPlan.create({
      auditId,
      prakalpaId: prakalpa._id,
      locationId: location?._id || null,
      auditPlannedDate: row.auditPlannedDate,
      expectedEndDate: row.expectedEndDate,
      auditCoordinator: row.auditCoordinator || "",
      auditPurpose: row.auditPurpose || "",
      mostProbableAuditor: row.mostProbableAuditor || "",
      auditAreas,
      planPassword: row.planPassword || "",
      status: "planned"
    });
  }

  console.log(`Audit plans imported: ${rows.length}`);
}

async function importReports(rows) {
  for (const row of rows) {
    if (!row.auditId || !row.auditFindings || !row.classification) continue;

    const auditPlan = await AuditPlan.findOne({ auditId: row.auditId });

    if (!auditPlan) {
      console.log(`Skipped report. Audit ID not found: ${row.auditId}`);
      continue;
    }

    const reportCount = await Report.countDocuments();
    const reportId = generateReportId(reportCount);

    await Report.create({
      reportId,
      auditId: row.auditId,
      prakalpaId: auditPlan.prakalpaId,
      locationId: auditPlan.locationId,
      internalAuditDate: row.internalAuditDate,
      timeVisited: row.timeVisited || "",
      auditArea: row.auditArea || "",
      auditFindings: row.auditFindings,
      classification: row.classification,
      status: row.status || "open",
      correctiveAction: row.correctiveAction || "",
      dueDate: row.dueDate || null
    });
  }

  console.log(`Reports imported: ${rows.length}`);
}

async function runImport() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const workbook = XLSX.readFile(filePath);

    const prakalpaRows = readSheet(workbook, "Prakalpas");
    const locationRows = readSheet(workbook, "Locations");
    const auditPlanRows = readSheet(workbook, "AuditPlans");
    const reportRows = readSheet(workbook, "Reports");

    await importPrakalpas(prakalpaRows);
    await importLocations(locationRows);
    await importAuditPlans(auditPlanRows);
    await importReports(reportRows);

    console.log("Excel import completed successfully");
    await mongoose.disconnect();
  } catch (err) {
    console.error("Excel import failed:", err.message);
    await mongoose.disconnect();
  }
}

runImport();