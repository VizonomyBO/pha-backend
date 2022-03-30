import {  IDENTITY_PLATFORM_API,
          IDENTITY_PLATFORM_VERSION,
          DOMAIN } from '@/constants';
import axios from 'axios';
import { Credentials } from '../@types/';
import config from '../config';

const CONNECTION_NAME = 'carto_dw';

export const login = async (credentials: Credentials) => {
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
    console.error(error);
    throw error.response.data;
  }
}
