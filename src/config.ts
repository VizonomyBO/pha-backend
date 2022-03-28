import 'dotenv/config';

export default {
  carto: {
    clientId: process.env.CARTO_CLIENT_ID || '',
    clientSecret: process.env.CARTO_CLIENT_SECRET || '',
  },
  gcloud: {
    bucket: process.env.GCLOUD_STORAGE_BUCKET || '',
  },
  constants: {
    maxFileSize: Number(process.env.MAX_FILE_SIZE_IN_BYTES) || 1024 * 1025 * 5,
  },
};
