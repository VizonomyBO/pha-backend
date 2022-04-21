import { PhaIndividual, PhaRetailer } from '@/@types/database';
import { FiltersInterface, GoogleBbox, Propierties, QueryParams } from '../@types';
import { DATA_SOURCES, PHA_INDIVIDUAL, PHA_RETAILER_TABLE, RETAILERS_OSM, RETAILERS_OSM_SOURCE, RETAILERS_PHA, RETAILERS_USDA_SOURCE } from '../constants';

const bboxGoogleToGooglePolygon = (bbox: GoogleBbox) => {
  const {xmin: minLng, ymin: minLat, xmax: maxLng, ymax: maxLat} = bbox;
  return `POLYGON((${minLng} ${minLat}, ${minLng} ${maxLat}, ${maxLng} ${maxLat}, ${maxLng} ${minLat}, ${minLng} ${minLat}))`;
};
export const whereFilterQueries = (filters: FiltersInterface, who?: string) => {
  const where: string[][] = [];
  if (who === RETAILERS_PHA) {
    where.push(["submission_status = 'Approved'"]);
  }
  if (filters.categories) {
    const row: string[] = [];
    filters.categories.forEach(category => {
      row.push(`${category} = 'Yes'`);
    });
    if (row.length) {
      where.push(row);
    }
  }
  if (filters.accesibility) {
    const row: string[] = [];
    filters.accesibility.forEach(accessibility => {
      row.push(`${accessibility} = 'Yes'`);
    });
    if (row.length) {
      where.push(row);
    }
  }
  let suffix = '';
  if (filters.bbox) {
    where.push([`ST_CONTAINS(ST_GEOGFROMTEXT('${bboxGoogleToGooglePolygon(filters.bbox)}'), geom)`]);
  }
  if (where.length) {
    console.log(where);
    const rows = where.map(row => `(${row.join(' OR ')})`);
    suffix = `WHERE ${rows.join(' AND ')}`;
  }
  return suffix;
};

export const  buildFilterQueries = (filters: FiltersInterface) => {
  const queries = {};
  filters.dataSources.forEach(dataSource => {
    const suffix = whereFilterQueries(filters, dataSource);
    queries[dataSource] = `SELECT * FROM ${DATA_SOURCES[dataSource]} ${suffix}`;
  });
  return queries;
};

export const getMapQuery = (filters: FiltersInterface, queryParams: QueryParams) => {
  const fields = ['retailer_id', 'imagelinks', 'geom', 'name', 'address_1', 'city',
    'state', 'zipcode', 'wic_accepted', 'snap_accepted', 'submission_status', 'submission_date', 'snap_option'];
  const where = whereFilterQueries(filters, RETAILERS_PHA);
  const queries: string[] = [];
  const { page, limit } = queryParams;
  const offset = (page - 1) * limit;
  const limitQuery = ` ORDER BY submission_date DESC, name DESC LIMIT ${limit + 1} OFFSET ${offset}`;
  filters.dataSources.forEach(source => {
    let finalFields = '';
    if (source === RETAILERS_PHA) {
      finalFields = fields.join(`,`);
      finalFields = finalFields.replace('snap_option', 'NULL as snap_option');
    }
    if (source === RETAILERS_OSM_SOURCE) {
      finalFields = fields.join(', ');
      finalFields = finalFields.replace('state', 'NULL as state');
      finalFields = finalFields.replace('retailer_id', 'CAST(master_id as STRING) as retailer_id');
      finalFields = finalFields.replace('imagelinks', 'NULL as imagelinks');
      finalFields = finalFields.replace('address_1', 'address as address_1');
      finalFields = finalFields.replace('zipcode', 'CAST(postcode as STRING) as zipcode');
      finalFields = finalFields.replace('wic_accepted', 'NULL as wic_accepted');
      finalFields = finalFields.replace('snap_accepted', 'NULL as snap_accepted');
      finalFields = finalFields.replace('snap_option', 'NULL as snap_option');
    }
    if (source === RETAILERS_USDA_SOURCE) {
      finalFields = fields.join(', ');
      finalFields = finalFields.replace('retailer_id', 'CAST(listing_id as STRING) as retailer_id');
      finalFields = finalFields.replace('imagelinks', 'NULL as imagelinks');
      finalFields = finalFields.replace('name', 'listing_name as name');
      finalFields = finalFields.replace('address_1', 'location_address as address_1');
      finalFields = finalFields.replace('zipcode', 'NULL as zipcode');
      finalFields = finalFields.replace('city', 'NULL as city');
      finalFields = finalFields.replace('state', 'NULL as state');
      finalFields = finalFields.replace('wic_accepted', 'NULL as wic_accepted');
      finalFields = finalFields.replace('snap_accepted', 'NULL as snap_accepted');
    }
    if (source === RETAILERS_PHA) {
      queries.push(`(SELECT ${finalFields}, '${source}' as source FROM ${DATA_SOURCES[source]} ${where})`);
    } else {
      if (filters.bbox) {
        const bboxWhere = `WHERE ST_CONTAINS(ST_GEOGFROMTEXT('${bboxGoogleToGooglePolygon(filters.bbox)}'), geom)`;
        queries.push(`(SELECT ${finalFields}, '${source}' as source FROM ${DATA_SOURCES[source]} ${bboxWhere})`);
      } else {
        queries.push(`SELECT ${finalFields}, '${source}' as source FROM ${DATA_SOURCES[source]}`);
      }
    }
  });
  const unionQuery = `(${queries.join(' UNION ALL ')}) ${limitQuery} `;
  return unionQuery;
}

export const getBadgeQuery = (id: string) => {
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
  return query;
};

export const getIndividualQuery = (queryParams?: QueryParams) => {
  let query = `SELECT pi.*, pr.name,
  pr.address_1, pr.city, pr.state,
  pr.zipcode as zipcode
  FROM ${PHA_INDIVIDUAL} pi 
  JOIN ${PHA_RETAILER_TABLE} pr ON pi.retailer_id = pr.retailer_id`;
  if (queryParams) {
    const { suffix, where } = generateWhereArray(queryParams);
    if (where.length) {
      query += ` WHERE ${where.join(' AND ')}`;
      query = query.replace("submission_status != 'Deleted'", "pr.submission_status != 'Deleted' AND pi.submission_status != 'Deleted'");
    }
    query += suffix;
  }
  return query;
};

export const getRetailerQuery = (queryParams?: QueryParams) => {
  let query = `SELECT * FROM ${PHA_RETAILER_TABLE}`;
  if (queryParams) {
    const {where, suffix} = generateWhereArray(queryParams);
    if (where.length) {
      query += ` WHERE ${where.join(' AND ')}`;
    }
    query += suffix;
  }
  return query;
};

export const getDashboardQuery = (queryParams: QueryParams) => {
  const individualQuery = getIndividualQuery();
  const retailerQuery = getRetailerQuery();
  const fieldsToReturn = `retailer_id, name, submission_date, submission_status, address_1, contact_name,
  contact_email`;
  const {where: whereArray, suffix} = generateWhereArray(queryParams);
  let where = '';
  if (whereArray.length) {
    where = `WHERE ${whereArray.join(' AND ')}`;
  }
  let query = `SELECT ${fieldsToReturn}, zipcode FROM (${retailerQuery})
    ${where} ORDER BY submission_date DESC ${suffix}`;
  console.log(queryParams);
  if (!queryParams.isRetailer) {
    console.log('faqiu');
    return `SELECT ${fieldsToReturn}, zipcode, individual_id FROM (${individualQuery}) ${where}
      ORDER BY submission_date DESC ${suffix}`;
  }
  return query;
}

export const getRowsOnDashboard = (queryParams: QueryParams) => {
  const query = getDashboardQuery(queryParams).replace(/OFFSET \d+/g, '').replace(/LIMIT \d+/g, '');
  const countQuery = `SELECT COUNT(*) as count FROM (${query}) AS count`;
  return countQuery;
}

export const generateWhereArray = (queryParams: QueryParams) => {
  const { page, limit, search, status, dateRange } = queryParams;
  const offset = (page - 1) * limit;
  const suffix = ` LIMIT ${queryParams.limit} OFFSET ${offset}`;
  const where: string[] = [`submission_status != 'Deleted'`];
  if (search) {
    const upperSearch = search.toUpperCase();
    where.push(`UPPER(name) LIKE '%${upperSearch}%'`);
  }
  if (status) {
    where.push(`submission_status IN (${status.split(',').map(s => `'${s}'`).join(',')})`);
  }
  // TODO: verify if this work when we have enough data of many dates, maybe we need to change
  // some things 
  if (dateRange) {
    const [startDate, endDate] = dateRange.split('|');
    where.push(`submission_date BETWEEN '${startDate}' AND '${endDate}'`);
  }
  return {where, suffix};
}

export const getPHAIndividualQuery = (individualId: string) => {
  let query = getIndividualQuery();
  query += ` WHERE individual_id = '${individualId}'`;
  return query;
}

export const insertPHAIndividualQuery = (individual: PhaIndividual) => {
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
  return query;
}

export const insertPHARetailerQuery = (retailer: PhaRetailer) => {
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
  return query;
}

export const updatePHARetailerQuery = (retailer: PhaRetailer, retailerId: string) => {
  const fields: Propierties[] = [];
  Object.keys(retailer).forEach((key: string) => {
    if (key !== 'longitude' && key !== 'latitude') {
      fields.push({
        key: key,
        value: retailer[key]
      });
    }
  });
  const query = `
  UPDATE ${PHA_RETAILER_TABLE}
  SET
    ${`${fields.map((elem) => {
      return `${elem.key} =  '${elem.value}'`;
    }).join(', ')}`}
  WHERE retailer_id = '${retailerId}';`; 
  return query;
}

export const updatePHAIndividualQuery = (individual: PhaIndividual, individualId: string) => {
  const fields: Propierties[] = [];
  Object.keys(individual).forEach((key: string) => {
    if (key !== 'longitude' && key !== 'latitude') {
      fields.push({
        key: key,
        value: individual[key]
      });
    }
  });
  const query = `
    UPDATE ${PHA_INDIVIDUAL}
    SET
      ${`${fields.map((elem) => {
        return `${elem.key} =  '${elem.value}'`;
      }).join(', ')}`}
    WHERE individual_id = '${individualId}';`;
  return query;
}

export const getProfileQuery = (retailerId: string) => {
  const query = `SELECT * FROM ${PHA_RETAILER_TABLE} WHERE retailer_id = '${retailerId}'`;
  return query;
}

export const getPHARetailerCSVQuery = (retailerIds: string[]): string => {
  const query = `
    SELECT
      retailer_id,
      ST_X(geom) as longitude,
      ST_Y(geom) as latitude,
      name,
      address_1,
      address_2,
      phone,
      city,
      state,
      zipcode,
      sun_open,
      sun_close,
      mon_open,
      mon_close,
      tues_open,
      tues_close,
      wed_open,
      wed_close,
      thurs_open,
      thurs_close,
      fri_open,
      fri_close,
      sat_open,
      sat_close,
      website,
      facebook,
      instagram,
      twitter,
      email,
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
      owner_photo,
      owner_name,
      contact_name,
      contact_email,
      contact_owner,
      contact_patron,
      general_store,
      grocery_store,
      submission_date,
      submission_status,
      imagelinks
    FROM ${PHA_RETAILER_TABLE}
    ${retailerIds.length ? `WHERE retailer_id IN (${retailerIds.map((a) => `'${a}'`).join(', ')});` : ';'}`;
  return query;
}

export const getPHAIndividualCSVQuery = (individualIds: string[]): string => {
  const query = `
    SELECT
      pi.individual_id,
      pr.retailer_id,
      pi.availability,
      pi.quality,
      pi.visibility,
      pi.local,
      pi.meets_need,
      pi.produce_avail_store,
      pi.contact_name,
      pi.contact_email,
      pi.contact_phone,
      pi.contact_zipcode,
      pi.submission_date,
      pi.submission_status,
      ST_X(pr.geom) as longitude,
      ST_Y(pr.geom) as latitude,
      pr.name,
      pr.address_1,
      pr.address_2,
      pr.phone,
      pr.city,
      pr.state,
      pr.zipcode,
      pr.sun_open,
      pr.sun_close,
      pr.mon_open,
      pr.mon_close,
      pr.tues_open,
      pr.tues_close,
      pr.wed_open,
      pr.wed_close,
      pr.thurs_open,
      pr.thurs_close,
      pr.fri_open,
      pr.fri_close,
      pr.sat_open,
      pr.sat_close,
      pr.website,
      pr.facebook,
      pr.instagram,
      pr.twitter,
      pr.email,
      pr.corner_store,
      pr.distribution,
      pr.farmers_market,
      pr.food_pantry,
      pr.food_co_op,
      pr.supermarket,
      pr.dollar_stores,
      pr.wic_accepted,
      pr.snap_accepted,
      pr.description,
      pr.availability,
      pr.quality,
      pr.visibility,
      pr.local,
      pr.produce_avail_store,
      pr.produce_avail_seasonally,
      pr.owner_photo,
      pr.owner_name,
      pr.contact_name,
      pr.contact_email,
      pr.contact_owner,
      pr.contact_patron,
      pr.general_store,
      pr.grocery_store,
      pr.imagelinks
    FROM ${PHA_INDIVIDUAL} pi
    JOIN ${PHA_RETAILER_TABLE} pr ON pi.retailer_id = pr.retailer_id
    ${individualIds.length ? `WHERE pi.individual_id IN (${individualIds.map((a) => `'${a}'`).join(', ')});` : ';'}`;
  return query;
}

export const getDeleteOsmPointQuery = (id: string) => {
  const query = `
    DELETE FROM ${RETAILERS_OSM} where master_id = ${id}
  `;
  return query;
}
