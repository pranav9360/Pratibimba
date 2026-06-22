const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "..", "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const workbook = XLSX.utils.book_new();

const prakalpas = [
  {
    name: "School",
    prakalpaPramukh: "Ashish Ji",
    prakalpaPramukhEmail: "ashish@example.com",
    pramukhSeniorEmail: "senior-school@example.com"
  }
];

const locations = [
  {
    prakalpaName: "School",
    locationName: "Mysore Center"
  }
];

const auditPlans = [
  {
    prakalpaName: "School",
    locationName: "Mysore Center",
    auditPlannedDate: "2026-07-10",
    expectedEndDate: "2026-07-12",
    auditCoordinator: "Chirag",
    auditPurpose: "Internal quality audit",
    mostProbableAuditor: "Auditor 2",
    auditAreas: "Documentation, Operations",
    planPassword: "test456"
  }
];

const reports = [
  {
    auditId: "IQA202600001",
    internalAuditDate: "2026-07-02",
    timeVisited: "11:00 AM",
    auditArea: "Operations",
    auditFindings: "Process records need better tracking.",
    classification: "OFI",
    status: "open",
    correctiveAction: "",
    dueDate: "2026-08-05"
  }
];

XLSX.utils.book_append_sheet(
  workbook,
  XLSX.utils.json_to_sheet(prakalpas),
  "Prakalpas"
);

XLSX.utils.book_append_sheet(
  workbook,
  XLSX.utils.json_to_sheet(locations),
  "Locations"
);

XLSX.utils.book_append_sheet(
  workbook,
  XLSX.utils.json_to_sheet(auditPlans),
  "AuditPlans"
);

XLSX.utils.book_append_sheet(
  workbook,
  XLSX.utils.json_to_sheet(reports),
  "Reports"
);

const outputPath = path.join(dataDir, "import-template.xlsx");

XLSX.writeFile(workbook, outputPath);

console.log("Import template created at:", outputPath);