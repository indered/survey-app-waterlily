import mongoose from 'mongoose';

const entrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    note: { type: String, required: true, trim: true }
  },
  { timestamps: true, collection: 'survey_app_waterlily_entries' }
);

export const Entry = mongoose.model('Entry', entrySchema);
