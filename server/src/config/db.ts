import mongoose from 'mongoose';

const mongoStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];

export function mongoStatus(): string {
  return mongoStates[mongoose.connection.readyState] || 'unknown';
}

export async function connectDB(mongoUri: string | undefined): Promise<void> {
  if (!mongoUri) {
    console.warn('MONGODB_URI is not set. Skipping MongoDB connection.');
    return;
  }

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('MongoDB connection failed:', message);
  }
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDB(): Promise<void> {
  if (!isDbConnected()) {
    return;
  }

  await mongoose.disconnect();
}
