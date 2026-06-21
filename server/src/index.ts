import 'reflect-metadata';
import cors from 'cors';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { connectDB, isDbConnected, mongoStatus } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import surveyRoutes from './routes/surveyRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import { ensureAdminUser } from './scripts/seedAdmin.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

loadEnvFile();

const mongoUri = process.env.MONGODB_URI;
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || (process.env.RENDER ? '0.0.0.0' : '127.0.0.1');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '../../client/dist');

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'survey-app-waterlily-api',
    mongo: mongoStatus()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/submissions', submissionRoutes);

app.use(errorHandler);

app.use(express.static(clientDist));
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

await connectDB(mongoUri);
if (isDbConnected()) {
  const seedAdminResult = await ensureAdminUser(mongoUri);
  if (!seedAdminResult.ok) {
    console.warn(seedAdminResult.message);
  }
}

const httpServer = app.listen(port, host, () => {
  console.log(`survey-app-waterlily server listening on ${host}:${port}`);
});

httpServer.keepAliveTimeout = 65000;

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }

  const rawContent = readFileSync(envPath, 'utf8');
  const lines = rawContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    if (value === '<PASSWORD>' || value.includes('<PASSWORD>')) {
      console.warn(`Ignoring ${key} from ${envPath} because it contains a placeholder.`);
      continue;
    }

    process.env[key] = stripQuotes(value);
  }
}

function stripQuotes(value: string) {
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
    return value.slice(1, -1);
  }

  return value;
}
