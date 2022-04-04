import { ERROR_CODE_NOT_FOUND } from '../constants';

export default class NotFoudError extends Error {
  code: number;

  constructor(message = 'Not found.') {
    super(message);
    this.name = 'NotFoundError';
    this.code = ERROR_CODE_NOT_FOUND;
  }
}
