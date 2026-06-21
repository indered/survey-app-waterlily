import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const surveySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    friendlyUrl: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE", required: true },
    note: { type: String, required: true, trim: true },
    createdBy: { type: String, required: true, trim: true }
  },
  { timestamps: true, collection: 'surveySchema' }
);

surveySchema.index({ friendlyUrl: 1 }, { unique: true });
surveySchema.index({ status: 1, createdAt: -1 });

export type EntryRecord = InferSchemaType<typeof surveySchema>;
export type EntryDocument = HydratedDocument<EntryRecord>;

export const Entry = model<EntryRecord>('Survey', surveySchema);
