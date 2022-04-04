import { ERROR_CODE_UNAUTHORIZED } from '../constants';

export default class AuthenticationError extends Error {
  code: number;

  constructor(message = 'Invalid session.') {
    super(message);
    this.name = 'AuthenticationError';
    this.code = ERROR_CODE_UNAUTHORIZED;
  }
}
