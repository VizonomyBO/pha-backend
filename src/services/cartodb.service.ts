import axios from 'axios';
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
      retailer_id
      ${fields ? ',' : ''}
      ${fields.join(', ')}
    )
    VALUES (
      GENERATE_UUID()
      ${fieldValues ? ',' : ''}
      ${fieldValues.map((value: string) => `'${value}'`).join(', ')}
    )
  `;
  // const getAll = `SELECT * FROM ${PHA_INDIVIDUAL}`;
  // console.log(query);
  const response = getRequestToCarto(query);
  return response;
};

export const insertIntoPHARetailer = async (retailer: PhaRetailer) => {
  // TODO: Rolo move this to a middleware
  if(validatePhaRetailer(retailer)) {
    console.log('data valida')
  } else {
    console.log(validatePhaRetailer.errors);
  }
  // TODO: Rolo try to grab this from your JAV library to avoid redundance 
  const optionalFields = [
    'sun_open',
    'sun_close',
    'mon_open',
    'mon_close',
    'tues_open',
    'tues_close',
    'wed_open',
    'wed_close',
    'thurs_open',
    'thurs_close', 
    'fri_open',
    'fri_close',
    'sat_open',
    'sat_close',
    'website',
    'facebook',
    'instagram',
    'twitter',
    'email',
    'owner_name',
    'owner_photo'
  ];
  const fields = optionalFields.reduce((acc: string[], curr: string) => {
    if (retailer[curr]) {
      acc.push(curr);
    }
    return acc;
  }, []);
  const fieldValues = fields.reduce((acc: string[], curr: string) => {
    acc.push(retailer[curr]);
    return acc;
  }, []);
  const query = `
    INSERT INTO ${PHA_RETAILER_TABLE}
      (
        retailer_id,
        geom,
        name,
        address_1,
        address_2,
        phone,
        city,
        state,
        zipcode,
        corner_store,
        distribution,
        farmers_market,
        food_pantry,
        food_co_op,
        supermarket,
        dollar_stores,
        wic_accepted,
        snap_accepted,
        description,
        availability,
        quality,
        visibility,
        local,
        produce_avail_store,
        produce_avail_seasonally,
        contact_name,
        contact_email,
        contact_owner,
        contact_patron,
        general_store,
        grocery_store,
        submission_date,
        submission_status
        ${fields.length > 0 ? `, ${fields.join(', ')}` : ''}
      )
      VALUES 
      (
        GENERATE_UUID(),
        ST_GEOGPOINT(${retailer.longitude}, ${retailer.latitude}),
        '${retailer.name}',
        '${retailer.address_1}',
        '${retailer.address_2}',
        '${retailer.phone}',
        '${retailer.city}',
        '${retailer.state}',
        '${retailer.zipcode}',
        '${retailer.corner_store}',
        '${retailer.distribution}',
        '${retailer.farmers_market}',
        '${retailer.food_pantry}',
        '${retailer.food_co_op}',
        '${retailer.supermarket}',
        '${retailer.dollar_stores}',
        '${retailer.wic_accepted}',
        '${retailer.snap_accepted}',
        '${retailer.description}',
        '${retailer.availability}',
        '${retailer.quality}',
        '${retailer.visibility}',
        '${retailer.local}',
        '${retailer.produce_avail_store}',
        '${retailer.produce_avail_seasonally}',
        '${retailer.contact_name}',
        '${retailer.contact_email}',
        '${retailer.contact_owner}',
        '${retailer.contact_patron}',
        '${retailer.general_store}',
        '${retailer.grocery_store}',
        '${new Date()}',
        'Pending'
        ${fieldValues.length > 0 ? `, '${fieldValues.join('\', \'')}'` : ''}
      )`;
  // const selectAllQuery = `SELECT * FROM ${PHA_RETAILER_TABLE}`;
  const response = getRequestToCarto(query);
  return response;
}