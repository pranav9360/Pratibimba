import AuditPlan from "../models/AuditPlan.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import Report from "../models/Report.js";
import Prakalpa from "../models/Prakalpa.js";
import Location from "../models/Location.js";
import AppError from "../utils/AppError.js";

const getNextIqaNumber = async () => {
  const currentYear = new Date().getFullYear();
  const pattern = new RegExp(`^IQA-${currentYear}-(\\d{4})$`);

  const [plans, scheduledAudits, reports] = await Promise.all([
    AuditPlan.find(
      { iqaNumber: new RegExp(`^IQA-${currentYear}-`) },
      "iqaNumber"
    ).lean(),

    ScheduledAudit.find(
      { iqaNumber: new RegExp(`^IQA-${currentYear}-`) },
      "iqaNumber"
    ).lean(),

    Report.find(
      { iqaNumber: new RegExp(`^IQA-${currentYear}-`) },
      "iqaNumber"
    ).lean(),
  ]);

  let maxNumber = 0;

  const records = [
    ...plans,
    ...scheduledAudits,
    ...reports,
  ];

  for (const record of records) {
    if (!record.iqaNumber) continue;

    const match = record.iqaNumber.match(pattern);

    if (!match) continue;

    const number = parseInt(match[1], 10);

    if (number > maxNumber) {
      maxNumber = number;
    }
  }

  const nextNumber = maxNumber + 1;

  return `IQA-${currentYear}-${String(nextNumber).padStart(4, "0")}`;
};

/*
 * ============================================================
 * Audit Plan jurisdiction
 * ============================================================
 *
 * Planning and operational execution are separate concerns.
 *
 * Super Admin / Admin:
 *   application-wide Audit Plan access.
 *
 * Audit Coordinator:
 *   may read only Audit Plans explicitly assigned to them.
 *
 * Lead Auditor / Auditor:
 *   operational visibility comes from ScheduledAudit.
 *
 * Prakalpa Manager:
 *   visibility belongs to the Report workflow.
 */

const normalizeUserValue = (value) =>
  String(value || "").trim();


const getAuditPlanReadJurisdiction = (user) => {
  if (!user) {
    throw new AppError(
      "Authentication required",
      401
    );
  }

  const role =
    normalizeUserValue(user.role);

  const name =
    normalizeUserValue(user.name);

  if (
    role === "super_admin" ||
    role === "admin"
  ) {
    return {};
  }

  if (role === "audit_coordinator") {
    if (!name) {
      throw new AppError(
        "Authenticated user has no valid identity.",
        403
      );
    }

    return {
      auditCoordinator: name,
    };
  }

  /*
   * No Audit Plan visibility for operational/report roles.
   */
  return {
    _id: null,
  };
};


export const getAuditPlans = async (user) => {
  const jurisdiction =
    getAuditPlanReadJurisdiction(user);

  return await AuditPlan.find(jurisdiction)
    .collation({
      locale: "en",
      numericOrdering: true,
    })
    .sort({
      iqaNumber: 1,
    });
};


export const getAuditPlanById = async (
  id,
  user
) => {
  const jurisdiction =
    getAuditPlanReadJurisdiction(user);

  const plan = await AuditPlan.findOne({
    _id: id,
    ...jurisdiction,
  });

  if (!plan) {
    throw new AppError(
      "Audit Plan not found",
      404
    );
  }

  return plan;
};


/*
 * ============================================================
 * Planning management
 * ============================================================
 *
 * Only Admin/Super Admin may create/edit/delete planning data.
 *
 * Route authorization also enforces this, but service-level
 * enforcement prevents future route changes from accidentally
 * bypassing the workflow.
 */
const assertPlanningAdministrator = (user) => {
  if (!user) {
    throw new AppError(
      "Authentication required",
      401
    );
  }

  const role =
    normalizeUserValue(user.role);

  if (
    role !== "super_admin" &&
    role !== "admin"
  ) {
    throw new AppError(
      "You are not authorized to manage Audit Plans.",
      403
    );
  }
};


/*
 * ============================================================
 * Scheduling ownership
 * ============================================================
 *
 * Admin/Super Admin retain oversight.
 *
 * Audit Coordinator may schedule/unschedule only plans
 * explicitly assigned to their authenticated identity.
 */
const getSchedulableAuditPlan = async (
  id,
  user
) => {
  if (!user) {
    throw new AppError(
      "Authentication required",
      401
    );
  }

  const role =
    normalizeUserValue(user.role);

  const name =
    normalizeUserValue(user.name);

  const filter = {
    _id: id,
  };

  if (
    role === "super_admin" ||
    role === "admin"
  ) {
    // Administrative oversight.
  } else if (
    role === "audit_coordinator"
  ) {
    if (!name) {
      throw new AppError(
        "Authenticated user has no valid identity.",
        403
      );
    }

    filter.auditCoordinator = name;
  } else {
    throw new AppError(
      "You are not authorized to schedule this Audit Plan.",
      403
    );
  }

  const plan =
    await AuditPlan.findOne(filter);

  if (!plan) {
    /*
     * Do not reveal whether another user's plan exists.
     */
    throw new AppError(
      "Audit Plan not found",
      404
    );
  }

  return plan;
};

/**
 * Resolve and validate Audit Plan organisational master data.
 *
 * Prakalpa Management is the source of truth for:
 * - Prakalpa
 * - Prakalpa Pramukh
 * - allowed Audit Areas
 *
 * Location Management is the source of truth for:
 * - Location
 * - Sublocations
 */
const resolvePlanningMasterData = async (data) => {
  const prakalpaName = String(data.prakalpa || "").trim();
  const locationName = String(data.location || "").trim();
  const sublocationName = String(data.sublocation || "").trim();

  if (!prakalpaName) {
    throw new AppError("Prakalpa is required.", 400);
  }

  const prakalpa = await Prakalpa.findOne({
    name: prakalpaName,
    active: true,
  });

  if (!prakalpa) {
    throw new AppError(
      "Selected Prakalpa does not exist or is inactive.",
      400
    );
  }

  const pramukh = String(
    prakalpa.prakalpaPramukh || ""
  ).trim();

  if (!pramukh) {
    throw new AppError(
      `Prakalpa Pramukh is not configured for ${prakalpa.name}. Please configure it in Prakalpa Management.`,
      400
    );
  }

  /*
   * Location is required only when this Prakalpa has
   * official active Location master records.
   *
   * Never create or infer a Location here.
   */
  const configuredLocations = await Location.find({
    prakalpa: prakalpa.name,
    active: true,
  });

  let location = null;
  let configuredSublocations = [];

  if (configuredLocations.length > 0) {
    if (!locationName) {
      throw new AppError(
        `Please select a Location for ${prakalpa.name}.`,
        400
      );
    }

    location = configuredLocations.find(
      (item) =>
        String(item.name || "").trim() === locationName
    );

    if (!location) {
      throw new AppError(
        `Location "${locationName}" does not belong to ${prakalpa.name} or is inactive.`,
        400
      );
    }

    configuredSublocations = (
      location.sublocations || []
    )
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (
      sublocationName &&
      !configuredSublocations.includes(sublocationName)
    ) {
      throw new AppError(
        `Sublocation "${sublocationName}" does not belong to location "${location.name}".`,
        400
      );
    }
  } else {
    /*
     * No official Location records exist for this Prakalpa.
     * Do not manufacture one.
     *
     * Also reject a client trying to inject a Location that
     * is not present in master data.
     */
    if (locationName) {
      throw new AppError(
        `No Locations are configured for ${prakalpa.name}. Please configure official Location data before using a Location.`,
        400
      );
    }

    if (sublocationName) {
      throw new AppError(
        `A Sublocation cannot be selected because no Location is configured for ${prakalpa.name}.`,
        400
      );
    }
  }

  const configuredAuditAreas = (
    prakalpa.auditAreas || []
  )
    .map((value) => String(value).trim())
    .filter(Boolean);

  const requestedAuditAreas = Array.isArray(data.auditAreas)
    ? [
        ...new Set(
          data.auditAreas
            .map((value) => String(value).trim())
            .filter(Boolean)
        ),
      ]
    : [];

  if (requestedAuditAreas.length === 0) {
    throw new AppError(
      "Please select at least one Audit Area.",
      400
    );
  }

  const invalidAuditAreas = requestedAuditAreas.filter(
    (area) => !configuredAuditAreas.includes(area)
  );

  if (invalidAuditAreas.length > 0) {
    throw new AppError(
      `Invalid Audit Area selection for ${prakalpa.name}: ${invalidAuditAreas.join(", ")}`,
      400
    );
  }

  return {
    prakalpa: prakalpa.name,
    location: location ? location.name : "",
    sublocation: location ? sublocationName : "",
    prakalphaPramukh: pramukh,
    auditAreas: requestedAuditAreas,
  };
};


export const createAuditPlan = async (
  data,
  user
) => {
  assertPlanningAdministrator(user);

  const masterData =
    await resolvePlanningMasterData(data);

  const iqaNumber = await getNextIqaNumber();

  /*
   * Auditor assignment belongs to scheduling.
   *
   * Master-data-owned fields are also removed from
   * the request before persistence. Their validated
   * values come exclusively from master data.
   */
  const {
    auditors: _ignoredAuditors,
    status: _ignoredStatus,
    prakalpa: _ignoredPrakalpa,
    location: _ignoredLocation,
    sublocation: _ignoredSublocation,
    prakalphaPramukh: _ignoredPramukh,
    auditAreas: _ignoredAuditAreas,
    ...planningData
  } = data;

  const auditPlan = await AuditPlan.create({
    ...planningData,
    ...masterData,
    auditors: [],
    status: "pending",
    iqaNumber,
  });

  return await AuditPlan.findById(auditPlan._id);
};

export const updateAuditPlan = async (
  id,
  data,
  user
) => {
  assertPlanningAdministrator(user);

  const plan = await AuditPlan.findById(id);

  if (!plan) {
    throw new AppError("Audit Plan not found", 404);
  }

  /*
   * Completed AuditPlans are historical records.
   */
  if (plan.status === "completed") {
    throw new AppError(
      "Completed audit plans cannot be edited.",
      400
    );
  }

  /*
   * Normal Audit Plan editing is allowed only while
   * the plan is pending/planned.
   *
   * Scheduled-audit changes are handled by
   * scheduledAuditService, which synchronizes the
   * master AuditPlan directly.
   */
  if (plan.status === "scheduled") {
    throw new AppError(
      "Scheduled audits must be edited from Scheduled Audits.",
      400
    );
  }

  /*
   * Build the complete planning state first.
   *
   * This is important for partial PUT/update requests:
   * unchanged values come from the existing plan while
   * submitted values override them.
   */
  const candidatePlanningData = {
    prakalpa:
      data.prakalpa !== undefined
        ? data.prakalpa
        : plan.prakalpa,

    location:
      data.location !== undefined
        ? data.location
        : plan.location,

    sublocation:
      data.sublocation !== undefined
        ? data.sublocation
        : plan.sublocation,

    auditAreas:
      data.auditAreas !== undefined
        ? data.auditAreas
        : plan.auditAreas,
  };

  const masterData =
    await resolvePlanningMasterData(
      candidatePlanningData
    );

  /*
   * Auditors do not belong to planning.
   *
   * Master-data-owned fields cannot be directly
   * overwritten by the client.
   */
  const {
    auditors: _ignoredAuditors,
    status: _ignoredStatus,
    prakalpa: _ignoredPrakalpa,
    location: _ignoredLocation,
    sublocation: _ignoredSublocation,
    prakalphaPramukh: _ignoredPramukh,
    auditAreas: _ignoredAuditAreas,
    ...planningData
  } = data;

  Object.assign(
    plan,
    planningData,
    masterData
  );

  /*
   * A plan edited from Audit Plan remains pending.
   */
  plan.status = "pending";
  plan.auditors = [];

  await plan.save();

  return await AuditPlan.findById(plan._id);
};

export const deleteAuditPlan = async (
  id,
  user
) => {
  assertPlanningAdministrator(user);

  const plan = await AuditPlan.findById(id);

  if (!plan) {
    throw new AppError("Audit Plan not found", 404);
  }

  if (plan.status === "scheduled") {
    throw new AppError(
      "A scheduled audit cannot be deleted from the audit lifecycle.",
      400
    );
  }

  if (plan.status === "completed") {
    throw new AppError(
      "A completed audit cannot be deleted from the audit lifecycle.",
      400
    );
  }

  await ScheduledAudit.deleteOne({
    auditPlan: plan._id,
  });

  await plan.deleteOne();

  return;
};

export const scheduleAuditPlan = async (
  id,
  scheduleData,
  user
) => {
  const plan =
    await getSchedulableAuditPlan(
      id,
      user
    );

  if (plan.status === "completed") {
    throw new AppError(
      "Completed audits cannot be scheduled.",
      400
    );
  }

  if (plan.status === "scheduled") {
    throw new AppError(
      "This audit is already scheduled.",
      400
    );
  }

  /*
   * Coordinator ownership is planning data.
   *
   * The coordinator was assigned by Admin/Super Admin when the
   * Audit Plan was created/edited.
   *
   * Scheduling MUST NOT transfer plan ownership based on
   * client-supplied auditCoordinator data.
   */
  /*
   * Auditors are assigned during scheduling.
   */
  if (
    !Array.isArray(scheduleData.auditors) ||
    scheduleData.auditors.length === 0
  ) {
    throw new AppError(
      "Please select at least one auditor before scheduling.",
      400
    );
  }

  plan.auditors = scheduleData.auditors;

  /*
   * Lead Auditor is an explicit workflow assignment.
   *
   * leadAuditor is the canonical workflow field.
   *
   * Never automatically promote auditors[0].
   */
  const requestedLeadAuditor = String(
    scheduleData.leadAuditor ||
    ""
  ).trim();

  if (!requestedLeadAuditor) {
    throw new AppError(
      "Please select a Lead Auditor before scheduling.",
      400
    );
  }

  if (!plan.auditors.includes(requestedLeadAuditor)) {
    throw new AppError(
      "Lead Auditor must be one of the assigned auditors.",
      400
    );
  }

  /*
   * The scheduled start date becomes the current
   * operational audit date on the master AuditPlan.
   */
  const requestedStartDate =
    scheduleData.startDate ||
    scheduleData.auditPlannedDate ||
    plan.auditPlannedDate;

  const requestedEndDate =
    scheduleData.endDate ||
    requestedStartDate;

  const startDate =
    new Date(requestedStartDate);

  const endDate =
    new Date(requestedEndDate);

  if (Number.isNaN(startDate.getTime())) {
    throw new AppError(
      "Invalid Start Date.",
      400
    );
  }

  if (Number.isNaN(endDate.getTime())) {
    throw new AppError(
      "Invalid End Date.",
      400
    );
  }

  if (endDate < startDate) {
    throw new AppError(
      "End Date cannot be before Start Date.",
      400
    );
  }

  plan.auditPlannedDate = startDate;
  plan.status = "scheduled";

  await plan.save();

  let scheduledAudit =
    await ScheduledAudit.findOne({
      auditPlan: plan._id,
    });

  const scheduledAuditData = {
    auditPlan: plan._id,
    iqaNumber: plan.iqaNumber,
    prakalpa: plan.prakalpa,
    location: plan.location,
    sublocation: plan.sublocation,
    auditCoordinator: plan.auditCoordinator,
    prakalphaPramukh: plan.prakalphaPramukh,
    auditAreas: plan.auditAreas,
    purpose: plan.purpose || "",
    auditors: plan.auditors,
    leadAuditor: requestedLeadAuditor,
    startDate,
    endDate,
    status: "upcoming",
    mailSent: false,
  };

  if (scheduledAudit) {
    Object.assign(
      scheduledAudit,
      scheduledAuditData
    );

    await scheduledAudit.save();
  } else {
    scheduledAudit =
      new ScheduledAudit(
        scheduledAuditData
      );

    await scheduledAudit.save();
  }

  return await AuditPlan.findById(plan._id);
};

/*
 * Move scheduled → pending/planned.
 *
 * Scheduling-only information is removed by deleting
 * the linked ScheduledAudit.
 *
 * Coordinator remains on AuditPlan because it is a
 * planning-phase value.
 *
 * Auditors are cleared because they belong to the
 * scheduling phase.
 */
export const unscheduleAuditPlan = async (
  id,
  user
) => {
  const plan =
    await getSchedulableAuditPlan(
      id,
      user
    );

  if (plan.status === "completed") {
    throw new AppError(
      "Completed audits cannot be unscheduled.",
      400
    );
  }

  if (plan.status !== "scheduled") {
    throw new AppError(
      "Only scheduled audit plans can be unscheduled.",
      400
    );
  }

  await ScheduledAudit.deleteOne({
    auditPlan: plan._id,
  });

  plan.status = "pending";

  /*
   * Auditors must be selected again the next time
   * this plan is scheduled.
   */
  plan.auditors = [];

  await plan.save();

  return plan;
};
