import {  IDENTITY_PLATFORM_API,
          IDENTITY_PLATFORM_VERSION,
          DOMAIN } from '../constants';
import axios from 'axios';
import { Credentials } from '../@types/';
import config from '../config';
import BadRequestError from '../errors/BadRequestError';
import logger from '../utils/LoggerUtil';

const CONNECTION_NAME = 'carto_dw';

export const login = async (credentials: Credentials) => {
  logger.info("executing function: login");
  try{
    const apiKey = config.gcloud.apiKey;
    const url = `${IDENTITY_PLATFORM_API}/${IDENTITY_PLATFORM_VERSION}/accounts:signInWithPassword?key=${apiKey}`
    const response = await axios.post(
      url,
      {
        email: credentials.username + DOMAIN,
        password: credentials.password,
        returnSecureToken: true,
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch(error) {
    if (error.response.data.error.code == 400 && error.response.data.error.message == 'INVALID_PASSWORD') {
      throw new BadRequestError('Invalid password');
    }
    if (error.response.data.error.code == 400 && error.response.data.error.message == 'EMAIL_NOT_FOUND') {
      throw new BadRequestError('Email not found');
    }
    if (error.response.data.error.code == 400 && error.response.data.error.message == 'TOO_MANY_ATTEMPTS_TRY_LATER') {
      throw new BadRequestError('Too many attempts');
    }
    logger.error(error.response.data.error);
    throw error.response.data.error;
  }
}
