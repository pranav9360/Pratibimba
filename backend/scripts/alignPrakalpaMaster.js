import "dotenv/config";
import mongoose from "mongoose";
import Prakalpa from "../models/Prakalpa.js";

/*
 * SOURCE:
 * Plan(3).xlsx
 *   - "Prakalpa" sheet
 *   - "Audit Areas" sheet
 *
 * IMPORTANT:
 * Missing workbook values remain blank.
 * We DO NOT invent Pramukhs/emails.
 * Locations are handled separately because existing DB
 * and workbook location data need reconciliation.
 */

const ALL_AREAS = [
  "Repairs & Maintenance",
  "Human Resource",
  "IT",
  "Administration",
  "Transport",
  "SOPs",
  "Compliance",
];

const records = [
  ["Yoga Kendra","Nagendra Kamath","kamathnagendra76@gmail.com","rpnarayana@gmail.com",["Repairs & Maintenance","Administration","SOPs","Compliance"]],
  ["Seva Vasati","Veeresh","seva.vasathi@rashtrotthana.org","ravirpedu@gmail.com",["SOPs","Compliance"]],
  ["Samvit","Vasanthlakshmi","general.manager@samvitresearch.org","Gajanan@samvitresearch.org",["SOPs"]],
  ["Human Resource (HR)","Sudrashan","hr2@rashtrotthana.org","dinesh@rashtrotthana.org",["SOPs","Compliance"]],
  ["Finance and Accounts","Nagesh Nayak","finance1@rashtrotthana.org","dinesh@rashtrotthana.org",["SOPs","Compliance"]],
  ["Tapas","Rukmini","karthik.rukmini@gmail.com","ravirpedu@gmail.com",["Repairs & Maintenance","IT","SOPs","Compliance"]],
  ["Saadhana","Rukmini","karthik.rukmini@gmail.com","ravirpedu@gmail.com",["Repairs & Maintenance","IT","SOPs","Compliance"]],
  ["Blood Center - Bangalore","Anuradha","ts.rbcblr@rashtrotthana.org","rpnarayana@gmail.com",ALL_AREAS],
  ["Blood Center - Huballi","Dattamurthy","admin.rbbhbl@rashtrotthana.org","rpnarayana@gmail.com",ALL_AREAS],
  ["Madhav Srushti","Jeevan Kumar","jeevankumar1976@gmail.com","ravirpedu@gmail.com",["Repairs & Maintenance","Human Resource","Administration","Transport","SOPs","Compliance"]],
  ["RVK Davanagere","Pradhanacharya","principal.rvkdvg@rvkcbse.in","Correspondent@rvkb.edu.in",ALL_AREAS],
  ["RVK Banashankari","Pradhanacharya","principalrvkbsk@gmail.com","Correspondent@rvkb.edu.in",ALL_AREAS],
  ["RVK-A Thanisandra","Pradhanacharya","principal@rvkb.edu.in","Correspondent@rvkb.edu.in",ALL_AREAS],
  ["JGRVK Ramamurthy Nagara","Pradhanacharya","principaljgrvkb@gmail.com","Correspondent@rvkb.edu.in",ALL_AREAS],
  ["Sahitya","Mohan","","rpnarayana@gmail.com",["Human Resource","SOPs"]],
  ["Mudranalaya","Nagendra","manager.mudrana@rashtrotthana.org","rpnarayana@gmail.com",["Repairs & Maintenance","Human Resource","IT","Administration","SOPs","Compliance"]],
  ["Prashikshana Bharati","Basavaraj","basavarajarp@gmail.com","ravirpedu@gmail.com",["SOPs","Compliance"]],
  ["Quality and Systems","Ravindra","ravindra.murthy@rashtrotthana.org","dinesh@rashtrotthana.org",["SOPs"]],
  ["HO Admin & Facilities","Venkoba Rao","admin@rashtrotthana.org","dinesh@rashtrotthana.org",["Repairs & Maintenance","Human Resource","Transport","SOPs","Compliance"]],
  ["RVK Mysore - Srinagar","Pradhanacharya","principalmyssn@rvkcbse.in","Correspondent@rvkb.edu.in",ALL_AREAS],
  ["RVK Mysore - Vijayanagar","Pradhanacharya","mysv@rvkcbse.in","Correspondent@rvkb.edu.in",ALL_AREAS],
  ["RVK Dharwad","Pradhanacharya","principalrvkd@yahoo.com","Correspondent@rvkb.edu.in",ALL_AREAS],
  ["RVK Hagaribommanahalli","Pradhanacharya","mbranganatha@gmail.com","Correspondent@rvkb.edu.in",ALL_AREAS],
  ["Media","Bharateesh","media@rashtrotthana.org","rpnarayana@gmail.com",["SOPs","Compliance"]],
  ["JGRV Kalyan Nagar","Gayathri","principal.jgrv@rashtrotthana.org","asha.ashok@rashtrotthana.org",["Repairs & Maintenance","Human Resource","IT","Administration","SOPs","Compliance"]],

  // Workbook contains these but currently has no Pramukh.
  ["RV-Holehonnuru","","","",["Repairs & Maintenance","Human Resource","IT","Administration","SOPs","Compliance"]],
  ["RV-Davanagere","","","",["Repairs & Maintenance","Human Resource","IT","Administration","SOPs","Compliance"]],
  ["RV-Chitradurga","","","",["Repairs & Maintenance","Human Resource","IT","Administration","SOPs","Compliance"]],
  ["RV-Dharwad","","","",["Repairs & Maintenance","Human Resource","IT","Administration","SOPs","Compliance"]],
  ["RV-Hagaribommanahalli","","","",["Repairs & Maintenance","Human Resource","IT","Administration","SOPs","Compliance"]],

  ["Resource mobilization","Asha","asha.ashok@rashtrotthana.org","dwarak1956@gmail.com",["SOPs","Compliance"]],
  ["Transport","Jayaram","transportation@rashtrotthana.org","dinesh@rashtrotthana.org",["SOPs","Compliance"]],
  ["Maintenance","Vani","maintenance1@rashtrotthana.org","dinesh@rashtrotthana.org",["SOPs","Compliance"]],
  ["RVK Mangaluru","Pradhanacharya","","",ALL_AREAS],
  ["RVK Kalaburgi","Pradhanacharya","","",ALL_AREAS],
  ["RVK Satturu","Pradhanacharya","","",ALL_AREAS],
  ["IT","Gururaj","it@rashtrotthana.org","ravindra.murthy@rashtrotthana.org",["SOPs","Compliance"]],

  // Present in Prakalpa sheet but no Audit Areas row.
  ["JMRH & RC","Dr.Shylaja","drshyla@rashtrotthanahospital.com","rpnarayana@gmail.com",null],
  ["Swasthya Bharati","Dr.Suvarnini","","",null],
  ["Samraksha","Dr.Gayathri","","",null],
  ["Utthana","","","",null],
  ["RV-Sriramapura","","","",null],
  ["CBSE R&D","","","",null],
  ["Goshala (Mudenahalli)","Bhandari","","",null],
  ["RV Munganahalli","","","",null],
  ["LSVB Ullala","","","",null],
];

await mongoose.connect(process.env.MONGO_URI);

console.log("\n===== PRAKALPA MASTER ALIGNMENT =====\n");

let created = 0;
let updated = 0;

for (const [
  name,
  pramukh,
  pramukhEmail,
  seniorEmail,
  auditAreas
] of records) {

  const existing = await Prakalpa.findOne({ name });

  const update = {
    name,
    prakalpaPramukh: pramukh,
    prakalpaPramukhEmail: pramukhEmail,
    seniorEmail,
    active: true,
  };

  /*
   * Only overwrite Audit Areas where the workbook's
   * Audit Areas sheet actually contains a definition.
   */
  if (auditAreas !== null) {
    update.auditAreas = auditAreas;
  }

  if (existing) {
    await Prakalpa.updateOne(
      { _id: existing._id },
      { $set: update }
    );

    console.log(`UPDATED  ${name}`);
    updated++;
  } else {
    await Prakalpa.create({
      ...update,
      auditAreas: auditAreas || [],
    });

    console.log(`CREATED  ${name}`);
    created++;
  }
}

console.log("\n===== COMPLETE =====");
console.log("Created:", created);
console.log("Updated:", updated);

await mongoose.disconnect();
