import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const entrySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    note: { type: String, required: true, trim: true }
  },
  { timestamps: true, collection: 'survey_app_waterlily_entries' }
);

export type EntryRecord = InferSchemaType<typeof entrySchema>;
export type EntryDocument = HydratedDocument<EntryRecord>;

export const Entry = model<EntryRecord>('Entry', entrySchema);

// Future survey model notes:
// survey: name, id, status active/inactive
// questions: surveyId, title, order, description, inputType, options, isActive
// user: id, fullname, email/phone
// responses: questionId, surveyId, userId, response
// submission: id, surveyId, userId, responses, submittedAt, status
