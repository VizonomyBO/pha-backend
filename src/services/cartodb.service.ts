import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { QueryParams } from '../@types';
import { PhaIndividual, PhaRetailer } from '../@types/database';
import config from '../config';
import validatePhaRetailer from '../validation/PhaRetailer';
import validatePhaIndividual from '../validation/PhaIndividual';
import {  CONNECTION_NAME,
          PHA_RETAILER_TABLE,
          PHA_INDIVIDUAL,
          CARTO_AUTH_URL,
          CARTO_API,
          CARTO_API_VERSION } from '../constants'

export const getOAuthToken = async (): Promise<string> => {
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
    console.error(error);
    throw error.response.data;
  }
};

const getRequestToCarto = async (query: string) => {
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
    console.error(error);
    throw error.response.data;
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
  try {
    const query = `SELECT * FROM ${PHA_RETAILER_TABLE} WHERE retailer_id = '${id}'`;
    const response = await getRequestToCarto(query);
    return response.rows[0];
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export const insertIntoPHAIndividual = async (individual: PhaIndividual) => {
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
    const response = getRequestToCarto(query);
    return response;
  } else {
    console.log(validatePhaIndividual.errors);
    throw new Error(validatePhaRetailer.errors?.toString());
  }
};

export const getIndividual = async (queryParams: QueryParams) => {
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
    //console.log(query);
    const response = await getRequestToCarto(query);
    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getRetailer = (queryParams: QueryParams) => {
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
}

export const insertIntoPHARetailer = async (retailer: PhaRetailer) => {
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
    const response = getRequestToCarto(query);
    return response;
  } else {
    console.log(validatePhaRetailer.errors);
    throw new Error(validatePhaRetailer.errors?.toString());
  }
}
