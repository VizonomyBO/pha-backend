export const REQUIRED_VARIABLES = {
  GCLOUD_STORAGE_BUCKET: {type: 'string', default: null},
  GCLOUD_API_KEY: {type: 'string', default: null},
  MAX_FILE_SIZE_IN_BYTES: { type: 'number', default: 1024 * 1025 * 5 },
  CARTO_CLIENT_ID: { type: 'string', default: null },
  CARTO_CLIENT_SECRET: { type: 'string', default: null },
};

export const DOMAIN = '@localhost.com'
export const CONNECTION_NAME = 'carto_dw';
export const PHA_RETAILER_TABLE = 'carto-dw-ac-j9wxt0nz.shared.pha_retailer';
export const RETAILERS_OSM = 'carto-dw-ac-j9wxt0nz.shared.2022_OpenStreetMap_Mississippi';
export const RETAILERS_USDA = 'carto-dw-ac-j9wxt0nz.shared.2022_USDA_Farmers_Market';
export const PHA_INDIVIDUAL = 'carto-dw-ac-j9wxt0nz.shared.pha_individual';
export const CARTO_AUTH_URL = 'https://auth.carto.com/oauth/token';
export const CARTO_API = 'https://gcp-us-east1.api.carto.com';
export const CARTO_API_VERSION = "v3"
export const IDENTITY_PLATFORM_API = 'https://identitytoolkit.googleapis.com';
export const IDENTITY_PLATFORM_VERSION = 'v1';
export const ERROR_CODE_DEFAULT = 500;
export const ERROR_CODE_UNAUTHORIZED = 401;
export const ERROR_CODE_BAD_REQUEST = 400;
export const ERROR_CODE_NOT_FOUND = 404;

export const RETAILERS_PHA = 'retailers_pha';
export const RETAILERS_OSM_SOURCE = 'retailers_osm';
export const RETAILERS_USDA_SOURCE = 'retailers_usda';
export const DATA_SOURCES = {
  'retailers_pha': PHA_RETAILER_TABLE,
  'retailers_osm': RETAILERS_OSM,
  'retailers_usda': RETAILERS_USDA
};

export const IMAGELINKS = 'imagelinks';
export const OWNER_PHOTO = 'owner_photo';
export const RETAILER = 'retailer';
export const INDIVIDUAL = 'individual';