import mongoose from 'mongoose';

const mongoStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];

export function mongoStatus() {
  return mongoStates[mongoose.connection.readyState] || 'unknown';
}

export async function connectDB(mongoUri) {
  if (!mongoUri) {
    console.warn('MONGODB_URI is not set. Skipping MongoDB connection.');
    return;
  }

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
  }
}
