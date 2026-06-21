import type { NextFunction, Request, Response } from 'express';
import { ApiAuthError } from '../middleware/auth.js';
import { CreateSubmissionDto, UpdateSubmissionDto } from '../dtos/submissionDto.js';
import { submissionService } from '../services/submissionService.js';

export const submissionController = {
  async createSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = ensureUserId(req);
      const result = await submissionService.createSubmission(req.body as CreateSubmissionDto, userId);

      return res.status(201).json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async getAllSubmissions(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await submissionService.getSubmissions({
        surveyId: parseQueryString(_req.query.surveyId),
        search: parseQueryString(_req.query.search),
        page: parsePositiveInteger(_req.query.page, 1),
        limit: parsePositiveInteger(_req.query.limit, 10)
      });
      return res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async getMySubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = ensureUserId(req);
      const result = await submissionService.getUserSubmissions(userId);
      return res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async getSubmissionById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const auth = ensureAuth(req);
      const isAdmin = auth.role === 'admin';
      const result = isAdmin
        ? await submissionService.getSubmissionById(req.params.id)
        : await submissionService.getUserSubmissionById(req.params.id, auth.sub);

      return res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async updateSubmission(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const userId = ensureUserId(req);
      const result = await submissionService.updateSubmission(
        req.params.id,
        req.body as UpdateSubmissionDto,
        userId
      );

      return res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
};

const ensureUserId = (req: Request): string => {
  const auth = ensureAuth(req);
  return auth.sub;
};

const ensureAuth = (req: Request) => {
  if (!req.auth?.sub) {
    throw new ApiAuthError('Authorization token is required.', 401);
  }

  if (!req.auth.role) {
    throw new ApiAuthError('Authorization token is malformed.', 401);
  }

  return req.auth;
};

const parseQueryString = (value: unknown) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parsePositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
};
