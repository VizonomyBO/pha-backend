import { Request } from 'express';
export interface MulterFile {
  key: string // Available using `S3`.
  path: string // Available using `DiskStorage`.
  mimetype: string
  originalname: string
  size: number,
  buffer: Buffer
};

export type RequestWithFile = Request & { file: MulterFile };
export type RequestWithFiles = Request & { files: MulterFile[] };

export interface QueryParams { 
  page: number,
  limit: number,
  search: string,
  status: string, 
  dateRange: string,
  isRetailer?: boolean,
  isUnvalidated?: boolean
};
export interface Credentials {
  username: string;
  password: string;
};

export default interface ResponseError extends Error {
  status?: number;
  code?: number;
  stack?: any;
};

export interface Propierties {
  key: string,
  value: string,
}

type DataSources = 'retailers_pha' | 'retailers_osm' | 'retailers_usda';

export type GoogleBbox = {xmin: number, ymin: number, xmax: number, ymax: number};
export interface FiltersInterface {
  categories: string[],
  accesibility: string[],
  dataSources: string[],
  badges: string[],
  verifiedDateRange?: string[],
  superstarDateRange?: string[],
  bbox?: GoogleBbox
  superstar_badge?: string,
  search?: string,
};
