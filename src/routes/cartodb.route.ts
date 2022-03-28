import * as express from 'express';
import axios from 'axios';
import { PhaRetailer } from '../@types/database';
import validatePhaRetailer from '../validation/PhaRetailer';
import config from '../config';
import { Request, Response } from 'express';
const router = express.Router();

const CONNECTION_NAME = 'carto_dw';
const PHA_RETAILER_TABLE = 'carto-dw-ac-j9wxt0nz.shared.pha_retailer_2';
const getOAuthToken = async (): Promise<string> => {
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
}
router.get('/', async (_: never, res: Response) => {
  res.json({ success: true, message: 'Storage Working' });
});

router.post('/pha-retailer', async (req: Request, res: Response) => {
  const { body } = req;
  const retailer = body as PhaRetailer;
  console.log('BODY: ', JSON.stringify(body, null, 2));
  try {
    const token = await getOAuthToken();
    console.log('my token', token);
    if(validatePhaRetailer(body)) {
      console.log('data valida')
    } else {
      console.log(validatePhaRetailer.errors);
    }
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
    const fields = optionalFields.reduce((acc: string[], curr) => {
      if (retailer[curr]) {
        acc.push(curr);
      }
      return acc;
    }, []);
    const fieldValues = fields.reduce((acc: string[], curr) => {
      acc.push(retailer[curr]);
      return acc;
    }, []);
    const query = `
      INSERT INTO ${PHA_RETAILER_TABLE}
        (
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
          'Pending',
          ${fieldValues.length > 0 ? `'${fieldValues.join('\', \'')}'` : ''}
        )`;
    console.log(query);
    const selectAllQuery = `SELECT * FROM ${PHA_RETAILER_TABLE}`;
    const point = `ST_SetSRID(ST_MakePoint(${retailer.longitude}, ${retailer.latitude}), 4326)`;
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
      res.send({ data: response.data, sucess: true });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.response.data, success: false });
  }
});

export default router;