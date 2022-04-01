import 'dotenv/config';

export default {
  carto: {
    clientId: process.env.CARTO_CLIENT_ID || '',
    clientSecret: process.env.CARTO_CLIENT_SECRET || '',
  },
  gcloud: {
    bucket: process.env.GCLOUD_STORAGE_BUCKET || '',
    apiKey: process.env.GCLOUD_API_KEY || '',
  },
  constants: {
    maxFileSize: Number(process.env.MAX_FILE_SIZE_IN_BYTES) || 1024 * 1025 * 5,
  },
};
