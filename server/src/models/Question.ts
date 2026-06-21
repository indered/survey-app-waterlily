import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const questionSchema = new Schema(
  {
    surveyId: { type: Schema.Types.ObjectId, ref: 'Survey', required: true },
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, default: '' },
    inputType: {
      type: String,
      required: true,
      trim: true,
      enum: ['text', 'number', 'mcq', 'date', 'boolean', 'rating']
    },
    options: { type: [String], default: [] },
    maxLength: { type: Number, default: 100, min: 1 },
    isActive: { type: Boolean, default: true, required: true },
    isRequired: { type: Boolean, default: false, required: true }
  },
  { timestamps: true, collection: 'questions' }
);

questionSchema.index({ surveyId: 1, order: 1 }, { unique: true });
questionSchema.index({ surveyId: 1, createdAt: 1 });

export type QuestionRecord = InferSchemaType<typeof questionSchema>;
export type QuestionDocument = HydratedDocument<QuestionRecord>;

export const Question = model<QuestionRecord>('Question', questionSchema);
