import { validate } from 'class-validator';
import type { NextFunction, Request, Response } from 'express';

type DtoConstructor<T> = new (data?: Partial<T>) => T;

export const validateDto = <T extends object>(dtoClass: DtoConstructor<T>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const dto = new dtoClass(req.body);
    const errors = await validate(dto, {
      whitelist: true,
      forbidUnknownValues: false,
      validationError: { target: false, value: false }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        ok: false,
        errors: errors.map((error) => ({
          field: error.property,
          messages: Object.values(error.constraints || {})
        }))
      });
    }

    next();
  };
};
