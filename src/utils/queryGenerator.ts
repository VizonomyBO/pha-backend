import { PhaIndividual, PhaRetailer } from '@/@types/database';
import { FiltersInterface, GoogleBbox, Propierties, QueryParams } from '../@types';
import { DATA_SOURCES, PHA_INDIVIDUAL, PHA_RETAILER_TABLE } from '../constants';

const bboxGoogleToGooglePolygon = (bbox: GoogleBbox) => {
  const {xmin: minLng, ymin: minLat, xmax: maxLng, ymax: maxLat} = bbox;
  return `POLYGON((${minLng} ${minLat}, ${minLng} ${maxLat}, ${maxLng} ${maxLat}, ${maxLng} ${minLat}, ${minLng} ${minLat}))`;
};
export const whereFilterQueries = (filters: FiltersInterface) => {
  const where: string[][] = [];
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
    const suffix = whereFilterQueries(filters);
    queries[dataSource] = `SELECT * FROM ${DATA_SOURCES[dataSource]} ${suffix}`;
  });
  return queries;
};

export const getMapQuery = (filters: FiltersInterface, queryParams: QueryParams) => {
  const fields = ['retailer_id', 'geom', 'name', 'address_1', 'city', 'state', 'zipcode', 'wic_accepted', 'snap_accepted'];
  const where = whereFilterQueries(filters);
  const queries: string[] = [];
  const { page, limit } = queryParams;
  const offset = (page - 1) * limit;
  const limitQuery = ` ORDER BY name LIMIT ${limit + 1} OFFSET ${offset}`;
  filters.dataSources.forEach(source => {
    queries.push(`SELECT ${fields.join(',')}, '${source}' as source FROM ${DATA_SOURCES[source]}`);
  });
  const unionQuery = queries.join(' UNION ALL ') + ` ${where} ${limitQuery} `;
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
    const {where, suffix} = generateWhereArray(queryParams);
    if (where.length) {
      query += ` WHERE ${where.join(' AND ')}`;
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

export const getUnionQuery = (queryParams: QueryParams) => {
  const individualQuery = getIndividualQuery();
  const retailerQuery = getRetailerQuery();
  const fieldsToReturn = `retailer_id, name, submission_date, submission_status, address_1, contact_name,
  contact_email`;
  const {where: whereArray, suffix} = generateWhereArray(queryParams);
  let where = '';
  if (whereArray.length) {
    where = `WHERE ${whereArray.join(' AND ')}`;
  }
  const unionQuery = `
      SELECT ${fieldsToReturn}, zipcode FROM (${individualQuery})
    UNION ALL SELECT ${fieldsToReturn}, zipcode FROM (${retailerQuery})
    ${where}
    ORDER BY name ${suffix}`;
  return unionQuery;
}

export const getRowsOnUnion = (queryParams: QueryParams) => {
  const query = getUnionQuery(queryParams).replace(/OFFSET \d+/g, '').replace(/LIMIT \d+/g, '');
  const countQuery = `SELECT COUNT(*) as count FROM (${query}) AS count`;
  return countQuery;
}

export const generateWhereArray = (queryParams: QueryParams) => {
  const { page, limit, search, status, dateRange } = queryParams;
  const offset = (page - 1) * limit;
  const suffix = ` LIMIT ${queryParams.limit} OFFSET ${offset}`;
  const where: string[] = [];
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
  const query = `SELECT * FROM ${PHA_INDIVIDUAL} WHERE individual_id = '${individualId}'`;
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
