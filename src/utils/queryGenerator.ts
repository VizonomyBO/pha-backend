import { PhaIndividual, PhaRetailer } from '@/@types/database';
import { FiltersInterface, GoogleBbox, Propierties, QueryParams } from '../@types';
import { DATA_SOURCES, PHA_INDIVIDUAL, PHA_RETAILER_TABLE, RETAILERS_OSM, RETAILERS_OSM_SOURCE, RETAILERS_PHA, RETAILERS_USDA, RETAILERS_USDA_SOURCE, SUPERSTART_LAST_VALUE_TABLE, SUPERSTAR_UPDATES_TABLE } from '../constants';

const bboxGoogleToGooglePolygon = (bbox: GoogleBbox) => {
  const {xmin: minLng, ymin: minLat, xmax: maxLng, ymax: maxLat} = bbox;
  return `POLYGON((${minLng} ${minLat}, ${minLng} ${maxLat}, ${maxLng} ${maxLat}, ${maxLng} ${minLat}, ${minLng} ${minLat}))`;
};
export const whereSearch = (search: string, who?: string) => {
  const searchValue = search.replace('%20', ' ');
  let where: string = '';
  if (search !== '') {
    const upperSearch = searchValue.toUpperCase();
    const lowerSearch = searchValue.toLowerCase();
    if (who === RETAILERS_PHA) {
      where = `AND (address_1 like '%${searchValue}%' OR address_1 like '%${upperSearch}%' OR address_1 like '%${lowerSearch}%')`;
    }
    if (who === RETAILERS_USDA_SOURCE) {
      where = `WHERE (location_address like '%${searchValue}%' OR location_address like '%${upperSearch}%' OR location_address like '%${lowerSearch}%')`;
    }
    if (who === RETAILERS_OSM_SOURCE) {
      where = `WHERE (address like '%${searchValue}%' OR address like '%${upperSearch}%' OR address like '%${lowerSearch}%')`;
    }
  }
  return where;
};
export const whereFilterQueries = (filters: FiltersInterface, who?: string) => {
  const where: string[][] = [];
  if (who === RETAILERS_PHA) {
    where.push(["submission_status = 'Approved' AND permanently_closed != 'Yes'"]);
    if (filters.superstar_badge) {
      where.push([`superstar_badge = '${filters.superstar_badge}'`]);
    }
    if (filters.verifiedDateRange) {
      where.push(
        [`update_date >= TIMESTAMP('${filters.verifiedDateRange[0]}') 
        AND update_date <= TIMESTAMP('${filters.verifiedDateRange[1]}')`]
      );
    }
    if (filters.superstarDateRange) {
      where.push(
        [`superstar_badge_update >= TIMESTAMP('${filters.superstarDateRange[0]}') 
        AND superstar_badge_update <= TIMESTAMP('${filters.superstarDateRange[1]}')`]
      );
    }
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
    // console.log(where);
    const rows = where.map(row => `(${row.join(' OR ')})`);
    suffix = `WHERE ${rows.join(' AND ')}`;
  }
  return suffix;
};

export const buildFilterQueries = (filters: FiltersInterface) => {
  const queries = {};
  filters.dataSources.forEach(dataSource => {
    const whereSearchValue = whereSearch(filters.search ? filters.search : '', dataSource);
    const suffix = whereFilterQueries(filters, dataSource);
    if (dataSource === RETAILERS_OSM_SOURCE) {
      queries[dataSource] = `SELECT * REPLACE(ST_CENTROID(geom) AS geom) FROM ${DATA_SOURCES[dataSource]} ${suffix} ${whereSearchValue}`;
    }
    else {
      queries[dataSource] = `SELECT * FROM ${DATA_SOURCES[dataSource]} ${suffix} ${whereSearchValue}`;
      if (dataSource === RETAILERS_PHA) {
        const superYes = "(superstar_badge = 'Yes')";
        const superNo = "(superstar_badge != 'Yes')";
        const specialSuffix = suffix.length ? `${suffix} AND ${superYes}` : `WHERE ${superYes}`;
        queries[`${dataSource}-superstar_yes`] = `SELECT * FROM ${DATA_SOURCES[dataSource]} ${specialSuffix} ${whereSearchValue}`;
        queries[`${dataSource}-superstar_no`] = `SELECT * FROM ${DATA_SOURCES[dataSource]} ${specialSuffix.replace(superYes, superNo)} ${whereSearchValue}`;
      }
    }
  });
  return queries;
};

export const getMapQuery = (filters: FiltersInterface, queryParams: QueryParams) => {
  const fields = ['retailer_id', 'imagelinks', 'geom', 'name', 'address_1', 'city',
  'superstar_badge', 'update_date', 'superstar_badge_update',
    'state', 'zipcode', 'wic_accepted', 'snap_accepted', 'submission_status', 'submission_date', 'snap_option', 'phone'];
  const where = whereFilterQueries(filters, RETAILERS_PHA);
  const queries: string[] = [];
  const { page, limit, dateRange, search } = queryParams;
  const [startDate, endDate] = dateRange.split(' - ');
  const offset = (page - 1) * limit;
  const limitQuery = ` ORDER BY submission_date DESC, name DESC LIMIT ${limit + 1} OFFSET ${offset}`;
  filters.dataSources.forEach(source => {
    const whereSearchValue = whereSearch(search, source);
    let finalFields = '';
    if (source === RETAILERS_PHA) {
      finalFields = fields.join(`,`);
      finalFields = finalFields.replace('snap_option', 'NULL as snap_option');
    }
    if (source === RETAILERS_OSM_SOURCE) {
      finalFields = fields.join(', ');
      finalFields = finalFields.replace('geom', 'ST_CENTROID(geom) as geom');
      finalFields = finalFields.replace('state', 'NULL as state');
      finalFields = finalFields.replace('retailer_id', 'CAST(master_id as STRING) as retailer_id');
      finalFields = finalFields.replace('imagelinks', 'NULL as imagelinks');
      finalFields = finalFields.replace('address_1', 'address as address_1');
      finalFields = finalFields.replace('zipcode', 'CAST(postcode as STRING) as zipcode');
      finalFields = finalFields.replace('wic_accepted', 'NULL as wic_accepted');
      finalFields = finalFields.replace('snap_accepted', 'NULL as snap_accepted');
      finalFields = finalFields.replace('snap_option', 'NULL as snap_option');
      finalFields = finalFields.replace('submission_date','osm_timestamp as submission_date');
      finalFields = finalFields.replace('phone', 'NULL as phone');
      finalFields = finalFields.replace('superstar_badge', "'NO' as superstar_badge");
      finalFields = finalFields.replace('update_date', "NULL as update_date");
      finalFields = finalFields.replace('superstar_badge_update', "NULL as superstar_badge_update");
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
      finalFields = finalFields.replace('submission_date', 'submission_date2 as submission_date');
      finalFields = finalFields.replace('phone', 'NULL as phone');
      finalFields = finalFields.replace('superstar_badge', "'NO' as superstar_badge");
      finalFields = finalFields.replace('update_date', "NULL as update_date");
      finalFields = finalFields.replace('superstar_badge_update', "NULL as superstar_badge_update");
    }
    if (source === RETAILERS_PHA) {
      queries.push(`(SELECT ${finalFields}, '${source}' as source FROM ${DATA_SOURCES[source]} ${where} AND (update_date >= TIMESTAMP('${startDate}') AND update_date <= TIMESTAMP('${endDate}')) ${whereSearchValue})`);
    } else {
      if (filters.bbox) {
        const bboxWhere = `WHERE ST_CONTAINS(ST_GEOGFROMTEXT('${bboxGoogleToGooglePolygon(filters.bbox)}'), geom)`;
        queries.push(`(SELECT ${finalFields}, '${source}' as source FROM ${DATA_SOURCES[source]} ${bboxWhere} ${whereSearchValue})`);
      } else {
        queries.push(`SELECT ${finalFields}, '${source}' as source FROM ${DATA_SOURCES[source]} ${whereSearchValue}`);
      }
    }
  });
  const unionQuery = `(${queries.join(' UNION ALL ')})  `;
  const auxQuery = `WITH aux AS (${unionQuery})
    SELECT *, count(*) over() as total FROM aux ${limitQuery}`;
  return auxQuery;
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
  /*if (queryParams) {
    const {where, suffix} = generateWhereArray(queryParams);
    if (where.length) {
      query += ` WHERE ${where.join(' AND ')}`;
    }
    query += suffix;
  }*/
  return query;
};

export const getDashboardQuery = (queryParams: QueryParams) => {
  const individualQuery = getIndividualQuery();
  const retailerQuery = getRetailerQuery();
  const fieldsToReturn = `retailer_id, name, submission_date, submission_status, address_1, contact_name,
  contact_email, permanently_closed`;
  const {where: whereArray, suffix} = generateWhereArray(queryParams);
  let where = '';
  if (whereArray.length) {
    where = `WHERE ${whereArray.join(' AND ')}`;
  }
  let query = `SELECT ${fieldsToReturn}, superstar_badge, zipcode, manual FROM (${retailerQuery})
    ${where} ORDER BY submission_date DESC ${suffix}`;
  // console.log(queryParams);
  if (queryParams.isUnvalidated) {
    const unionQuery = `SELECT
      name,
      CAST(master_id as STRING) as retailer_id,
      NULL as imagelinks,
      address as address_1,
      CAST(postcode as STRING) as zipcode,
      ST_CENTROID(geom) as geom,
      NULL as state,
      NULL as city,
      NULL as wic_accepted,
      NULL as snap_accepted,
      osm_timestamp as submission_date,
      NULL as phone,
      NULL as manual
    FROM ${RETAILERS_OSM}
    UNION ALL
    SELECT
      listing_name as name,
      CAST(listing_id as STRING) as retailer_id,
      NULL as imagelinks,
      location_address as address_1,
      NULL as zipcode,
      geom,
      NULL as city,
      NULL as state,
      NULL as wic_accepted,
      NULL as snap_accepted,
      submission_date2 as submission_date,
      NULL as phone,
      NULL AS manual
    FROM ${RETAILERS_USDA}`;
    const limitQuery = ` ORDER BY submission_date DESC, name DESC LIMIT ${queryParams.limit} OFFSET ${(queryParams.page - 1) * queryParams.limit}`;
    const auxQuery = `WITH aux AS (${unionQuery})
    SELECT *, count(*) over() as total FROM aux ${limitQuery}`;
    return auxQuery;
  }
  if (!queryParams.isRetailer) {
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

export const getImagesQuery = (retailerId: string) => {
  const query = `SELECT imagelinks FROM ${PHA_INDIVIDUAL} WHERE submission_status = 'Approved' AND retailer_id = '${retailerId}'`;
  return query;
}

export const generateWhereArray = (queryParams: QueryParams) => {
  const { page, limit, search, status, dateRange } = queryParams;
  const offset = (page - 1) * limit;
  const suffix = ` LIMIT ${queryParams.limit} OFFSET ${offset}`;
  const where: string[] = [`submission_status != 'Deleted'`];
  if (search) {
    const upperSearch = search.toUpperCase();
    where.push(`(UPPER(name) LIKE '%${upperSearch}%' OR zipcode like '%${upperSearch}%')`);
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
    if (key !== 'submission_date') {
      fields.push(key);
      fieldValues.push(individual[key]);
    }
  });
  const query = `
  INSERT INTO ${PHA_INDIVIDUAL}
    (
      submission_date,
      ${`${fields.join(', ')}`}
    )
    VALUES 
    (
      TIMESTAMP('${individual.submission_date}'),
      ${`'${fieldValues.join('\', \'')}'`}
    )`;
  return query;
}

export const insertPHARetailerQuery = (retailer: PhaRetailer) => {
  const fields: string[] = [];
  const fieldValues: string[] = [];
  Object.keys(retailer).forEach((key: string) => {
    if (key !== 'longitude' && key !== 'latitude' && key != 'submission_date') {
      fields.push(key);
      fieldValues.push(retailer[key]);
    }
  });
  const query = `
  INSERT INTO ${PHA_RETAILER_TABLE}
    (
      submission_date,
      geom,
      permanently_closed,
      ${`${fields.join(', ')}`}
    )
    VALUES 
    (
      TIMESTAMP('${retailer.submission_date}'),
      ST_GEOGPOINT(${retailer.longitude}, ${retailer.latitude}),
      'No',
      ${`'${fieldValues.join('\', \'')}'`}
    )`;
  return query;
}

export const updatePHARetailerQuery = (retailer: PhaRetailer, retailerId: string) => {
  const fields: Propierties[] = [];
  Object.keys(retailer).forEach((key: string) => {
    if (key !== 'longitude' && key !== 'latitude' && key != 'submission_date' && key !== 'update_date') {
      fields.push({
        key: key,
        value: retailer[key]
      });
    }
  });
  const query = `
  UPDATE ${PHA_RETAILER_TABLE}
  SET
    update_date = TIMESTAMP('${retailer.update_date}'),
    ${`${fields.map((elem) => {
      return `${elem.key} =  '${elem.value}'`;
    }).join(', ')}`}
  WHERE retailer_id = '${retailerId}';`; 
  return query;
}

export const updateSwitch = (retailerId: string, value: string, field: string) => {
  const extra = field === 'superstar_badge' ? `, manual = TRUE` : '';
  const query = `
  UPDATE ${PHA_RETAILER_TABLE}
  SET
    ${field} = '${value}',
    ${field}_update = TIMESTAMP('${new Date().toISOString()}')
    ${extra}
  WHERE retailer_id = '${retailerId}';`; 
  return query;
}

export const updatePHAIndividualQuery = (individual: PhaIndividual, individualId: string) => {
  const fields: Propierties[] = [];
  Object.keys(individual).forEach((key: string) => {
    if (key !== 'longitude' && key !== 'latitude' && key != 'submission_date' && key !== 'update_date') {
      fields.push({
        key: key,
        value: individual[key]
      });
    }
  });
  const query = `
    UPDATE ${PHA_INDIVIDUAL}
    SET
      update_date = TIMESTAMP('${individual.update_date}'),
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
    DELETE FROM ${RETAILERS_OSM} where CAST(master_id as STRING) = ${id}
  `;
  return query;
}

export const getDeleteUSDAPointQuery = (id: string) => {
  const query = `
    DELETE FROM ${RETAILERS_USDA} where CAST(listing_id as STRING) = ${id}
  `;
  return query;
}

export const deleteQuery = (table: string, ids: string[]) => {
  const column = RETAILERS_PHA === table ? 'retailer_id': 'individual_id';
  const query = `DELETE FROM ${DATA_SOURCES[table]} WHERE ${column} IN (${ids.map((a) => `'${a}'`).join(', ')});`;
  return query;
}

export const deleteOSMQuery = (ids: string[]) => {
  const column = 'master_id';
  const query = `DELETE FROM ${RETAILERS_OSM} WHERE CAST(${column} as STRING) IN (${ids.map((a) => `'${a}'`).join(', ')});`;
  return query;
}

export const deleteUSDQuery = (ids: string[]) => {
  const column = 'listing_id';
  const query = `DELETE FROM ${RETAILERS_USDA} WHERE CAST(${column} as STRING) IN (${ids.map((a) => `'${a}'`).join(', ')});`;
  return query;
}

export const approveQuery = (table: string, ids: string[]) => {
  const column = RETAILERS_PHA === table ? 'retailer_id': 'individual_id';
  const update_date = new Date().toISOString();
  const query = `
    UPDATE ${DATA_SOURCES[table]}
    SET 
      update_date = TIMESTAMP('${update_date}'),
      submission_status = 'Approved'
    WHERE ${column} IN (${ids.map((a) => `'${a}'`).join(', ')});`;
  return query;
}

export const getRetailersByMonthQuery = (dateRange: string) => {
  const [startDate, endDate] = dateRange.split(' - ');
  const query = `
    SELECT
      FORMAT_DATE('%m-%Y', DATE(update_date)) as month,
      count(*) as count
    FROM ${PHA_RETAILER_TABLE}
    WHERE update_date >= TIMESTAMP('${startDate}')
    AND update_date <= TIMESTAMP('${endDate}')
    AND  submission_status = 'Approved'
    GROUP BY month
  `;
  return query;
}

export const findRetailersByMonthQuery = (filters: FiltersInterface) => {
  const where = whereFilterQueries(filters, RETAILERS_PHA);
  const query = `
    SELECT
      FORMAT_DATE('%m-%Y', DATE(update_date)) as month,
      count(*) as count
    FROM ${PHA_RETAILER_TABLE}
    ${where}
    GROUP BY month
  `;
  return query;
}

export const countSuperstarByMonthQuery = (dateRange: string) => {
  const [startDate, endDate] = dateRange.split(' - ');
  const query = `
    SELECT
      FORMAT_DATE('%m-%Y', DATE(created_at)) as month,
      count(*) as count
      , COUNT(CASE WHEN superstar_badge IS True THEN 1 END) as superstar_badge_count
      , COUNT(CASE WHEN superstar_badge IS NOT True THEN 1 END) as no_superstar_badge_count
    FROM ${SUPERSTAR_UPDATES_TABLE}
    WHERE created_at >= TIMESTAMP('${startDate}')
    AND created_at <= TIMESTAMP('${endDate}')
    GROUP BY month
  `;
  return query;
}

export const findSuperstarByMonthQuery = (filters: FiltersInterface) => {
  const where: string[][] = [];
  if (filters.verifiedDateRange) {
    where.push(
      [`update_date >= TIMESTAMP('${filters.verifiedDateRange[0]}') 
      AND update_date <= TIMESTAMP('${filters.verifiedDateRange[1]}')`]
    );
  }
  if (filters.categories) {
    const row: string[] = [];
    filters.categories.forEach(category => {
      row.push(`rt.${category} = 'Yes'`);
    });
    if (row.length) {
      where.push(row);
    }
  }
  if (filters.accesibility) {
    const row: string[] = [];
    filters.accesibility.forEach(accessibility => {
      row.push(`rt.${accessibility} = 'Yes'`);
    });
    if (row.length) {
      where.push(row);
    }
  }
  let suffix = '';
  if (where.length) {
    const rows = where.map(row => `(${row.join(' OR ')})`);
    suffix = `WHERE ${rows.join(' AND ')}`;
  }
  const query = `
    SELECT
      FORMAT_DATE('%m-%Y', DATE(st.created_at)) as month,
      count(*) as count
      , COUNT(CASE WHEN st.superstar_badge IS True THEN 1 END) as superstar_badge_count
      , COUNT(CASE WHEN st.superstar_badge IS NOT True THEN 1 END) as no_superstar_badge_count
    FROM ${SUPERSTAR_UPDATES_TABLE} st INNER JOIN ${PHA_RETAILER_TABLE} rt
    ON st.retailer_id = rt.retailer_id
    ${suffix}
    GROUP BY month
  `;
  return query;
}

export const  automaicallySetSuperstarBadgeQuery = () => {
  const query = `
  
  UPDATE ${PHA_RETAILER_TABLE}
  SET superstar_badge = 'Yes',
  superstar_badge_update = TIMESTAMP('${new Date().toISOString()}') 
  WHERE submission_status = 'Approved'
  AND permanently_closed != 'Yes'
  AND manual IS NOT TRUE
  AND retailer_id IN (
      SELECT retailer_id FROM (
      SELECT fresh_percentage,
        acceptable_percentage,
        visible_percentage,
        local_percentage,
        meets_need_percentage,
        retailer_id FROM (
        SELECT (fresh / total) AS fresh_percentage,
        (acceptable / total) AS acceptable_percentage,
        (visible / total) AS visible_percentage,
        (local / total) AS local_percentage,
        (meets_need / total) AS meets_need_percentage,
        retailer_id
        FROM (SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN availability = 'Fresh' THEN 1 ELSE 0 END) AS fresh,
        SUM(CASE WHEN quality = 'Acceptable' THEN 1 ELSE 0 END) AS acceptable,
        SUM(CASE WHEN visibility = 'Yes' THEN 1 ELSE 0 END) AS visible,
        SUM(CASE WHEN local = 'Yes' THEN 1 ELSE 0 END) AS local,
        SUM(CASE WHEN meets_need = 'Yes' THEN 1 ELSE 0 END) AS meets_need,
        retailer_id
        FROM ${PHA_INDIVIDUAL} WHERE submission_status = 'Approved'
        GROUP BY retailer_id) ) WHERE fresh_percentage >= 0.5
        AND acceptable_percentage >= 0.5
        AND visible_percentage >= 0.5
        AND local_percentage >= 0.5
      )
    ); 
    UPDATE ${PHA_RETAILER_TABLE}
    SET superstar_badge = 'No',
    superstar_badge_update = TIMESTAMP('${new Date().toISOString()}') 
    WHERE submission_status = 'Approved'
    AND permanently_closed != 'Yes'
    AND manual IS NOT TRUE
    AND (retailer_id IN (
      SELECT retailer_id FROM (
      SELECT fresh_percentage,
        acceptable_percentage,
        visible_percentage,
        local_percentage,
        meets_need_percentage,
        retailer_id FROM (
        SELECT (fresh / total) AS fresh_percentage,
        (acceptable / total) AS acceptable_percentage,
        (visible / total) AS visible_percentage,
        (local / total) AS local_percentage,
        (meets_need / total) AS meets_need_percentage,
        retailer_id
        FROM (SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN availability = 'Fresh' THEN 1 ELSE 0 END) AS fresh,
        SUM(CASE WHEN quality = 'Acceptable' THEN 1 ELSE 0 END) AS acceptable,
        SUM(CASE WHEN visibility = 'Yes' THEN 1 ELSE 0 END) AS visible,
        SUM(CASE WHEN local = 'Yes' THEN 1 ELSE 0 END) AS local,
        SUM(CASE WHEN meets_need = 'Yes' THEN 1 ELSE 0 END) AS meets_need,
        retailer_id
        FROM ${PHA_INDIVIDUAL} WHERE submission_status = 'Approved'
        GROUP BY retailer_id) ) WHERE fresh_percentage < 0.5
        AND acceptable_percentage < 0.5
        AND visible_percentage < 0.5
        AND local_percentage < 0.5
      )
    ) AND retailer_id IN (
      SELECT retailer_id FROM ${SUPERSTAR_UPDATES_TABLE}
    ));
    INSERT INTO ${SUPERSTAR_UPDATES_TABLE}
    (superstar_badge, created_at, retailer_id) SELECT FALSE as super_star_badge, TIMESTAMP('${new Date().toISOString()}') as created_at, retailer_id FROM  ${PHA_RETAILER_TABLE}
    WHERE submission_status = 'Approved'
    AND permanently_closed != 'Yes'
    AND manual IS NOT TRUE
    AND (retailer_id IN (
      SELECT retailer_id FROM (
      SELECT fresh_percentage,
        acceptable_percentage,
        visible_percentage,
        local_percentage,
        meets_need_percentage,
        retailer_id FROM (
        SELECT (fresh / total) AS fresh_percentage,
        (acceptable / total) AS acceptable_percentage,
        (visible / total) AS visible_percentage,
        (local / total) AS local_percentage,
        (meets_need / total) AS meets_need_percentage,
        retailer_id
        FROM (SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN availability = 'Fresh' THEN 1 ELSE 0 END) AS fresh,
        SUM(CASE WHEN quality = 'Acceptable' THEN 1 ELSE 0 END) AS acceptable,
        SUM(CASE WHEN visibility = 'Yes' THEN 1 ELSE 0 END) AS visible,
        SUM(CASE WHEN local = 'Yes' THEN 1 ELSE 0 END) AS local,
        SUM(CASE WHEN meets_need = 'Yes' THEN 1 ELSE 0 END) AS meets_need,
        retailer_id
        FROM ${PHA_INDIVIDUAL} WHERE submission_status = 'Approved'
        GROUP BY retailer_id) ) WHERE fresh_percentage < 0.5
        AND acceptable_percentage < 0.5
        AND visible_percentage < 0.5
        AND local_percentage < 0.5
      )
    ) AND  retailer_id IN (
      SELECT retailer_id FROM ${SUPERSTAR_UPDATES_TABLE}
    )) AND retailer_id NOT IN (
      SELECT retailer_id FROM ${SUPERSTART_LAST_VALUE_TABLE}
       WHERE last_value IS False);
    INSERT INTO ${SUPERSTAR_UPDATES_TABLE}
    (superstar_badge, created_at, retailer_id) SELECT True as super_star_badge, TIMESTAMP('${new Date().toISOString()}') as created_at, retailer_id FROM  ${PHA_RETAILER_TABLE}
    WHERE submission_status = 'Approved'
    AND permanently_closed != 'Yes'
    AND manual IS NOT TRUE
    AND retailer_id IN (
      SELECT retailer_id FROM (
      SELECT fresh_percentage,
        acceptable_percentage,
        visible_percentage,
        local_percentage,
        meets_need_percentage,
        retailer_id FROM (
        SELECT (fresh / total) AS fresh_percentage,
        (acceptable / total) AS acceptable_percentage,
        (visible / total) AS visible_percentage,
        (local / total) AS local_percentage,
        (meets_need / total) AS meets_need_percentage,
        retailer_id
        FROM (SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN availability = 'Fresh' THEN 1 ELSE 0 END) AS fresh,
        SUM(CASE WHEN quality = 'Acceptable' THEN 1 ELSE 0 END) AS acceptable,
        SUM(CASE WHEN visibility = 'Yes' THEN 1 ELSE 0 END) AS visible,
        SUM(CASE WHEN local = 'Yes' THEN 1 ELSE 0 END) AS local,
        SUM(CASE WHEN meets_need = 'Yes' THEN 1 ELSE 0 END) AS meets_need,
        retailer_id
        FROM ${PHA_INDIVIDUAL} WHERE submission_status = 'Approved'
        GROUP BY retailer_id) ) WHERE fresh_percentage >= 0.5
        AND acceptable_percentage >= 0.5
        AND visible_percentage >= 0.5
        AND local_percentage >= 0.5
      )
    )  AND retailer_id NOT IN (
      SELECT retailer_id FROM ${SUPERSTART_LAST_VALUE_TABLE}
       WHERE last_value IS True);
    INSERT INTO 
       ${SUPERSTAR_UPDATES_TABLE}
       (superstar_badge, created_at, retailer_id) 
       SELECT 
       True as super_star_badge,
       TIMESTAMP('${new Date().toISOString()}') as created_at, retailer_id 
       FROM  ${PHA_RETAILER_TABLE}
       WHERE submission_status = 'Approved'
       AND permanently_closed != 'Yes'
       AND superstar_badge = 'Yes'
       AND manual IS true
       AND retailer_id NOT IN (
         SELECT a.retailer_id 
         FROM 
         ${SUPERSTART_LAST_VALUE_TABLE} a, 
         ${PHA_RETAILER_TABLE} b
           WHERE a.last_value = True
           AND b.retailer_id = a.retailer_id
       );
    INSERT INTO 
    ${SUPERSTAR_UPDATES_TABLE}
    (superstar_badge, created_at, retailer_id) 
    SELECT 
    False as super_star_badge,
    TIMESTAMP('${new Date().toISOString()}') as created_at, retailer_id 
    FROM  ${PHA_RETAILER_TABLE}
    WHERE submission_status = 'Approved'
    AND permanently_closed != 'Yes'
    AND superstar_badge != 'Yes'
    AND manual IS true
    AND retailer_id NOT IN (
      SELECT a.retailer_id 
      FROM 
      ${SUPERSTART_LAST_VALUE_TABLE} a, 
      ${PHA_RETAILER_TABLE} b
        WHERE a.last_value = False
        AND b.retailer_id = a.retailer_id
    ) AND retailer_id IN (
      SELECT retailer_id FROM ${SUPERSTAR_UPDATES_TABLE}
    );
    MERGE INTO ${SUPERSTART_LAST_VALUE_TABLE} T
    USING (SELECT retailer_id, CASE WHEN superstar_badge = 'Yes' THEN True WHEN superstar_badge != 'Yes' THEN False END  as last_value FROM ${PHA_RETAILER_TABLE} WHERE 
    submission_status='Approved' AND permanently_closed != 'Yes') S
    ON (T.retailer_id = S.retailer_id)
    WHEN MATCHED THEN UPDATE SET T.last_value = S.last_value
    WHEN NOT MATCHED THEN INSERT (retailer_id, last_value) VALUES (S.retailer_id, S.last_value);
  `;
  return query;
}
