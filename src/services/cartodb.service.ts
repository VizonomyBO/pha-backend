import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { QueryParams } from '../@types';
import { PhaIndividual, PhaRetailer } from '../@types/database';
import BadRequestError from '../errors/BadRequestError';
import NotFoudError from '../errors/NotFoundError';
import AuthenticationError from '../errors/AuthenticationError';
import config from '../config';
import validatePhaRetailer from '../validation/PhaRetailer';
import validatePhaIndividual from '../validation/PhaIndividual';
import {  CONNECTION_NAME,
          PHA_RETAILER_TABLE,
          PHA_INDIVIDUAL,
          CARTO_AUTH_URL,
          CARTO_API,
          CARTO_API_VERSION } from '../constants'
import logger from '../utils/LoggerUtil';

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
      throw new NotFoudError('Table not found');
    }
    throw error;
  }
};

export const getBadges = async (id: string) => {
  const query = `
    SELECT (fresh / total) AS fresh_percentage,
          (acceptable / total) AS acceptable_percentage,
          (visible / total) AS visible_percentage,
          (local / total) AS local_percentage,
          (meets_need / total) AS meets_need_percentage
          FROM (SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN availability = 'Fresh' THEN 1 ELSE 0 END) AS fresh,
            SUM(CASE WHEN quality = 'Acceptable' THEN 1 ELSE 0 END) AS acceptable,
            SUM(CASE WHEN visibility = 'Yes' THEN 1 ELSE 0 END) AS visible,
            SUM(CASE WHEN local = 'Yes' THEN 1 ELSE 0 END) AS local,
            SUM(CASE WHEN meets_need = 'Yes' THEN 1 ELSE 0 END) AS meets_need
          FROM ${PHA_INDIVIDUAL}
          WHERE retailer_id = '${id}')`;
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
      throw new NotFoudError("Retailer not found");
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
  if(validatePhaIndividual(individual)) {
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
  } else {
    throw new BadRequestError(validatePhaIndividual.errors?.['0'].message?.toString());
  }
};

export const getIndividual = async (queryParams: QueryParams) => {
  logger.info("executing function: getIndividual");
  const params = JSON.stringify(queryParams);
  logger.debug(`with params: ${params}`);
  try {
    const { page, limit, search, status, dateRange } = queryParams;
    const offset = (page - 1) * limit;
    let query = `SELECT pi.*, pr.name,
    pr.address_1, pr.city, pr.state,
    pr.zipcode
    FROM ${PHA_INDIVIDUAL} pi 
    JOIN ${PHA_RETAILER_TABLE} pr ON pi.retailer_id = pr.retailer_id`;
    const where: string[] = [];
    if (search) {
      const upperSearch = search.toUpperCase();
      where.push(`UPPER(pr.name) LIKE '%${upperSearch}%'`);
    }
    if (status) {
      where.push(`pr.submission_status = '${status}'`);
    }
    // please check the date
    if (dateRange) {
      const [ startDate, endDate ] = dateRange.split('|');
      where.push(`pr.submission_date BETWEEN '${startDate}' AND '${endDate}'`);
    }
    if (where.length) {
      query += ` WHERE ${where.join(' AND ')}`;
    }
    query += ` ORDER BY pi.submission_date DESC LIMIT ${limit} OFFSET ${offset}`;
    const response = await getRequestToCarto(query);
    return response;
  } catch (error) {
    throw error;
  }
};

export const getRetailer = (queryParams: QueryParams) => {
  logger.info("executing function: getRetailer");
  const params = JSON.stringify(queryParams);
  logger.debug(`with params: ${params}`);
  try {
    const { page, limit, search, status, dateRange } = queryParams;
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM ${PHA_RETAILER_TABLE}`;
    const suffix = ` ORDER BY submission_date DESC LIMIT ${queryParams.limit} OFFSET ${offset}`;
    const where: string[] = [];
    if (search) {
      const upperSearch = search.toUpperCase();
      where.push(`UPPER(name) LIKE '%${upperSearch}%'`);
    }
    if (status) {
      where.push(`submission_status = '${status}'`);
    }
    // TODO: verify if this work when we have enough data of many dates, maybe we need to change
    // some things 
    if (dateRange) {
      const [startDate, endDate] = dateRange.split('|');
      where.push(`submission_date BETWEEN '${startDate}' AND '${endDate}'`);
    }
    if (where.length) {
      query += ` WHERE ${where.join(' AND ')}`;
    }
    query += suffix;
    const response = getRequestToCarto(query);
    return response;
  } catch (error) {
    throw error;
  }
}

export const insertIntoPHARetailer = async (retailer: PhaRetailer) => {
  logger.info("executing function: insertIntoPHARetailer");
  const params = JSON.stringify(retailer);
  logger.debug(`with params: ${params}`);
  retailer.submission_date = new Date();
  retailer.submission_status = 'Pending';
  retailer.retailer_id = uuidv4();
  if(validatePhaRetailer(retailer)) {
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
  } else {
    throw new BadRequestError(validatePhaRetailer.errors?.['0'].message?.toString());
  }
}
