import { validationErrorToString } from '../utils';
import { NextFunction, Request, Response } from 'express';
import { PhaRetailer } from '../@types/database';
import BadRequestError from '../errors/BadRequestError';
// import validatePhaRetailer from '../validation/PhaRetailer';

export const phaRetailerMiddleware = (req: Request, _: Response, next: NextFunction) => {
  const phaRetailer = req.body as PhaRetailer;
  if (phaRetailer) {
    next();
    return;
  }
  // next(new BadRequestError(validationErrorToString(validatePhaRetailer)));
};
