import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { FiltersInterface, QueryParams } from '../@types';
import { PhaIndividual, PhaRetailer } from '../@types/database';
import BadRequestError from '../errors/BadRequestError';
import NotFoundError from '../errors/NotFoundError';
import AuthenticationError from '../errors/AuthenticationError';
import config from '../config';
import validatePhaRetailer from '../validation/PhaRetailer';
import validatePhaIndividual from '../validation/PhaIndividual';
import {  
  CONNECTION_NAME,
  PHA_RETAILER_TABLE,
  PHA_INDIVIDUAL,
  CARTO_AUTH_URL,
  CARTO_API,
  CARTO_API_VERSION
} from '../constants'
import logger from '../utils/LoggerUtil';
import { 
  buildFilterQueries,
  getBadgeQuery,
  getIndividualQuery,
  getMapQuery,
  getRetailerQuery,
  getRowsOnUnion,
  getUnionQuery
} from '../utils/queryGenerator';

export const getOAuthToken = async (): Promise<string> => {
  logger.info("executing function: getOAuthToken");
  try {
    const response = await axios.post(
      CARTO_AUTH_URL,
      {
        client_id: config.carto.clientId,
        client_secret: config.carto.clientSecret,
        audience: 'carto-cloud-native-api',
        grant_type: 'client_credentials'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.access_token;
  } catch (error) {
    if (error.response.status == 401) {
      throw new AuthenticationError('Cannot get CARTO credentials.');
    }
    throw error.response.data.error;
  }
};

const getRequestToTokenCarto = async (queries: string[]) => {
  logger.info("executing function: getRequestToTokenCarto");
  const params = JSON.stringify(queries);
  logger.debug(`with params: ${params}`);
  try {
    const token = await getOAuthToken();
    const response = await axios.post(
      `${CARTO_API}/${CARTO_API_VERSION}/tokens?access_token=${token}`,
      {
        grants: queries.map(query => ({
          connection_name: CONNECTION_NAME,
          source: query
        })),
        referers: [],
        allowed_apis: ['sql', 'maps', 'imports']
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch(error) {
    throw error;
  }
}

export const mapQuery = async (filters: FiltersInterface, queryParams: QueryParams) => {
  logger.info("executing function: sideBar");
  try {
    const unionQuery = getMapQuery(filters, queryParams);
    logger.info(`executing query: ${unionQuery}`);
    const response = await getRequestToCarto(unionQuery);
    return {
      rows: response.rows.slice(0, queryParams.limit),
      hasNextPage: response.rows.length > queryParams.limit
    };
  } catch(error) {
    throw error;
  }
}

export const getFilteredLayers = async (filters: FiltersInterface) => {
  logger.info("executing function: getFilteredLayers");
  const queries = buildFilterQueries(filters);
  try {
    const token = await getOAuthToken();
    const answer = {
      queries: queries,
      token: token,
      connection_name: CONNECTION_NAME
    };
    return answer;
  } catch (error) {
    throw error;
  }
};

const getRequestToCarto = async (query: string) => {
  logger.info("executing function: getRequestToCarto");
  const params = JSON.stringify(query);
  logger.debug(`with params: ${params}`);
  try {
    const token = await getOAuthToken();
    const response = await axios.post(
      `${CARTO_API}/${CARTO_API_VERSION}/sql/${CONNECTION_NAME}/query`,
      {
        q: query,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch(error) {
    if (error.response?.status == 404) {
      throw new NotFoundError('Table not found');
    }
    throw error;
  }
};

export const getBadges = async (id: string) => {
  const query = getBadgeQuery(id);
  try {
    const response = await getRequestToCarto(query);
    return response.rows[0];
  } catch(error) {
    console.error(error);
    throw error;
  }
};

export const getProfile = async (id: string) => {
  logger.info("executing function: getProfile");
  const params = JSON.stringify(id);
  logger.debug(`with params: ${params}`);
  try {
    const query = `SELECT * FROM ${PHA_RETAILER_TABLE} WHERE retailer_id = '${id}'`;
    const response = await getRequestToCarto(query);
    if (response.rows.length == 0) {
      throw new NotFoundError("Retailer not found");
    }
    return response.rows[0];
  } catch (error) {
    throw error;
  }
}

export const insertIntoPHAIndividual = async (individual: PhaIndividual) => {
  logger.info("executing function: insertIntoPHAIndividual");
  const params = JSON.stringify(individual);
  logger.debug(`with params: ${params}`);
  individual.submission_date = new Date();
  individual.submission_status = 'Pending';
  individual.individual_id = uuidv4();
  const fields: string[] = [];
  const fieldValues: string[] = [];
  Object.keys(individual).forEach((key: string) => {
    fields.push(key);
    fieldValues.push(individual[key]);
  });
  const query = `
  INSERT INTO ${PHA_INDIVIDUAL}
    (
      ${`${fields.join(', ')}`}
    )
    VALUES 
    (
      ${`'${fieldValues.join('\', \'')}'`}
    )`;
  try {
    const response = getRequestToCarto(query);
    return response;
  } catch(error) {
    throw error;
  }
};

export const getIndividual = async (queryParams: QueryParams) => {
  logger.info("executing function: getIndividual");
  const params = JSON.stringify(queryParams);
  logger.debug(`with params: ${params}`);
  try {
    const query = getIndividualQuery(queryParams);
    const response = await getRequestToCarto(query);
    return response;
  } catch (error) {
    throw error;
  }
};

export const getRetailer = async (queryParams: QueryParams) => {
  logger.info("executing function: getRetailer");
  const params = JSON.stringify(queryParams);
  logger.debug(`with params: ${params}`);
  try {
    const query = getRetailerQuery(queryParams);
    const response = await getRequestToCarto(query);
    return response;
  } catch (error) {
    throw error;
  }
};

export const getDashboard = async (queryParams: QueryParams) => {
  logger.info("executing function: getDashboard");
  const params = JSON.stringify(queryParams);
  logger.debug(`with params: ${params}`);
  try {
    const unionQuery = getUnionQuery(queryParams);
    logger.debug(`with query: ${unionQuery}`);
    const response = await getRequestToCarto(unionQuery);
    return response;
  } catch (error) {
    throw error;
  }
};

export const getDashboardCount = async (queryParams: QueryParams) => {
  logger.info("executing function: getDashboardCount");
  const params = JSON.stringify(queryParams);
  logger.debug(`with params: ${params}`);
  try {
    const countQuery = getRowsOnUnion(queryParams);
    logger.debug(`with query: ${countQuery}`);
    const response = await getRequestToCarto(countQuery);
    return { count: response.rows[0].count };
  } catch (error) {
    throw error;
  }
};

export const insertIntoPHARetailer = async (retailer: PhaRetailer) => {
  logger.info("executing function: insertIntoPHARetailer");
  const params = JSON.stringify(retailer);
  logger.debug(`with params: ${params}`);
  retailer.submission_date = new Date();
  retailer.submission_status = 'Pending';
  retailer.retailer_id = uuidv4();
  const fields: string[] = [];
  const fieldValues: string[] = [];
  Object.keys(retailer).forEach((key: string) => {
    if (key !== 'longitude' && key !== 'latitude') {
      fields.push(key);
      fieldValues.push(retailer[key]);
    }
  });
  const query = `
  INSERT INTO ${PHA_RETAILER_TABLE}
    (
      geom,
      ${`${fields.join(', ')}`}
    )
    VALUES 
    (
      ST_GEOGPOINT(${retailer.longitude}, ${retailer.latitude}),
      ${`'${fieldValues.join('\', \'')}'`}
    )`;
  try{
    const response = getRequestToCarto(query);
    return response;
  } catch (error) {
    throw error;
  }
}
