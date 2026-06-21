import { Entry } from '../models/Survey.js';
import { Question } from '../models/Question.js';
import { Submission, type SubmissionDocument } from '../models/Submission.js';
import { User } from '../models/User.js';
import type { CreateSubmissionDto, SubmissionResponseInput, UpdateSubmissionDto } from '../dtos/submissionDto.js';

const MISSING_QUESTION_ID_ERROR = 'Response contains a question not in this survey.';
const REQUIRED_QUESTION_ERROR = 'Please complete all required questions before submitting.';

type PaginatedResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type SubmissionQuery = {
  surveyId?: string;
  status?: 'DRAFT' | 'SUBMITTED';
  search?: string;
  page?: number;
  limit?: number;
};

export class SubmissionError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'SubmissionError';
    this.statusCode = statusCode;
  }
}

export class SubmissionService {
  async createSubmission(payload: CreateSubmissionDto, userId: string) {
    const survey = await this.ensureActiveSurvey(payload.surveyId);
    const normalizedResponses = this.normalizeResponses(payload.responses);
    const status = normalizedResponses.length === 0 ? 'DRAFT' : this.normalizeStatus(payload.status);
    const isSubmitting = status !== 'DRAFT';

    await this.validateQuestionIds(survey._id.toString(), normalizedResponses, isSubmitting);

    const existingSubmission = await Submission.findOne({
      surveyId: survey._id,
      userId,
      status: 'SUBMITTED'
    });

    if (existingSubmission) {
      throw new SubmissionError('You have already submitted this survey.', 409);
    }

    const submission = await Submission.create({
      surveyId: survey._id,
      userId,
      responses: normalizedResponses,
      status
    });

    return submission;
  }

  async getSubmissions(query: SubmissionQuery = {}): Promise<PaginatedResult<SubmissionDocument>> {
    const page = Math.max(1, Math.floor(query.page || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(query.limit || 10)));
    const filter: Record<string, unknown> = {};

    if (query.surveyId) {
      filter.surveyId = query.surveyId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search?.trim()) {
      const matchedUsers = await User.find({
        $or: [
          { fullname: { $regex: query.search.trim(), $options: 'i' } },
          { email: { $regex: query.search.trim(), $options: 'i' } }
        ]
      })
        .select('_id')
        .lean();

      if (!matchedUsers.length) {
        return {
          items: [],
          page,
          limit,
          total: 0,
          totalPages: 1
        };
      }

      filter.userId = { $in: matchedUsers.map((user) => user._id) };
    }

    const [items, total] = await Promise.all([
      Submission.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'fullname email')
        .populate('surveyId', 'name friendlyUrl status'),
      Submission.countDocuments(filter)
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    };
  }

  async getUserSubmissions(userId: string) {
    return Submission.find({ userId })
      .sort({ createdAt: -1 })
      .populate('userId', 'fullname email')
      .populate('surveyId', 'name friendlyUrl status');
  }

  async getSubmissionById(id: string) {
    const submission = await Submission.findById(id)
      .populate('surveyId', 'name friendlyUrl')
      .populate('userId', 'fullname email')
      .populate('responses.questionId', 'title inputType');

    if (!submission) {
      throw new SubmissionError('Submission not found.', 404);
    }

    return submission;
  }

  async getUserSubmissionById(id: string, userId: string) {
    const submission = await Submission.findById(id);

    if (!submission) {
      throw new SubmissionError('Submission not found.', 404);
    }

    if (submission.userId.toString() !== userId) {
      throw new SubmissionError('You do not have access to this submission.', 403);
    }

    return this.getSubmissionById(id);
  }

  async updateSubmission(id: string, payload: UpdateSubmissionDto, userId: string) {
    const existing = await Submission.findById(id);

    if (!existing) {
      throw new SubmissionError('Submission not found.', 404);
    }

    if (existing.userId.toString() !== userId) {
      throw new SubmissionError('You do not have access to this submission.', 403);
    }

    if (existing.status === 'SUBMITTED') {
      throw new SubmissionError('Submitted responses cannot be edited.', 409);
    }

    const nextStatus = payload.status === undefined ? undefined : this.normalizeStatus(payload.status);
    const isSubmitting = nextStatus === 'SUBMITTED';
    const updates: Record<string, unknown> = {};

    if (payload.responses) {
      const normalizedResponses = this.normalizeResponses(payload.responses);
      await this.validateQuestionIds(existing.surveyId.toString(), normalizedResponses, isSubmitting);
      updates.responses = normalizedResponses;
    } else if (isSubmitting) {
      await this.validateQuestionIds(existing.surveyId.toString(), this.normalizeStoredResponses(existing.responses), true);
    }

    if (nextStatus) {
      updates.status = nextStatus;
    }

    const updated = await Submission.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updated) {
      throw new SubmissionError('Submission not found.', 404);
    }

    return updated;
  }

  private normalizeStoredResponses(
    responses: unknown
  ): {
    questionId: string;
    response: unknown;
  }[] {
    if (!Array.isArray(responses)) {
      return [];
    }

    return responses.map((response) => {
      if (!response || typeof response !== 'object' || !('questionId' in response)) {
        throw new SubmissionError(MISSING_QUESTION_ID_ERROR, 400);
      }

      const rawQuestionId = (response as { questionId: unknown }).questionId;
      if (!rawQuestionId) {
        throw new SubmissionError(MISSING_QUESTION_ID_ERROR, 400);
      }

      return {
        questionId: rawQuestionId.toString(),
        response: (response as { response: unknown }).response
      };
    });
  }

  private normalizeStatus(status: string | undefined) {
    return String(status || 'SUBMITTED').trim().toUpperCase() === 'DRAFT' ? 'DRAFT' : 'SUBMITTED';
  }

  private normalizeResponses(responses: SubmissionResponseInput[]) {
    const questionIds = new Set<string>();
    return responses.map((item) => {
      if (!item || typeof item.questionId !== 'string') {
        throw new SubmissionError(MISSING_QUESTION_ID_ERROR, 400);
      }

      if (!item.questionId) {
        throw new SubmissionError(MISSING_QUESTION_ID_ERROR, 400);
      }

      if (questionIds.has(item.questionId)) {
        throw new SubmissionError('Duplicate question responses are not allowed.', 400);
      }

      questionIds.add(item.questionId);

      return {
        questionId: item.questionId,
        response: item.response
      };
    });
  }

  private async ensureActiveSurvey(surveyId: string) {
    const survey = await Entry.findById(surveyId);

    if (!survey) {
      throw new SubmissionError('Survey not found.', 404);
    }

    if (survey.status !== 'ACTIVE') {
      throw new SubmissionError('Survey is not accepting submissions.', 409);
    }

    return survey;
  }

  private async validateQuestionIds(
    surveyId: string,
    responses: { questionId: string; response: unknown }[],
    requireRequiredQuestions: boolean = false
  ) {
    const questionIds = responses.map((response) => response.questionId);

    if (!questionIds.length) {
      if (!requireRequiredQuestions) {
        return;
      }

      throw new SubmissionError('At least one response is required.', 400);
    }

    const questions = await Question.find({
      _id: { $in: questionIds },
      surveyId,
      isActive: true
    }).select('_id isRequired');

    const activeQuestions = await Question.find({
      surveyId,
      isActive: true
    });

    if (questions.length !== questionIds.length) {
      throw new SubmissionError(MISSING_QUESTION_ID_ERROR, 400);
    }

    if (!requireRequiredQuestions) {
      return;
    }

    const requiredQuestionIds = new Set(
      activeQuestions.filter((question) => question.isRequired).map((question) => question._id.toString())
    );
    if (!requiredQuestionIds.size) {
      return;
    }

    for (const requiredQuestionId of requiredQuestionIds) {
      if (!questionIds.includes(requiredQuestionId)) {
        throw new SubmissionError(REQUIRED_QUESTION_ERROR, 400);
      }
    }
  }
}

export const submissionService = new SubmissionService();
