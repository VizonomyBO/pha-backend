import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { QueryParams } from '../@types';
import { PhaIndividual, PhaRetailer } from '../@types/database';
import config from '../config';
import validatePhaRetailer from '../validation/PhaRetailer';

const CONNECTION_NAME = 'carto_dw';
const PHA_RETAILER_TABLE = 'carto-dw-ac-j9wxt0nz.shared.pha_retailer_2';
const PHA_INDIVIDUAL = 'carto-dw-ac-j9wxt0nz.shared.pha_individual';

export const getOAuthToken = async (): Promise<string> => {
  try {
    const response = await axios.post(
      'https://auth.carto.com/oauth/token',
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
      `https://gcp-us-east1.api.carto.com/v3/sql/${CONNECTION_NAME}/query`,
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

type PHAGroup = PhaIndividual | PhaRetailer;

const generateFields = (array: PHAGroup, optionalFields: string[]) => {
  return optionalFields.reduce((acc: string[], curr: string) => {
    if (array[curr]) {
      acc.push(curr);
    }
    return acc;
  }, []);
}

const generateValues = (array: PHAGroup, fields: string[]) => {
  return fields.reduce((acc: string[], curr: string) => {
    acc.push(array[curr]);
    return acc;
  }, [])
}

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
//TODO: ROLO: Now retailer_id is a required field, so we can use your validation to check if it is empty in the middleware
// also please adapt to match with your other  insert function (insertIntoPHARetailer)
export const insertIntoPHAIndividual = async (individual: PhaIndividual) => {
  const optionalFields = [
    'retailer_id',
    'availability',
    'quality',
    'visibility',
    'local',
    'meets_need',
    'produce_avail_store',
    'contact_name',
    'contact_email',
    'contact_phone',
    'contact_zipcode',
    'submission_date',
    'submission_status'
  ];
  const fields = generateFields(individual, optionalFields);
  const fieldValues = generateValues(individual, fields);
  const query = `
    INSERT INTO ${PHA_INDIVIDUAL}
    (
      individual_id,
      submission_date
      ${fields ? ',' : ''}
      ${fields.join(', ')}
    )
    VALUES (
      GENERATE_UUID(),
      '${new Date()}'
      ${fieldValues ? ',' : ''}
      ${fieldValues.map((value: string) => `'${value}'`).join(', ')}
    )
  `;
  // const getAll = `SELECT * FROM ${PHA_INDIVIDUAL}`;
  // console.log(query);
  const response = getRequestToCarto(query);
  return response;
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
  // TODO: Rolo move this to a middleware
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
        ${fields.length > 0 ? `, ${fields.join(', ')}` : ''}
      )
      VALUES 
      (
        ST_GEOGPOINT(${retailer.longitude}, ${retailer.latitude})
        ${fieldValues.length > 0 ? `, '${fieldValues.join('\', \'')}'` : ''}
      )`;
    const response = getRequestToCarto(query);
    return response;
  } else {
    console.log(validatePhaRetailer.errors);
    throw new Error(validatePhaRetailer.errors?.toString());
  }
}