import { FiltersInterface, QueryParams } from '../@types';
import { DATA_SOURCES, PHA_INDIVIDUAL, PHA_RETAILER_TABLE } from '../constants';

export const buildFilterQueries = (filters: FiltersInterface) => {
  const queries = {};
  filters.dataSources.forEach(dataSource => {
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
    if (filters.badges) {
      // TODO: logic for badges (next pr) pray for Lua
    }
    if (where.length) {
      console.log(where);
      const rows = where.map(row => `(${row.join(' OR ')})`);
      suffix = `WHERE ${rows.join(' AND ')}`;
    }
    queries[dataSource] = `SELECT * FROM ${DATA_SOURCES[dataSource]} ${suffix}`;
  });
  return queries;
};

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
    where.push(`submission_status = '${status}'`);
  }
  // TODO: verify if this work when we have enough data of many dates, maybe we need to change
  // some things 
  if (dateRange) {
    const [startDate, endDate] = dateRange.split('|');
    where.push(`submission_date BETWEEN '${startDate}' AND '${endDate}'`);
  }
  return {where, suffix};
}
