import { validate } from 'class-validator';

export const validateDto = (dtoClass) => {
  return async (req, res, next) => {
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

    req.validatedDto = dto;
    next();
  };
};
