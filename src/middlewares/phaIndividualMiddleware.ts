import { validationErrorToString } from '../utils';
import { NextFunction, Request, Response } from 'express';
import { PhaIndividual } from '../@types/database';
import BadRequestError from '../errors/BadRequestError';
// import validatePhaIndividual from '../validation/PhaIndividual';

export const phaIndividualMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const phaIndividual = req.body as PhaIndividual;
  if (phaIndividual) {
    next();
    return;
  }
  // next(new BadRequestError(validationErrorToString({ errors: null, schema: 'asdf', schemaEnv: 'asdf' })));
};
