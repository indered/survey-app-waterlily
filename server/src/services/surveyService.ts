import { Entry, type EntryDocument } from '../models/Survey.js';
import { Question } from '../models/Question.js';
import { Submission } from '../models/Submission.js';
import type { CreateSurveyQuestionInput, SurveyQuestionInputType, SurveyStatus } from '../dtos/surveyDto.js';

type SurveyPayload = {
  name: string;
  description: string;
  note: string;
  status?: SurveyStatus;
  questions?: CreateSurveyQuestionInput[];
};

type SurveyUpdatePayload = Partial<SurveyPayload> & {
  friendlyUrl?: string;
};

type PaginationParams = {
  page?: number;
  limit?: number;
  search?: string;
};

type PaginatedResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type SurveyListItem = ReturnType<EntryDocument['toObject']> & {
  submissionsCount: number;
};

export class SurveyError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'SurveyError';
    this.statusCode = statusCode;
  }
}

export class SurveyService {
  async createSurvey(payload: SurveyPayload, createdBy: string) {
    const friendlyUrl = await this.generateUniqueFriendlyUrl(payload.name);
    const questionsPayload = this.parseQuestionsPayload(payload.questions);
    let createdSurvey;

    try {
      createdSurvey = await Entry.create({
        name: payload.name,
        friendlyUrl,
        description: payload.description,
        note: payload.note,
        status: payload.status || 'ACTIVE',
        createdBy
      });

      if (!questionsPayload.length) {
        return createdSurvey;
      }

      const createdQuestions = await Question.create(
        questionsPayload.map((question) => ({
          surveyId: createdSurvey!._id,
          title: question.title,
          order: question.order,
          description: question.description || '',
          inputType: question.inputType,
          ...(question.maxLength === undefined ? {} : { maxLength: question.maxLength }),
          options: question.options || [],
          isActive: question.isActive ?? true,
          isRequired: question.isRequired ?? false
        }))
      );

      return {
        ...createdSurvey.toObject(),
        questions: createdQuestions
      };
    } catch (error) {
      if (createdSurvey) {
        await Question.deleteMany({ surveyId: createdSurvey._id });
        await Entry.findByIdAndDelete(createdSurvey._id);
      }

      if (isDuplicateKeyError(error)) {
        throw new SurveyError('A survey with this URL already exists.', 409);
      }

      throw error;
    }
  }

  async getSurveys(status?: SurveyStatus, pagination: PaginationParams = {}): Promise<PaginatedResult<SurveyListItem>> {
    const filter: Record<string, unknown> = {};

    if (status) {
      filter.status = status;
    }

    if (pagination.search) {
      filter.$or = [
        { name: this.buildSearchRegex(pagination.search) },
        { description: this.buildSearchRegex(pagination.search) },
        { friendlyUrl: this.buildSearchRegex(pagination.search) }
      ];
    }

    const page = Math.max(1, Math.floor(pagination.page || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(pagination.limit || 10)));

    const [surveys, total] = await Promise.all([
      Entry.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Entry.countDocuments(filter)
    ]);
    const submissionCounts = surveys.length
      ? await Submission.aggregate<{ _id: unknown; count: number }>([
        {
          $match: {
            surveyId: { $in: surveys.map((survey) => survey._id) },
            status: 'SUBMITTED'
          }
        },
        {
          $group: {
            _id: '$surveyId',
            count: { $sum: 1 }
          }
        }
      ])
      : [];
    const countsBySurveyId = new Map(
      submissionCounts.map((item) => [String(item._id), item.count])
    );
    const items = surveys.map((survey) => ({
      ...survey.toObject(),
      submissionsCount: countsBySurveyId.get(survey._id.toString()) || 0
    }));

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    };
  }

  async getSurveyById(id: string) {
    const survey = await Entry.findById(id);

    if (!survey) {
      throw new SurveyError('Survey not found.', 404);
    }

    const questions = await Question.find({ surveyId: survey._id }).sort({ order: 1, createdAt: 1 });
    return {
      ...survey.toObject(),
      questions
    };
  }

  async getSurveyByFriendlyUrl(friendlyUrl: string) {
    const survey = await this.findSurveyByRouteKey(friendlyUrl);

    if (!survey) {
      throw new SurveyError('Survey not found.', 404);
    }

    const questions = await Question.find({ surveyId: survey._id }).sort({ order: 1, createdAt: 1 });

    return {
      ...survey.toObject(),
      questions
    };
  }

  async updateSurveyByFriendlyUrl(friendlyUrl: string, payload: SurveyUpdatePayload) {
    const survey = await this.findSurveyByRouteKey(friendlyUrl);

    if (!survey) {
      throw new SurveyError('Survey not found.', 404);
    }

    const hasQuestionsPayload = payload.questions !== undefined;
    const questionsPayload = this.parseQuestionsPayload(
      payload.questions === undefined ? undefined : payload.questions
    );

    if (payload.name && payload.name !== survey.name) {
      payload.friendlyUrl = await this.generateUniqueFriendlyUrl(payload.name, survey._id.toString());
    }

    if (hasQuestionsPayload) {
      delete payload.questions;
    }

    let updatedSurvey;

    try {
      updatedSurvey = await Entry.findByIdAndUpdate(
        survey._id,
        { $set: payload },
        { new: true, runValidators: true }
      );
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new SurveyError('A survey with this URL already exists.', 409);
      }

      throw error;
    }

    if (!updatedSurvey) {
      throw new SurveyError('Survey not found.', 404);
    }

    if (hasQuestionsPayload) {
      await Question.deleteMany({ surveyId: updatedSurvey._id });
      if (questionsPayload.length) {
        await Question.create(
          questionsPayload.map((question) => ({
            surveyId: updatedSurvey._id,
            title: question.title,
            order: question.order,
            description: question.description || '',
            inputType: question.inputType,
            ...(question.maxLength === undefined ? {} : { maxLength: question.maxLength }),
            options: question.options || [],
            isActive: question.isActive ?? true,
            isRequired: question.isRequired ?? false
          }))
        );
      }
    }

    return updatedSurvey;
  }

  async updateSurvey(id: string, payload: SurveyUpdatePayload) {
    const survey = await Entry.findById(id);

    if (!survey) {
      throw new SurveyError('Survey not found.', 404);
    }

    return this.updateSurveyByFriendlyUrl(survey.friendlyUrl, payload);
  }

  async deleteSurveyByFriendlyUrl(friendlyUrl: string) {
    const survey = await this.findSurveyByRouteKey(friendlyUrl);

    if (!survey) {
      throw new SurveyError('Survey not found.', 404);
    }

    await Entry.findByIdAndDelete(survey._id);
    await Question.deleteMany({ surveyId: survey._id });

    return { id: survey.id };
  }

  async deleteSurvey(id: string) {
    const survey = await Entry.findById(id);

    if (!survey) {
      throw new SurveyError('Survey not found.', 404);
    }

    return this.deleteSurveyByFriendlyUrl(survey.friendlyUrl);
  }

  private normalizeSlugLookup(value: string) {
    return value.trim().toLowerCase();
  }

  private buildSearchRegex(value: string) {
    return {
      $regex: this.escapeRegex(value),
      $options: 'i'
    };
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async findSurveyByRouteKey(value: string) {
    const normalized = this.normalizeSlugLookup(value);
    const byFriendlyUrl = await Entry.findOne({ friendlyUrl: normalized });

    if (byFriendlyUrl) {
      return byFriendlyUrl;
    }

    if (/^[a-fA-F0-9]{24}$/.test(value)) {
      return Entry.findById(value);
    }

    return null;
  }

  private slugify(value: string) {
    const trimmed = value.trim().toLowerCase();
    const slug = trimmed
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || 'survey';
  }

  private async generateUniqueFriendlyUrl(name: string, excludeId?: string) {
    const base = this.slugify(name);
    const maxAttempts = 1000;

    for (let index = 0; index < maxAttempts; index++) {
      const suffix = index === 0 ? '' : `-${index}`;
      const candidate = `${base}${suffix}`;
      const existing = await Entry.findOne({
        friendlyUrl: candidate,
        ...(excludeId ? { _id: { $ne: excludeId } } : {})
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new SurveyError('Unable to generate a unique friendly URL.', 409);
  }

  private parseQuestionsPayload(questions: CreateSurveyQuestionInput[] = []) {
    if (!Array.isArray(questions)) {
      throw new SurveyError('questions must be an array.', 400);
    }

    const normalizedQuestions = questions.map((question, index) => {
      if (!this.isValidQuestionPayload(question)) {
        throw new SurveyError(`Invalid question at index ${index}.`, 400);
      }

      const normalizedInputType = this.normalizeInputType(question.inputType);
      if (!normalizedInputType) {
        throw new SurveyError(`Invalid question inputType at index ${index}.`, 400);
      }

      const normalized = {
        title: question.title.trim(),
        order: 0,
        description: question.description?.trim() || '',
        inputType: normalizedInputType,
        maxLength: this.normalizeMaxLength(question.maxLength, normalizedInputType, index),
        options: Array.isArray(question.options) ? question.options.map((option) => String(option).trim()) : [],
        isActive: question.isActive ?? true,
        isRequired: question.isRequired ?? false
      };

      normalized.order = index;

      if (normalized.title.length < 2 || normalized.title.length > 220) {
        throw new SurveyError(`Question title must be 2-220 characters at index ${index}.`, 400);
      }

      if (normalized.description.length > 1000) {
        throw new SurveyError(`Question description is too long at index ${index}.`, 400);
      }

      if (!normalized.options.length && this.requiresOptions(normalized.inputType)) {
        throw new SurveyError(`Options are required for this question type at index ${index}.`, 400);
      }

      return normalized;
    });

    return normalizedQuestions;
  }

  private requiresOptions(inputType: SurveyQuestionInputType): boolean {
    return inputType === 'mcq';
  }

  private normalizeInputType(inputType: SurveyQuestionInputType): SurveyQuestionInputType | null {
    const value = String(inputType || '').trim().toLowerCase();
    const valid: SurveyQuestionInputType[] = ['text', 'number', 'mcq', 'date', 'boolean', 'rating'];

    return valid.includes(value as SurveyQuestionInputType) ? (value as SurveyQuestionInputType) : null;
  }

  private normalizeMaxLength(
    rawLimit: unknown,
    inputType: SurveyQuestionInputType,
    index: number
  ): number | undefined {
    if (inputType !== 'text') {
      return undefined;
    }

    if (rawLimit === undefined) {
      return 100;
    }

    const normalized = Number(rawLimit);

    if (!Number.isInteger(normalized) || normalized < 1) {
      throw new SurveyError(`Text question maxLength must be a positive integer at index ${index}.`, 400);
    }

    return normalized;
  }

  private isValidQuestionPayload(question: CreateSurveyQuestionInput): question is CreateSurveyQuestionInput {
    if (!question || typeof question !== 'object') {
      return false;
    }

    if (typeof question.title !== 'string' || !question.title.trim()) {
      return false;
    }

    if (question.description !== undefined && typeof question.description !== 'string') {
      return false;
    }

    if (typeof question.inputType !== 'string') {
      return false;
    }

    if (question.options !== undefined && !Array.isArray(question.options)) {
      return false;
    }

    if (question.options !== undefined) {
      const invalidOptions = question.options.some((option) => typeof option !== 'string');
      if (invalidOptions) {
        return false;
      }
    }

    if (question.maxLength !== undefined && typeof question.maxLength !== 'number') {
      return false;
    }

    if (question.isActive !== undefined && typeof question.isActive !== 'boolean') {
      return false;
    }

    if (question.isRequired !== undefined && typeof question.isRequired !== 'boolean') {
      return false;
    }

    return true;
  }
}

export const surveyService = new SurveyService();

const isDuplicateKeyError = (error: unknown): boolean => {
  return error instanceof Error && (error as { code?: number }).code === 11000;
};
