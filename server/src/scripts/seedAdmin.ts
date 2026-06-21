import 'reflect-metadata';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB, isDbConnected } from '../config/db.js';
import { User } from '../models/User.js';

const ADMIN_EMAIL = 'admin@waterlily.com';
const ADMIN_PASSWORD = '123456';
const PASSWORD_SALT_ROUNDS = 12;
const defaultMongoUri = process.env.MONGODB_URI;

export type SeedAdminResult = {
  ok: boolean;
  changed: boolean;
  message: string;
};

export async function ensureAdminUser(mongoUri = defaultMongoUri): Promise<SeedAdminResult> {
  if (!mongoUri) {
    return {
      ok: false,
      changed: false,
      message: 'MONGODB_URI is required to seed the admin user.'
    };
  }

  if (!isDbConnected()) {
    await connectDB(mongoUri);
  }

  if (!isDbConnected()) {
    return {
      ok: false,
      changed: false,
      message: 'MongoDB is not connected. Admin seed aborted.'
    };
  }

  const existingAdmin = await User.findOne({ email: ADMIN_EMAIL }).select('+passwordHash');

  if (existingAdmin) {
    const passwordMatches = await bcrypt.compare(ADMIN_PASSWORD, existingAdmin.passwordHash);
    let changed = false;

    if (!passwordMatches) {
      existingAdmin.passwordHash = await bcrypt.hash(ADMIN_PASSWORD, PASSWORD_SALT_ROUNDS);
      changed = true;
    }

    if (existingAdmin.role !== 'admin') {
      existingAdmin.role = 'admin';
      changed = true;
    }

    if (!existingAdmin.fullname) {
      existingAdmin.fullname = 'Waterlily Admin';
      changed = true;
    }

    if (changed) {
      await existingAdmin.save();
    }

    return {
      ok: true,
      changed,
      message: changed ? `Admin user was repaired: ${ADMIN_EMAIL}` : 'Admin user already exists. No changes made.'
    };
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, PASSWORD_SALT_ROUNDS);

  await User.create({
    fullname: 'Waterlily Admin',
    email: ADMIN_EMAIL,
    passwordHash,
    role: 'admin'
  });

  return {
    ok: true,
    changed: true,
    message: `Admin user is ready: ${ADMIN_EMAIL}`
  };
}

const runAsScript = async () => {
  const result = await ensureAdminUser();

  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }

  console.log(result.message);
  await disconnectDB();
};

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  await runAsScript();
}
