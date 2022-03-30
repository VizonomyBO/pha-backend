import axios from 'axios';
import { Credentials } from '../@types/';
import config from '../config';

const CONNECTION_NAME = 'carto_dw';

export const login = async (credentials: Credentials) => {
  try{
    const apiKey = config.gcloud.apiKey;
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        email: credentials.username + '@localhost.com',
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