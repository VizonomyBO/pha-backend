import { ERROR_CODE_BAD_REQUEST } from '../constants';

export default class BadRequestError extends Error {
  code: number;

  constructor(message = 'Bad request.') {
    super(message);
    this.name = 'BadRequestError';
    this.code = ERROR_CODE_BAD_REQUEST;
  }
}
