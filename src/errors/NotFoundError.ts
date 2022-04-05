import { ERROR_CODE_NOT_FOUND } from '../constants';

export default class NotFoundError extends Error {
  code: number;

  constructor(message = 'Not found.') {
    super(message);
    this.name = 'NotFoundError';
    this.code = ERROR_CODE_NOT_FOUND;
  }
}
