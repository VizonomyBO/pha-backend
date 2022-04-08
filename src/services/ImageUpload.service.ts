import { Bucket, Storage } from '@google-cloud/storage';
import * as path from 'path';
import config from '../config';
import * as Multer from 'multer';
import { isImageMymeType } from '../utils';

class ImageUploadService {

  storage: Storage;
  bucket: Bucket;
  multer;

  constructor() {
    this.storage = new Storage({
      keyFilename: path.join(__dirname, '../config/service.account.json'),
      projectId: 'pha-vizonomy'
    });
    this.bucket = this.storage.bucket(config.gcloud.bucket);
    this.multer = Multer({
      storage: Multer.memoryStorage(),
      limits: {
        fileSize: + config.constants.maxFileSize,
      },
      fileFilter: (_: never, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
        if (!isImageMymeType(file.mimetype)) {
          return cb(new Error('Invalid file type'), false);
        }
        cb(null, true);
      }
    });
  }

  getBucket() {
    return this.bucket;
  }

  getPublicURL(filename: string): string {
    return `https://storage.googleapis.com/${this.bucket.name}/${filename}`;
  }

  getUploadSingle() {
    return this.multer.single('file');
  }

  getUploadMultiple() {
    return this.multer.array('files');
  }

}

export default new ImageUploadService();
