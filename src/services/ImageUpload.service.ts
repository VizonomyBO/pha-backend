import { Bucket, Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config';
import * as Multer from 'multer';
import { isImageMymeType } from '../utils';
import * as configCloud from '../config/service.account.json';


class ImageUploadService {

  storage: Storage;
  bucket: Bucket;
  multer;

  constructor() {
    const filePath = path.join(__dirname, '../config/service.account.json');
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(configCloud));
    }
    this.storage = new Storage({
      keyFilename: filePath,
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
