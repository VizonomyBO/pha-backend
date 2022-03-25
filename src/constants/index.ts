export const REQUIRED_VARIABLES = {
  GCLOUD_STORAGE_BUCKET: {type: 'string', default: null},
  MAX_FILE_SIZE_IN_BYTES: { type: 'number', default: 1024 * 1025 * 5 },
  CARTO_CLIENT_ID: { type: 'string', default: null },
  CARTO_CLIENT_SECRET: { type: 'string', default: null },
};