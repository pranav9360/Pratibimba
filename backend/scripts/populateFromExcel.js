import { readFileSync, statSync } from "node:fs";
import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const roleMapping = {
  'Admin': 'admin',
  'Super Admin': 'admin',
  'Coordinator': 'audit_coordinator',
  'Lead Auditor': 'auditor',
  'Auditor': 'auditor'
};

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ Database connection failed.');
    process.exit(1);
  }
};

// Supply a private JSON object mapping each account email to its initial password.
// Only the file path is configured; password values never appear in CLI arguments.
function readInitialPasswords(emails) {
  const file = process.env.PRATIBIMBA_INITIAL_PASSWORDS_FILE;
  if (!file) throw new Error("Private initial-password configuration is required.");
  const info = statSync(file);
  if (!info.isFile() || (info.mode & 0o077) || info.uid !== process.getuid()) {
    throw new Error("Initial-password file must be owner-only (0600 or stricter).");
  }
  const values = JSON.parse(readFileSync(file, "utf8"));
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new Error("Invalid initial-password configuration.");
  }
  for (const email of emails) {
    if (!Object.hasOwn(values, email) || typeof values[email] !== "string" || values[email].length < 12) {
      throw new Error("Every initial account requires an explicitly supplied strong password.");
    }
  }
  return values;
}

const runMigration = async () => {

  console.log('--- Merging Users into Database ---');
  const excelUsers = [
    { name: 'Ravindra Murthy', email: 'systems@rashtrotthana.org', phone: '9845169587', role: 'Admin' },
    { name: 'Lokesh B.S', email: 'lokeshbs@rashtrotthana.org', phone: '98454 42797', role: 'Admin' },
    { name: 'Ashish Sabnis', email: 'ashish.s@rashtrotthana.org', phone: '9980016670', role: 'Admin' },
    { name: 'Vani.M', email: 'vani.mh@rashtrotthana.org', phone: '9036808549', role: 'Coordinator' },
    { name: 'Shreyanka', email: 'shreyanka.s@rashtrotthana.org', phone: '9742530586', role: 'Coordinator' },
    { name: 'Roopashree', email: 'roopashree.gs@rashtrotthana.org', phone: '9844530423', role: 'Coordinator' },
    { name: 'Gururaj', email: 'gururaj.bs@rashtrotthana.org', phone: '9742613133', role: 'Coordinator' },
    { name: 'Ranganath', email: 'ranganath.hs@rashtrotthana.org', phone: '6361696563', role: 'Coordinator' },
    { name: 'Venkoba Rao', email: 'admin@rashtrotthana.org', phone: '9880366648', role: 'Coordinator' },
    { name: 'Jayaram Naik', email: 'transportation@rashtrotthana.org', phone: '6238365063', role: 'Coordinator' },
    { name: 'Super Admin', email: 'admin@pratibimba.com', phone: '0000000000', role: 'Super Admin' }
  ];

  const initialPasswords = readInitialPasswords(excelUsers.map(user => user.email.toLowerCase()));
  await connectDB();

  for (const u of excelUsers) {
    const emailLower = u.email.toLowerCase();
    const existing = await User.findOne({ email: emailLower });
    
    if (!existing) {
      await User.create({
        name: u.name,
        email: emailLower,
        phone: u.phone,
        role: roleMapping[u.role] || 'auditor',
        password: initialPasswords[emailLower]
      });
      console.log(` + Successfully added missing user: ${emailLower} (${roleMapping[u.role]})`);
    } else {
      console.log(` ~ Preserved existing user record: ${emailLower}`);
    }
  }

  console.log('\n✅ Safe population completed without modifying existing schema fields.');
  process.exit(0);
};

runMigration().catch(async () => {
  console.error("Population failed; no credential details are logged.");
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
