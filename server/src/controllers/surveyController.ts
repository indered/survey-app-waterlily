import type { NextFunction, Request, Response } from 'express';
import { ApiAuthError } from '../middleware/auth.js';
import type { CreateSurveyDto, SurveyStatus } from '../dtos/surveyDto.js';
import { surveyService } from '../services/surveyService.js';
import { submissionService } from '../services/submissionService.js';

export const surveyController = {
  async createSurvey(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth?.email) {
        throw new ApiAuthError('Authorization token is required.', 401);
      }

      const result = await surveyService.createSurvey(req.body as CreateSurveyDto, req.auth.email);
      return res.status(201).json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async getSurveys(req: Request, res: Response, next: NextFunction) {
    try {
      const status = getRequestStatus(req.query.status, req.auth?.role);
      const result = await surveyService.getSurveys(
        status,
        {
          ...parsePagination(req.query.page, req.query.limit),
          search: parseQueryString(req.query.search)
        }
      );
      return res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async getSurveyById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const result = await surveyService.getSurveyById(req.params.id);
      return res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async getSurveyByFriendlyUrl(req: Request<{ friendlyUrl: string }>, res: Response, next: NextFunction) {
    try {
      const result = await surveyService.getSurveyByFriendlyUrl(req.params.friendlyUrl);
      return res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async getSurveySubmissions(req: Request<{ friendlyUrl: string }>, res: Response, next: NextFunction) {
    try {
      const survey = await surveyService.getSurveyByFriendlyUrl(req.params.friendlyUrl);
      const result = await submissionService.getSubmissions({
        surveyId: survey._id.toString(),
        status: 'SUBMITTED',
        search: parseQueryString(req.query.search),
        page: parsePositiveInteger(req.query.page, 1),
        limit: parsePositiveInteger(req.query.limit, 10)
      });

      return res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async updateSurveyByFriendlyUrl(req: Request<{ friendlyUrl: string }>, res: Response, next: NextFunction) {
    try {
      const result = await surveyService.updateSurveyByFriendlyUrl(req.params.friendlyUrl, req.body);
      return res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteSurveyByFriendlyUrl(req: Request<{ friendlyUrl: string }>, res: Response, next: NextFunction) {
    try {
      const result = await surveyService.deleteSurveyByFriendlyUrl(req.params.friendlyUrl);
      return res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
};

const parseSurveyStatus = (rawStatus: unknown): SurveyStatus | undefined => {
  if (rawStatus === 'ACTIVE' || rawStatus === 'INACTIVE') {
    return rawStatus;
  }

  return undefined;
};

const getRequestStatus = (rawStatus: unknown, role?: 'admin' | 'user') => {
  const status = parseSurveyStatus(rawStatus);

  if (role === 'admin') {
    return status;
  }

  return 'ACTIVE';
};

const parsePagination = (rawPage: unknown, rawLimit: unknown) => {
  const page = parsePositiveInteger(rawPage, 1);
  const limit = parsePositiveInteger(rawLimit, 10);

  return {
    page,
    limit
  };
};

const parsePositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
};

const parseQueryString = (value: unknown) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
