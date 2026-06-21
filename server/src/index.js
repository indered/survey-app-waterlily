import 'reflect-metadata';
import cors from 'cors';
import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { connectDB, mongoStatus } from './config/db.js';
import entryRoutes from './routes/entryRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || (process.env.RENDER ? '0.0.0.0' : '127.0.0.1');
const mongoUri = process.env.MONGODB_URI;
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

app.use('/api/entries', entryRoutes);

app.use(errorHandler);

app.use(express.static(clientDist));
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

await connectDB(mongoUri);

const httpServer = app.listen(port, host, () => {
  console.log(`survey-app-waterlily server listening on ${host}:${port}`);
});

httpServer.keepAliveTimeout = 65000;

