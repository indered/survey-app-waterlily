import type { NextFunction, Request, Response } from 'express';
import { questionService } from '../services/questionService.js';
import { CreateQuestionDto } from '../dtos/questionDto.js';

export const questionController = {
  async createQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await questionService.createQuestion(req.body as CreateQuestionDto);
      return res.status(201).json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async getQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const surveyId = req.query.surveyId;
      const surveyFriendlyUrl = req.query.surveyFriendlyUrl;
      const parsedSurveyId = typeof surveyId === 'string' && surveyId.length > 0 ? surveyId : undefined;
      const parsedSurveyFriendlyUrl =
        typeof surveyFriendlyUrl === 'string' && surveyFriendlyUrl.length > 0 ? surveyFriendlyUrl : undefined;

      const result = await questionService.getQuestions({
        surveyId: parsedSurveyId,
        surveyFriendlyUrl: parsedSurveyFriendlyUrl
      });
      return res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async getQuestionsBySurveyFriendlyUrl(req: Request<{ friendlyUrl: string }>, res: Response, next: NextFunction) {
    try {
      const result = await questionService.getQuestions({
        surveyFriendlyUrl: req.params.friendlyUrl
      });
      return res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async getQuestionById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const result = await questionService.getQuestionById(req.params.id);
      return res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async updateQuestion(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const result = await questionService.updateQuestion(req.params.id, req.body);
      return res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteQuestion(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const result = await questionService.deleteQuestion(req.params.id);
      return res.json({
        ok: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
};
