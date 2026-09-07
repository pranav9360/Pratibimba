import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";

import Domain from "../models/Domain.js";
import Location from "../models/Location.js";
import AuditPlan from "../models/AuditPlan.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import Report from "../models/Report.js";

dotenv.config();

await connectDB();

const purpose =
  "To assess compliance with applicable processes, procedures and standards, identify opportunities for improvement, and strengthen process effectiveness.";

const plans = [
  {
    iqaNumber: "IQA-2026-0001",
    domain: "Seva Vasati",
    location: "Manjunatha Colony",
    sublocation: "",
    prakalpa: "Seva Vasati",
    auditPlannedDate: "2026-06-20",
    auditCoordinator: "Lokesh B.S",
    prakalphaPramukh: "Veeresh",
    auditAreas: ["SOPs & Compliance"],
    auditors: ["Lokesh B.S"],
    purpose,
    status: "scheduled"
  },

  {
    iqaNumber: "IQA-2026-0002",
    domain: "Yoga Kendra",
    location: "Jayanagara",
    sublocation: "",
    prakalpa: "Yoga Kendra",
    auditPlannedDate: "2026-07-27",
    auditCoordinator: "Vani.M",
    prakalphaPramukh: "Nagendra Kamath",
    auditAreas: ["Facility Maintenance"],
    auditors: [],
    purpose,
    status: "pending"
  },

  {
    iqaNumber: "IQA-2026-0003",
    domain: "Yoga Kendra",
    location: "Jayanagara",
    sublocation: "",
    prakalpa: "Yoga Kendra",
    auditPlannedDate: "2026-07-20",
    auditCoordinator: "Lokesh B.S",
    prakalphaPramukh: "Nagendra Kamath",
    auditAreas: ["SOPs & Compliance"],
    auditors: [],
    purpose,
    status: "pending"
  },

  {
    iqaNumber: "IQA-2026-0004",
    domain: "Mudranalaya",
    location: "Bangalore",
    sublocation: "",
    prakalpa: "Mudranalaya",
    auditPlannedDate: "2026-06-06",
    auditCoordinator: "Lokesh B.S",
    prakalphaPramukh: "Nagendra",
    auditAreas: ["SOPs & Compliance"],
    auditors: ["Lokesh B.S"],
    purpose,
    status: "completed"
  },

  {
    iqaNumber: "IQA-2026-0005",
    domain: "Mudranalaya",
    location: "Bangalore",
    sublocation: "",
    prakalpa: "Mudranalaya",
    auditPlannedDate: "2026-07-15",
    auditCoordinator: "Paniraj",
    prakalphaPramukh: "Nagendra",
    auditAreas: ["SOPs & Compliance"],
    auditors: ["paniraj"],
    purpose,
    status: "scheduled"
  },

  {
    iqaNumber: "IQA-2026-0006",
    domain: "JGRV Kalyan Nagar",
    location: "Bangalore",
    sublocation: "",
    prakalpa: "JGRV Kalyan Nagar",
    auditPlannedDate: "2026-09-22",
    auditCoordinator: "Lokesh B.S",
    prakalphaPramukh: "Gayathri",
    auditAreas: ["SOPs & Compliance"],
    auditors: [],
    purpose,
    status: "pending"
  },

  {
    iqaNumber: "IQA-2026-0007",
    domain: "Blood Center - Bangalore",
    location: "Bangalore",
    sublocation: "",
    prakalpa: "Blood Center - Bangalore",
    auditPlannedDate: "2026-12-30",
    auditCoordinator: "Vani.M",
    prakalphaPramukh: "Anuradha",
    auditAreas: ["Facility Maintenance"],
    auditors: [],
    purpose,
    status: "pending"
  }
];

const findings = [
  {
    iqrNumber: "IQR-2026-0001",
    severity: "open_for_improvement",
    findings: `Undocumented process -
(1) quotation - during the SOP audit, it was observed that quotation preparation is a critical process preceding the execution of any Mudranalaya job. To minimize the risk of errors related to GST inclusion/exclusion and the resulting need for credit notes and additional approval workflows, it is recommended to document an SOP for raising and approving quotations.
(2) job order creation - during the SOP audit, it was observed that critical job requirements are not always documented in the Job Order and are often communicated verbally based on staff experience. In Job Order No. J00619/26-27 for Abdaal Printers, Hubballi, the requirement for carton-box packing for outstation shipment was not recorded, and packing staff relied on verbal clarification from the supervisor. To minimize the risk of omissions and ensure consistent communication of requirements, it is recommended to document an SOP for Job Order creation and incorporate mandatory fields for production, packing (ex., customer provided box labels, new cover pages for a repeat order, etc.)., dispatch, and other customer-specific requirements.`
  },

  {
    iqrNumber: "IQR-2026-0002",
    severity: "non_conformance",
    findings:
      "During the SOP audit, the packing area was observed to be untidy and not maintained in accordance with the cleanliness and housekeeping requirements specified in the SOP. It is recommended to strengthen implementation of the SOP guidelines, establish regular housekeeping practices, and conduct periodic checks to ensure a clean, safe, and organized work environment."
  },

  {
    iqrNumber: "IQR-2026-0003",
    severity: "non_conformance",
    findings: `During the SOP audit, it was observed that operators in the CTP section and Packing section were using unrelated leftover registers for operational reference and record-keeping purposes. Specifically, a Regular Stock Ledger Register was being used in the CTP section, while a Blood Center Register was being used in the Packing section. These registers were not relevant to the respective work areas and did not align with the intended purpose of the documented processes.

Upon interaction, it was understood that the registers were being utilized simply because they were available as leftover printed stationery. The observation indicates a perception that any unused printed material can be put to use within Mudranalaya irrespective of its relevance to the process. Such practices may lead to confusion, poor document control, and an unprofessional work environment. Furthermore, the presence and continued use of unrelated materials on the shop floor reflect inadequate floor-level supervision and monitoring of workplace organization.

It is recommended to remove unrelated registers and printed materials from operational areas, ensure that only approved and relevant records/documents are available at workstations, strengthen floor supervision, and train all staff on housekeeping, workplace organization, and document control requirements to maintain a tidy, professional, and process-oriented work environment.

In addition, the administration should be more attentive in supporting staff (either on short/long term) by providing appropriate registers, forms, visual aids, work instructions, and other operational accessories required for their respective functions. Equipping employees with suitable resources can help improve efficiency, standardization, professionalism, and ultimately contribute to delivering high-quality outcomes that are aligned with the Organization's values and expectations.`
  },

  {
    iqrNumber: "IQR-2026-0004",
    severity: "open_for_improvement",
    findings:
      "During the SOP audit, it was observed that the documented SOPs for Computer-to-Plate Operations and CTP Storage Operations provide limited value in supporting day-to-day operations, as the content does not sufficiently guide staff on how activities are to be performed and controlled."
  },

  {
    iqrNumber: "IQR-2026-0005",
    severity: "open_for_improvement",
    findings:
      "No documented procedure for post-production management and storage of used CTPs"
  },

  {
    iqrNumber: "IQR-2026-0006",
    severity: "open_for_improvement",
    findings:
      "During the SOP audit, it was observed that the Perfect Binding machine has an in-built provision for extraction of fumes from the lower section of the machine. However, no separate exhaust fan or dedicated ventilation system was observed in the immediate work area to improve air circulation for operator safety and comfort."
  }
];

const locations = [
  {
    domain: "Seva Vasati",
    name: "Manjunatha Colony",
    sublocations: [],
    active: true
  },
  {
    domain: "Yoga Kendra",
    name: "Jayanagara",
    sublocations: [],
    active: true
  },
  {
    domain: "Mudranalaya",
    name: "Bangalore",
    sublocations: [],
    active: true
  },
  {
    domain: "JGRV Kalyan Nagar",
    name: "Bangalore",
    sublocations: [],
    active: true
  },
  {
    domain: "Blood Center - Bangalore",
    name: "Bangalore",
    sublocations: [],
    active: true
  }
];

for (const name of [...new Set(plans.map(p => p.domain))]) {
  await Domain.findOneAndUpdate(
    { name },
    { name, active: true },
    { upsert: true, new: true }
  );
}

for (const location of locations) {
  await Location.findOneAndUpdate(
    {
      domain: location.domain,
      name: location.name
    },
    location,
    {
      upsert: true,
      new: true
    }
  );
}

const planDocs = {};

for (const plan of plans) {
  const doc = await AuditPlan.findOneAndUpdate(
    { iqaNumber: plan.iqaNumber },
    plan,
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  planDocs[plan.iqaNumber] = doc;
}

const scheduledAudit = await ScheduledAudit.findOneAndUpdate(
  { iqaNumber: "IQA-2026-0004" },
  {
    auditPlan: planDocs["IQA-2026-0004"]._id,

    iqaNumber: "IQA-2026-0004",

    domain: "Mudranalaya",

    location: "Bangalore",

    sublocation: "",

    prakalpa: "Mudranalaya",

    prakalphaPramukh: "Nagendra",

    auditCoordinator: "Lokesh B.S",

    auditors: ["Lokesh B.S"],

    auditAreas: ["SOPs & Compliance"],

    purpose,

    startDate: "2026-06-06",

    endDate: "2026-06-06",

    status: "completed",

    mailSent: false
  },
  {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  }
);

for (const finding of findings) {
  await Report.findOneAndUpdate(
    { iqrNumber: finding.iqrNumber },
    {
      iqrNumber: finding.iqrNumber,

      auditPlan: planDocs["IQA-2026-0004"]._id,

      scheduledAudit: scheduledAudit._id,

      iqaNumber: "IQA-2026-0004",

      prakalpa: "Mudranalaya",

      domain: "Mudranalaya",

      location: "Bangalore",

      sublocation: "",

      auditCoordinator: "Lokesh B.S",

      auditors: ["Lokesh B.S"],

      auditAreas: ["SOPs & Compliance"],

      purpose,

      prakalphaPramukh: "Nagendra",

      visitDate: "2026-06-06",

      visitTime: "9:30 AM to 1:00 PM",

      severity: finding.severity,

      findings: finding.findings,

      proofFiles: [],

      hasChecklist: false,

      status: "open",

      reportCreatedOn: "2026-06-06"
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
}

console.log("Real test data seed complete.");

await mongoose.disconnect();