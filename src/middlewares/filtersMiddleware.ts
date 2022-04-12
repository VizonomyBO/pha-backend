import { validationErrorToString } from '../utils';
import { NextFunction, Request, Response } from 'express';
import { FiltersInterface } from '../@types';
import BadRequestError from '../errors/BadRequestError';
import validateFilters from '../validation/Filters';

export const filtersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const filters = req.body as FiltersInterface;
  if (validateFilters(filters)) {
    next();
    return;
  }
  next(new BadRequestError(validationErrorToString(validateFilters)));
};
