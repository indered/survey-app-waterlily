import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const responseSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    response: { type: Schema.Types.Mixed, required: true }
  },
  { _id: false }
);

const submissionSchema = new Schema(
  {
    surveyId: { type: Schema.Types.ObjectId, ref: 'Survey', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    responses: { type: [responseSchema], default: [] },
    submittedAt: { type: Date, default: Date.now, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED'],
      default: 'SUBMITTED',
      required: true
    }
  },
  { timestamps: true, collection: 'submissions' }
);

submissionSchema.index({ surveyId: 1, createdAt: -1 });
submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index(
  { surveyId: 1, userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'SUBMITTED' } }
);

export type SubmissionRecord = InferSchemaType<typeof submissionSchema>;
export type SubmissionDocument = HydratedDocument<SubmissionRecord>;

export const Submission = model<SubmissionRecord>('Submission', submissionSchema);
