import { validate } from 'class-validator';
import type { NextFunction, Request, Response } from 'express';
import type { ValidationError } from 'class-validator';
import { CreateEntryDto } from '../dtos/createEntryDto.js';
import { UpdateEntryDto } from '../dtos/updateEntryDto.js';
import { EntryService } from '../services/entryService.js';

const entryService = new EntryService();

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value || '';
}

function formatValidationErrors(errors: ValidationError[]) {
  return errors.map((error) => ({
    field: error.property,
    messages: Object.values(error.constraints || {})
  }));
}

export const entryController = {
  async createEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = new CreateEntryDto(req.body);
      const errors = await validate(dto, {
        whitelist: true,
        forbidUnknownValues: false,
        validationError: { target: false, value: false }
      });

      if (errors.length > 0) {
        return res.status(400).json({
          ok: false,
          errors: formatValidationErrors(errors)
        });
      }

      const entry = await entryService.createEntry(dto);
      return res.status(201).json({
        ok: true,
        entry
      });
    } catch (error) {
      next(error);
    }
  },

  async getEntries(_req: Request, res: Response, next: NextFunction) {
    try {
      const entries = await entryService.getEntries();
      return res.json({
        ok: true,
        entries
      });
    } catch (error) {
      next(error);
    }
  },

  async getEntryById(req: Request, res: Response, next: NextFunction) {
    try {
      const entry = await entryService.getEntryById(routeParam(req.params.id));
      if (!entry) {
        return res.status(404).json({
          ok: false,
          message: 'Entry not found'
        });
      }
      return res.json({
        ok: true,
        entry
      });
    } catch (error) {
      next(error);
    }
  },

  async updateEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = new UpdateEntryDto(req.body);
      const errors = await validate(dto, {
        whitelist: true,
        forbidUnknownValues: false,
        validationError: { target: false, value: false }
      });

      if (errors.length > 0) {
        return res.status(400).json({
          ok: false,
          errors: formatValidationErrors(errors)
        });
      }

      const entry = await entryService.updateEntry(routeParam(req.params.id), dto);
      if (!entry) {
        return res.status(404).json({
          ok: false,
          message: 'Entry not found'
        });
      }

      return res.json({
        ok: true,
        entry
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const entry = await entryService.deleteEntry(routeParam(req.params.id));
      if (!entry) {
        return res.status(404).json({
          ok: false,
          message: 'Entry not found'
        });
      }

      return res.json({
        ok: true,
        message: 'Entry deleted'
      });
    } catch (error) {
      next(error);
    }
  }
};
