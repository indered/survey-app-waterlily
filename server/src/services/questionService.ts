import { Entry } from '../models/Survey.js';
import { Question } from '../models/Question.js';
import type { QuestionInputType } from '../dtos/questionDto.js';

type QuestionPayload = {
  surveyId: string;
  title: string;
  description?: string;
  inputType: QuestionInputType;
  options?: string[];
  maxLength?: number;
  isActive?: boolean;
  isRequired?: boolean;
};

type QuestionUpdatePayload = {
  surveyId?: string;
  title?: string;
  description?: string;
  inputType?: QuestionInputType;
  options?: string[];
  maxLength?: number;
  isActive?: boolean;
  isRequired?: boolean;
};

type QuestionQuery = {
  surveyId?: string;
  surveyFriendlyUrl?: string;
};

export class QuestionError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'QuestionError';
    this.statusCode = statusCode;
  }
}

export class QuestionService {
  async createQuestion(payload: QuestionPayload) {
    const survey = await Entry.findById(payload.surveyId);
    if (!survey) {
      throw new QuestionError('Survey not found.', 404);
    }

    const lastQuestion = await Question.findOne({ surveyId: survey._id })
      .sort({ order: -1 })
      .select('order')
      .lean();

    const nextOrder = (lastQuestion?.order ?? -1) + 1;
    const maxLength = this.normalizeTextLimit(payload.inputType, payload.maxLength);

    const question = await Question.create({
      surveyId: survey._id,
      title: payload.title,
      order: nextOrder,
      description: payload.description || '',
      inputType: payload.inputType,
      options: payload.options || [],
      ...(maxLength === undefined ? {} : { maxLength }),
      isActive: payload.isActive ?? true,
      isRequired: payload.isRequired ?? false
    });

    return question;
  }

  async getQuestions(query: QuestionQuery = {}) {
    if (query.surveyFriendlyUrl) {
      const survey = await Entry.findOne({ friendlyUrl: query.surveyFriendlyUrl.trim().toLowerCase() });

      if (!survey) {
        return [];
      }

      return Question.find({ surveyId: survey._id }).sort({ order: 1, createdAt: 1 });
    }

    const filter = query.surveyId ? { surveyId: query.surveyId } : {};
    return Question.find(filter).sort({ order: 1, createdAt: 1 });
  }

  async getQuestionById(id: string) {
    const question = await Question.findById(id);
    if (!question) {
      throw new QuestionError('Question not found.', 404);
    }
    return question;
  }

  async updateQuestion(id: string, payload: QuestionUpdatePayload) {
    const existingQuestion = await Question.findById(id);
    if (!existingQuestion) {
      throw new QuestionError('Question not found.', 404);
    }

    const nextType = payload.inputType ?? existingQuestion.inputType;
    const nextIsText = nextType === 'text';
    const isSwitchingToText = nextIsText && existingQuestion.inputType !== 'text';

    if (payload.surveyId) {
      const survey = await Entry.findById(payload.surveyId);
      if (!survey) {
        throw new QuestionError('Survey not found.', 404);
      }
    }

    const updatePayload = { ...payload } as {
      [key: string]: unknown;
      maxLength?: number;
    };

    if (nextIsText) {
      const nextMaxLength = this.normalizeTextLimit('text', payload.maxLength);
      updatePayload.maxLength = payload.maxLength !== undefined
        ? nextMaxLength
        : isSwitchingToText
          ? 100
          : existingQuestion.maxLength ?? nextMaxLength;
    } else if (payload.maxLength !== undefined) {
      delete updatePayload.maxLength;
    }

    const updatedQuestion = await Question.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!updatedQuestion) {
      throw new QuestionError('Question not found.', 404);
    }

    return updatedQuestion;
  }

  async deleteQuestion(id: string) {
    const deleted = await Question.findByIdAndDelete(id);
    if (!deleted) {
      throw new QuestionError('Question not found.', 404);
    }

    return { id: deleted.id };
  }

  private normalizeTextLimit(inputType: QuestionInputType, maxLength?: number): number | undefined {
    if (inputType !== 'text') {
      return undefined;
    }

    if (maxLength === undefined) {
      return 100;
    }

    if (!Number.isInteger(maxLength) || maxLength < 1) {
      throw new QuestionError('maxLength must be a positive integer for text questions.', 400);
    }

    return maxLength;
  }
}

export const questionService = new QuestionService();
