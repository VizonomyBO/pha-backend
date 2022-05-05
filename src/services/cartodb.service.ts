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
  CARTO_API_VERSION,
  PHA_RETAILER_TABLE,
  PHA_INDIVIDUAL,
  RETAILER,
  INDIVIDUAL,
  RETAILERS_OSM,
  RETAILERS_USDA
} from '../constants'
import logger from '../utils/LoggerUtil';
import { 
  buildFilterQueries,
  getBadgeQuery,
  getDeleteOsmPointQuery,
  getIndividualQuery,
  getMapQuery,
  getPHAIndividualCSVQuery,
  getPHAIndividualQuery,
  getPHARetailerCSVQuery,
  getProfileQuery,
  getRetailerQuery,
  getRowsOnDashboard,
  getDashboardQuery,
  insertPHAIndividualQuery,
  insertPHARetailerQuery,
  updatePHAIndividualQuery,
  updatePHARetailerQuery
} from '../utils/queryGenerator';
import { deleteGoogleFiles } from '../utils';

const getJobStatus = async (job: string) => {
  logger.info("executing function: getRequestToCarto");
  const params = JSON.stringify(job);
  logger.debug(`with params: ${params}`);
  try {
    const token = await getOAuthToken();
    logger.info(`Starting query to Carto: ${job}`);
    const response = await axios.get(
      `${CARTO_API}/${CARTO_API_VERSION}/sql/${CONNECTION_NAME}/job/${job}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch(error) {
    console.error(error);
    if (error.response?.status == 404) {
      throw new NotFoundError('Job not found');
    }
    throw error;
  }
};

const sendJobToCarto = async (query: string) => {
  logger.info("executing function: getRequestToCarto");
  const params = JSON.stringify(query);
  logger.debug(`with params: ${params}`);
  try {
    const token = await getOAuthToken();
    logger.info(`Starting query to Carto: ${query}`);
    const response = await axios.post(
      `${CARTO_API}/${CARTO_API_VERSION}/sql/${CONNECTION_NAME}/job`,
      {
        query: query,
        metadata: {}
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
    console.error(error);
    if (error.response?.status == 404) {
      throw new NotFoundError('Table not found');
    }
    throw error;
  }
};

export const getJob = async (job: string) => {
  logger.info("executing function: getRequestToCarto");
  const params = JSON.stringify(job);
  logger.debug(`with params: ${params}`);
  try {
    const getJob = await getJobStatus(job);
    return getJob;
  } catch(error) {
    console.error(error);
    throw error;
  }
};

export const jobClusterTables = async () => {
  const query = `
    CREATE OR REPLACE TABLE ${PHA_RETAILER_TABLE}_clustered CLUSTER BY geom AS (SELECT * FROM ${PHA_RETAILER_TABLE});
    CREATE OR REPLACE TABLE ${RETAILERS_OSM}_clustered CLUSTER BY geom AS (SELECT * FROM ${RETAILERS_OSM});
    CREATE OR REPLACE TABLE ${RETAILERS_USDA}_clustered CLUSTER BY geom AS (SELECT * FROM ${RETAILERS_USDA});
  `;
  const runJob = await sendJobToCarto(query);
  return runJob;
};

export const createIndividualTable = async () => {
  logger.info("executing function: createIndividual");
  const query = `
    CREATE TABLE IF NOT EXISTS ${PHA_INDIVIDUAL} (
      individual_id STRING,
      retailer_id STRING,
      availability STRING,
      quality STRING,
      visibility STRING,
      local STRING,
      meets_need STRING,
      produce_avail_store STRING,
      imagelinks STRING,
      contact_name STRING,
      contact_email STRING,
      contact_phone STRING,
      contact_zipcode STRING,
      submission_date TIMESTAMP,
      submission_status STRING,
      update_date TIMESTAMP
    )
  `;
  try {
    const lol =  await getRequestToCarto(query);
    logger.info(`Successfully changed data types: ${lol}`);
    return lol;
  } catch(error) {
    console.error(error);
    throw error;
  }
};

export const createPhaRetailerTable = async () => {
  logger.info("executing function: createPhaRetailerTable");
  const query = `
    CREATE TABLE carto-dw-ac-j9wxt0nz.shared.pha_retailer (
      retailer_id string,
      geom geography,
      name string,
      address_1 string,
      address_2 string,
      phone string,
      city string,
      state string,
      zipcode string,
      sun_open string,
      sun_close string,
      mon_open string,
      mon_close string,
      tues_open string,
      tues_close string,
      wed_open string,
      wed_close string,
      thurs_open string,
      thurs_close string,
      fri_open string,
      fri_close string,
      sat_open string,
      sat_close string,
      website string,
      facebook string,
      instagram string,
      twitter string,
      email string,
      corner_store string,
      distribution string,
      farmers_market string,
      food_pantry string,
      food_co_op string,
      supermarket string,
      dollar_stores string,
      wic_accepted string,
      snap_accepted string,
      description string,
      availability string,
      quality string,
      visibility string,
      local string,
      produce_avail_store string,
      produce_avail_seasonally string,
      owner_photo string,
      owner_name string,
      contact_name string,
      contact_email string,
      contact_owner string,
      contact_patron string,
      general_store string,
      grocery_store string,
      submission_date timestamp,
      submission_status string,
      imagelinks string,
      update_date timestamp
    )
    `;
  try {
    const lol =  await getRequestToCarto(query);
    logger.info(`Successfully changed data types: ${lol}`);
    return lol;
  } catch(error) {
    console.error(error);
    throw error;
  }
}

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
    logger.info(`Starting query to Carto: ${query}`);
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
    console.error(error);
    if (error.response?.status == 404) {
      throw new NotFoundError('Table not found');
    }
    throw error;
  }
};

export const deleteJob = async (id: string, table: string, links: string, field: string) => {
  logger.info("executing function: deleteJob");
  try {
    const obj = {
      [RETAILER]: {
        table: PHA_RETAILER_TABLE,
        id: 'retailer_id'
      },
      [INDIVIDUAL]: {
        table: PHA_INDIVIDUAL,
        id: 'individual_id'
      }
    };
    const getFieldQuery = `SELECT ${field} FROM ${obj[table].table} WHERE ${obj[table].id} = '${id}'`;
    const response = await getRequestToCarto(getFieldQuery);
    const array = (response.rows[0][field] || '').split(',');
    const toDelete = array.filter(link => !links.includes(link));
    deleteGoogleFiles(toDelete);
  } catch(error) {
    logger.error(error);
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
  individual.submission_date = (new Date()).toISOString();
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
    const unionQuery = getDashboardQuery(queryParams);
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
    const countQuery = getRowsOnDashboard(queryParams);
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
  retailer.submission_date = (new Date()).toISOString();
  retailer.submission_status = 'Pending';
  retailer.retailer_id = uuidv4();
  const query = insertPHARetailerQuery(retailer);
  try{
    const response = getRequestToCarto(query);
    return response;
  } catch (error) {
    console.error(error);
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

export const getPHAIndividualCSV = async (individualIds: string[]) => {
  logger.info("executing function: getPHAIndividualCSV");
  const params = JSON.stringify(individualIds);
  logger.debug(`with params: ${params}`);
  const query = getPHAIndividualCSVQuery(individualIds);
  try{
    const response = await getRequestToCarto(query);
    const json2csv = new Parser({fields: Object.keys(response.rows[0])});
    const csv = json2csv.parse(response.rows);
    return csv;
  } catch (error) {
    throw error;
  }
}

export const deleteOsmPoint = async (osmId: string) => {
  logger.info("executing funcion: delete Osm Point");
  const query = getDeleteOsmPointQuery(osmId);
  try {
    const response = await getRequestToCarto(query);
    return response.rows[0];
  } catch(error) {
    console.error(error);
    throw error;
  }
}

