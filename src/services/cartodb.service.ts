import axios from 'axios';
import { Parser } from 'json2csv';
import { v4 as uuidv4 } from 'uuid';
import { FiltersInterface, QueryParams, Propierties } from '../@types';
import { PhaIndividual, PhaRetailer } from '../@types/database';
import NotFoundError from '../errors/NotFoundError';
import AuthenticationError from '../errors/AuthenticationError';
import config from '../config';
import {  
  CONNECTION_NAME,
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
  getPHAIndividualQuery,
  getPHARetailerCSVQuery,
  getProfileQuery,
  getRetailerQuery,
  getRowsOnUnion,
  getUnionQuery,
  insertPHAIndividualQuery,
  insertPHARetailerQuery,
  updatePHAIndividualQuery,
  updatePHARetailerQuery
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
  const query = getProfileQuery(id);
  try {  
    const response = await getRequestToCarto(query);
    if (response.rows.length == 0) {
      throw new NotFoundError("Retailer not found");
    }
    return response.rows[0];
  } catch (error) {
    throw error;
  }
}

export const getPHAIndividual = async (individualId: string) => {
  logger.info("executing function: getPHAIndividual");
  logger.debug(`with params: ${individualId}`);
  try {
    const query = getPHAIndividualQuery(individualId);
    const response = await getRequestToCarto(query);
    if (response.rows.length == 0) {
      throw new NotFoundError("Individual not found");
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
  const query = insertPHAIndividualQuery(individual);
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
  const query = insertPHARetailerQuery(retailer);
  try{
    const response = getRequestToCarto(query);
    return response;
  } catch (error) {
    throw error;
  }
}

export const updatePHARetailer = (retailer: PhaRetailer, retailerId: string) => {
  logger.info("executing function: updatePHARetailer");
  const params = JSON.stringify(retailer);
  logger.debug(`with params: ${params}`);
  const query = updatePHARetailerQuery(retailer, retailerId); 
  try{
    const response = getRequestToCarto(query);
    return response;
  } catch (error) {
    throw error;
  }
}

export const updateIndividual = (individual: PhaIndividual, individualId: string) => {
  logger.info("executing function: updateIndividual");
  const params = JSON.stringify(individual);
  logger.debug(`with params: ${params}`);
  const query = updatePHAIndividualQuery(individual, individualId);
  try{
    const response = getRequestToCarto(query);
    return response;
  } catch (error) {
    throw error;
  }
};

export const getPHARetailerCSV = async (retailerIds: string[]) => {
  logger.info("executing function: getPHARetailerCSV");
  const params = JSON.stringify(retailerIds);
  logger.debug(`with params: ${params}`);
  const query = getPHARetailerCSVQuery(retailerIds);
  try{
    const response = await getRequestToCarto(query);
    const json2csv = new Parser({fields: Object.keys(response.rows[0])});
    const csv = json2csv.parse(response.rows);
    return csv;
  } catch (error) {
    throw error;
  }
}
